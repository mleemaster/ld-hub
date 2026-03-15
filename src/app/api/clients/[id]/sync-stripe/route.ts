/*
 * POST /api/clients/[id]/sync-stripe
 * Re-syncs a client's data from Stripe: subscription fields (nextBillingDate,
 * monthlyRevenue, planTier), the discounted setup fee from the checkout session,
 * and backfills any missing Payment + Expense records from paid invoices.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Client } from "@/models/Client";
import { Payment } from "@/models/Payment";
import { Expense } from "@/models/Expense";
import { Activity } from "@/models/Activity";
import {
  getPlanTierFromPriceId,
  isSetupPrice,
  extractStripeFee,
} from "@/lib/stripe-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!client.stripeCustomerId) {
      return NextResponse.json(
        { error: "Client has no Stripe customer ID" },
        { status: 400 }
      );
    }

    const customerId = client.stripeCustomerId;
    const changes: string[] = [];

    // 1. Sync subscription data (nextBillingDate, monthlyRevenue, planTier)
    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 5,
      });

      for (const sub of subs.data) {
        const item = sub.items.data[0];
        if (!item) continue;

        const tier = getPlanTierFromPriceId(item.price.id);
        if (!tier) continue;

        if (tier === "ppc") {
          const fee = (item.price.unit_amount ?? 0) / 100;
          if (client.ppcManagementFee !== fee) {
            client.ppcClient = true;
            client.ppcManagementFee = fee;
            changes.push(`PPC fee → $${fee}`);
          }
        } else {
          const revenue = (item.price.unit_amount ?? 0) / 100;
          const nextBilling = new Date(item.current_period_end * 1000);

          if (client.planTier !== tier) {
            client.planTier = tier;
            changes.push(`Plan → ${tier}`);
          }
          if (client.monthlyRevenue !== revenue) {
            client.monthlyRevenue = revenue;
            changes.push(`Revenue → $${revenue}`);
          }
          client.nextBillingDate = nextBilling;
          changes.push(`Next billing → ${nextBilling.toLocaleDateString()}`);
        }
      }
    } catch (err) {
      console.error("[Sync Stripe] Subscription sync failed:", err);
    }

    // 2. Sync setup fee from the original checkout session
    try {
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
        expand: ["data.line_items.data.price"],
      });

      for (const session of sessions.data) {
        for (const item of session.line_items?.data ?? []) {
          const priceId = item.price?.id;
          if (priceId && isSetupPrice(priceId)) {
            const discountedSetup = (item.amount_total ?? 0) / 100;
            if (client.setupFeeAmount !== discountedSetup) {
              changes.push(
                `Setup fee → $${discountedSetup} (was $${client.setupFeeAmount ?? 0})`
              );
              client.setupFeeAmount = discountedSetup;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Sync Stripe] Checkout session sync failed:", err);
    }

    // 3. Backfill payments from paid invoices
    let paymentsAdded = 0;
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 20,
      });

      for (const inv of invoices.data) {
        const amount = (inv.amount_paid ?? 0) / 100;
        try {
          const result = await Payment.updateOne(
            { stripeInvoiceId: inv.id },
            {
              $setOnInsert: {
                clientId: client._id,
                clientName: client.name,
                amount,
                date: inv.status_transitions?.paid_at
                  ? new Date(inv.status_transitions.paid_at * 1000)
                  : new Date(),
                stripeInvoiceId: inv.id,
              },
            },
            { upsert: true }
          );
          if (result.upsertedCount > 0) paymentsAdded++;
        } catch (err) {
          console.error(`[Sync Stripe] Payment upsert ${inv.id}:`, err);
        }

        // Track Stripe fee
        try {
          const fullInvoice = await stripe.invoices.retrieve(inv.id, {
            expand: ["payments.data.payment.payment_intent"],
          });
          const payment = fullInvoice.payments?.data?.[0];
          const pi = payment?.payment?.payment_intent;
          const piId = typeof pi === "string" ? pi : pi?.id;

          if (piId) {
            const piObj =
              typeof pi === "string"
                ? await stripe.paymentIntents.retrieve(pi, {
                    expand: ["latest_charge.balance_transaction"],
                  })
                : await stripe.paymentIntents.retrieve(piId, {
                    expand: ["latest_charge.balance_transaction"],
                  });

            const charge = piObj.latest_charge;
            if (charge && typeof charge !== "string") {
              const bt = charge.balance_transaction;
              if (bt && typeof bt !== "string") {
                const feeAmount = extractStripeFee(bt);
                if (feeAmount > 0) {
                  const existing = await Expense.findOne({ stripeInvoiceId: inv.id });
                  if (!existing) {
                    await Expense.create({
                      name: `Stripe Fee - ${client.name}`,
                      amount: feeAmount,
                      type: "one-time",
                      category: "Stripe Fees",
                      date: inv.status_transitions?.paid_at
                        ? new Date(inv.status_transitions.paid_at * 1000)
                        : new Date(),
                      autoTracked: true,
                      stripeInvoiceId: inv.id,
                      clientId: client._id,
                      clientName: client.name,
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error(`[Sync Stripe] Fee tracking ${inv.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[Sync Stripe] Invoice backfill failed:", err);
    }

    if (paymentsAdded > 0) {
      changes.push(`${paymentsAdded} payment${paymentsAdded !== 1 ? "s" : ""} backfilled`);
    }

    await client.save();

    if (changes.length > 0) {
      try {
        await Activity.create({
          type: "client_updated",
          description: `Synced from Stripe: ${changes.join(", ")}`,
          relatedEntityType: "client",
          relatedEntityId: client._id,
        });
      } catch {
        // Activity logging should never block
      }
    }

    return NextResponse.json(client);
  } catch (err) {
    console.error("[Sync Stripe] Failed:", err);
    return NextResponse.json(
      { error: "Failed to sync from Stripe" },
      { status: 500 }
    );
  }
}
