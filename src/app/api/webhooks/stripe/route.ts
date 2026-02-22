/*
 * Stripe webhook handler.
 * Verifies signature, then routes events to handler functions that
 * update Client, Lead, Activity, and Expense records in MongoDB.
 *
 * Events handled:
 *   checkout.session.completed  → create Client from Lead
 *   customer.subscription.created → populate billing fields
 *   invoice.paid → update nextBillingDate, auto-track Stripe fee
 *   customer.subscription.deleted → mark client as canceled
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Lead } from "@/models/Lead";
import { Activity } from "@/models/Activity";
import { Expense } from "@/models/Expense";
import {
  getPlanTierFromPriceId,
  isSetupPrice,
  extractStripeFee,
  mapSubscriptionToClientFields,
} from "@/lib/stripe-utils";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  await connectDB();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ── Event handlers ───────────────────────────────────────── */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    console.warn("[Stripe Webhook] checkout.session.completed: no customer ID");
    return;
  }

  // Retrieve full session with line items
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"],
  });

  // Determine plan tier and PPC from line items
  let planTier: string = "Landing Page";
  let ppcClient = false;
  let ppcManagementFee: number | undefined;
  let monthlyRevenue: number | undefined;
  let setupFeeAmount: number | undefined;

  for (const item of fullSession.line_items?.data ?? []) {
    const priceId = item.price?.id;
    if (!priceId) continue;

    if (isSetupPrice(priceId)) {
      setupFeeAmount = (item.price?.unit_amount ?? 0) / 100;
      continue;
    }

    const tier = getPlanTierFromPriceId(priceId);
    if (tier === "ppc") {
      ppcClient = true;
      ppcManagementFee = (item.price?.unit_amount ?? 0) / 100;
    } else if (tier) {
      planTier = tier;
      if (item.price?.recurring) {
        monthlyRevenue = (item.price?.unit_amount ?? 0) / 100;
      }
    }
  }

  // 1. If a client already has this stripeCustomerId, skip (already linked)
  const existingByStripe = await Client.findOne({ stripeCustomerId: customerId });
  if (existingByStripe) {
    console.log(`[Stripe Webhook] Client already exists for customer ${customerId}`);
    return;
  }

  // Look up lead by email to pull in name/business info
  const lead = customerEmail
    ? await Lead.findOne({ email: customerEmail })
    : null;

  // 2. If a client exists with the same email but no Stripe ID, link Stripe data to it
  const existingByEmail = customerEmail
    ? await Client.findOne({ email: customerEmail, stripeCustomerId: { $exists: false } })
      ?? await Client.findOne({ email: customerEmail, stripeCustomerId: null })
    : null;

  if (existingByEmail) {
    existingByEmail.stripeCustomerId = customerId;
    existingByEmail.planTier = planTier as typeof existingByEmail.planTier;
    existingByEmail.monthlyRevenue = monthlyRevenue;
    existingByEmail.ppcClient = ppcClient;
    existingByEmail.ppcManagementFee = ppcManagementFee;
    existingByEmail.setupFeeAmount = setupFeeAmount;
    existingByEmail.startDate = new Date();
    if (!existingByEmail.intakeForm && lead?.intakeForm) {
      existingByEmail.intakeForm = lead.intakeForm;
    }
    await existingByEmail.save();

    console.log(`[Stripe Webhook] Linked Stripe customer ${customerId} to existing client ${existingByEmail.name}`);

    try {
      await Activity.create({
        type: "client_updated",
        description: `Stripe data linked to existing client: ${existingByEmail.name}`,
        relatedEntityType: "client",
        relatedEntityId: existingByEmail._id,
      });
    } catch {
      // Activity logging should never block
    }

    if (lead) {
      await Lead.findByIdAndDelete(lead._id);
    }

    return;
  }

  // 3. No match — create a new client
  const clientData: Record<string, unknown> = {
    name: lead?.name || session.customer_details?.name || "New Client",
    businessName: lead?.businessName || session.customer_details?.name || "Unknown",
    email: customerEmail || undefined,
    phone: lead?.phone || session.customer_details?.phone || undefined,
    industry: lead?.industry || undefined,
    planTier,
    ppcClient,
    ppcManagementFee,
    monthlyRevenue,
    setupFeeAmount,
    stripeCustomerId: customerId,
    projectStatus: "Awaiting Design",
    startDate: new Date(),
    leadId: lead?._id || undefined,
    intakeForm: lead?.intakeForm || undefined,
  };

  const client = await Client.create(clientData);

  try {
    await Activity.create({
      type: "client_created",
      description: `New client from Stripe: ${client.name}`,
      relatedEntityType: "client",
      relatedEntityId: client._id,
    });
  } catch {
    // Activity logging should never block
  }

  // Remove the lead now that they're a client
  if (lead) {
    await Lead.findByIdAndDelete(lead._id);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const client = await Client.findOne({ stripeCustomerId: customerId });
  if (!client) {
    console.warn(
      `[Stripe Webhook] subscription.created: no client for customer ${customerId}`
    );
    return;
  }

  const fields = mapSubscriptionToClientFields(subscription);
  if (!fields) return;

  if (fields.kind === "planTier") {
    client.planTier = fields.planTier;
    client.monthlyRevenue = fields.monthlyRevenue;
    client.startDate = fields.startDate;
    client.nextBillingDate = fields.nextBillingDate;
  } else {
    client.ppcClient = true;
    client.ppcManagementFee = fields.ppcManagementFee;
  }

  await client.save();

  try {
    const label =
      fields.kind === "planTier"
        ? `${fields.planTier} subscription`
        : "PPC subscription";
    await Activity.create({
      type: "payment_received",
      description: `${label} activated for ${client.name}`,
      relatedEntityType: "client",
      relatedEntityId: client._id,
    });
  } catch {
    // Activity logging should never block
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const client = await Client.findOne({ stripeCustomerId: customerId });
  if (!client) {
    console.warn(
      `[Stripe Webhook] invoice.paid: no client for customer ${customerId}`
    );
    return;
  }

  // Update next billing date from the invoice period
  const lineItem = invoice.lines?.data?.[0];
  if (lineItem?.period?.end) {
    client.nextBillingDate = new Date(lineItem.period.end * 1000);
    await client.save();
  }

  try {
    const amount = (invoice.amount_paid ?? 0) / 100;
    await Activity.create({
      type: "payment_received",
      description: `Payment of $${amount.toFixed(2)} received for ${client.name}`,
      relatedEntityType: "client",
      relatedEntityId: client._id,
    });
  } catch {
    // Activity logging should never block
  }

  // Auto-track Stripe processing fee as an expense.
  // Retrieve the invoice with expanded payments to get the payment intent → charge → balance_transaction.
  try {
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ["payments.data.payment.payment_intent"],
    });

    const payment = fullInvoice.payments?.data?.[0];
    const pi = payment?.payment?.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id;

    if (piId) {
      const piObj = typeof pi === "string"
        ? await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge.balance_transaction"] })
        : await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });

      const charge = piObj.latest_charge;
      if (charge && typeof charge !== "string") {
        const bt = charge.balance_transaction;
        if (bt && typeof bt !== "string") {
          const feeAmount = extractStripeFee(bt);
          if (feeAmount > 0) {
            await Expense.create({
              name: `Stripe fee — Invoice ${invoice.id}`,
              amount: feeAmount,
              type: "one-time",
              category: "Stripe Fees",
              date: new Date(),
              autoTracked: true,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Failed to track Stripe fee:", err);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const client = await Client.findOne({ stripeCustomerId: customerId });
  if (!client) {
    console.warn(
      `[Stripe Webhook] subscription.deleted: no client for customer ${customerId}`
    );
    return;
  }

  // Check which subscription was deleted (plan or PPC)
  const item = subscription.items.data[0];
  const tier = item ? getPlanTierFromPriceId(item.price.id) : null;

  if (tier === "ppc") {
    client.ppcClient = false;
    client.ppcManagementFee = undefined;
    await client.save();

    try {
      await Activity.create({
        type: "client_status_changed",
        description: `PPC subscription canceled for ${client.name}`,
        relatedEntityType: "client",
        relatedEntityId: client._id,
      });
    } catch {
      // Activity logging should never block
    }
  } else {
    client.projectStatus = "Deployed Canceled";
    client.canceledAt = new Date();
    await client.save();

    try {
      await Activity.create({
        type: "client_status_changed",
        description: `Subscription canceled — ${client.name} set to Deployed Canceled`,
        relatedEntityType: "client",
        relatedEntityId: client._id,
      });
    } catch {
      // Activity logging should never block
    }
  }
}
