/*
 * POST /api/expenses/sync-stripe-fees
 * Bulk-syncs Stripe processing fees for all clients with a stripeCustomerId.
 * For each paid invoice, checks if a fee expense already exists (via stripeInvoiceId)
 * and creates one if missing. Used to backfill fees for clients onboarded
 * before auto-tracking was deployed.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Client } from "@/models/Client";
import { Expense } from "@/models/Expense";
import { extractStripeFee } from "@/lib/stripe-utils";

export async function POST() {
  try {
    await connectDB();

    const clients = await Client.find({
      stripeCustomerId: { $exists: true, $ne: null },
    }).lean();

    let synced = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        const invoices = await stripe.invoices.list({
          customer: client.stripeCustomerId!,
          status: "paid",
          limit: 20,
        });

        for (const inv of invoices.data) {
          try {
            const existing = await Expense.findOne({ stripeInvoiceId: inv.id });
            if (existing) continue;

            const fullInvoice = await stripe.invoices.retrieve(inv.id, {
              expand: ["payments.data.payment.payment_intent"],
            });
            const payment = fullInvoice.payments?.data?.[0];
            const pi = payment?.payment?.payment_intent;
            const piId = typeof pi === "string" ? pi : pi?.id;
            if (!piId) continue;

            const piObj =
              typeof pi === "string"
                ? await stripe.paymentIntents.retrieve(pi, {
                    expand: ["latest_charge.balance_transaction"],
                  })
                : await stripe.paymentIntents.retrieve(piId, {
                    expand: ["latest_charge.balance_transaction"],
                  });

            const charge = piObj.latest_charge;
            if (!charge || typeof charge === "string") continue;

            const bt = charge.balance_transaction;
            if (!bt || typeof bt === "string") continue;

            const feeAmount = extractStripeFee(bt);
            if (feeAmount <= 0) continue;

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
            synced++;
          } catch (err) {
            console.error(`[Sync Stripe Fees] Invoice ${inv.id}:`, err);
            errors++;
          }
        }
      } catch (err) {
        console.error(`[Sync Stripe Fees] Client ${client.name}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ synced, errors });
  } catch (err) {
    console.error("[Sync Stripe Fees] Failed:", err);
    return NextResponse.json(
      { error: "Failed to sync Stripe fees" },
      { status: 500 }
    );
  }
}
