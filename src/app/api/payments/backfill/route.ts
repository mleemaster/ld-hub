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

    const clients = await Client.find({}).lean();
    const customerMap = new Map<string, { id: string; name: string }>();
    const emailMap = new Map<string, { id: string; name: string; mongoDoc: typeof clients[0] }>();
    for (const c of clients) {
      const entry = { id: String(c._id), name: c.name };
      if (c.stripeCustomerId) {
        customerMap.set(c.stripeCustomerId, entry);
      }
      if (c.email) {
        emailMap.set(c.email.toLowerCase(), { ...entry, mongoDoc: c });
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

      let client = customerMap.get(customerId);

      // Fallback: match by customer email if no stripeCustomerId link exists
      if (!client) {
        const customerEmail = invoice.customer_email?.toLowerCase();
        if (customerEmail) {
          const emailMatch = emailMap.get(customerEmail);
          if (emailMatch) {
            client = { id: emailMatch.id, name: emailMatch.name };
            // Link this Stripe customer to the client for future webhook matches
            await Client.updateOne(
              { _id: emailMatch.id, stripeCustomerId: null },
              { $set: { stripeCustomerId: customerId } }
            );
            customerMap.set(customerId, client);
          }
        }
      }

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
