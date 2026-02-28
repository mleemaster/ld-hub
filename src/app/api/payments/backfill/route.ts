/*
 * One-time backfill endpoint that fetches all paid invoices from Stripe
 * and creates Payment records for historical revenue tracking.
 * Safe to run multiple times — upserts on stripeInvoiceId prevent duplicates.
 * Session-protected via middleware.
 */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Payment } from "@/models/Payment";

export async function POST() {
  try {
    await connectDB();

    const clients = await Client.find({ stripeCustomerId: { $exists: true, $ne: null } }).lean();
    const customerMap = new Map<string, { id: string; name: string }>();
    for (const c of clients) {
      if (c.stripeCustomerId) {
        customerMap.set(c.stripeCustomerId, {
          id: String(c._id),
          name: c.name,
        });
      }
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const skipReasons: { invoiceId: string; reason: string; customerId?: string; amount?: number }[] = [];

    for await (const invoice of stripe.invoices.list({ status: "paid", limit: 100 })) {
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!customerId) {
        skipped++;
        skipReasons.push({ invoiceId: invoice.id, reason: "no_customer_id" });
        continue;
      }

      const client = customerMap.get(customerId);
      if (!client) {
        skipped++;
        skipReasons.push({ invoiceId: invoice.id, reason: "no_matching_client", customerId });
        continue;
      }

      const amount = (invoice.amount_paid ?? 0) / 100;
      if (amount <= 0) {
        skipped++;
        skipReasons.push({ invoiceId: invoice.id, reason: "zero_amount", customerId, amount });
        continue;
      }

      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(invoice.created * 1000);

      try {
        const result = await Payment.updateOne(
          { stripeInvoiceId: invoice.id },
          {
            $setOnInsert: {
              clientId: client.id,
              clientName: client.name,
              amount,
              date: paidAt,
              stripeInvoiceId: invoice.id,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          created++;
        } else {
          skipped++;
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ created, skipped, errors, clientsFound: customerMap.size, skipReasons });
  } catch (err) {
    console.error("[Payments Backfill] Error:", err);
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 }
    );
  }
}
