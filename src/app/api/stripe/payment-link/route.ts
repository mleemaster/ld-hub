/*
 * Generate a Stripe Payment Link for a lead.
 * Accepts a plan tier and lead email, returns the payment link URL.
 * The link includes setup fee + subscription line items where applicable.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSubscriptionPriceId, getSetupPriceId } from "@/lib/stripe-utils";
import type { PlanTier } from "@/lib/client-constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planTier, email, leadId } = body as {
      planTier: string;
      email?: string;
      leadId?: string;
    };

    if (!planTier) {
      return NextResponse.json({ error: "planTier is required" }, { status: 400 });
    }

    const subPriceId = getSubscriptionPriceId(planTier as PlanTier);
    if (!subPriceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan: ${planTier}` },
        { status: 400 }
      );
    }

    const lineItems: { price: string; quantity: number }[] = [
      { price: subPriceId, quantity: 1 },
    ];

    const setupPriceId = getSetupPriceId(planTier as PlanTier);
    if (setupPriceId) {
      lineItems.push({ price: setupPriceId, quantity: 1 });
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata: {
        ...(leadId && { leadId }),
        planTier,
      },
      ...(email && {
        custom_fields: [],
        after_completion: {
          type: "redirect" as const,
          redirect: { url: process.env.NEXT_PUBLIC_APP_URL || "https://leemaster.design" },
        },
      }),
    });

    return NextResponse.json({ url: paymentLink.url });
  } catch (err) {
    console.error("[Payment Link] Failed to create:", err);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}
