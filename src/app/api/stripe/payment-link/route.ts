/*
 * Generate a Stripe Payment Link for a lead.
 * Accepts a plan tier, lead email, and optional discount config.
 * The link includes setup fee + subscription line items where applicable.
 * When a discount is specified, a single-use Stripe coupon is created
 * and attached to the payment link via the `discounts` parameter.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSubscriptionPriceId, getSetupPriceId } from "@/lib/stripe-utils";
import type { PlanTier } from "@/lib/client-constants";

interface DiscountInput {
  type: "percent" | "fixed";
  value: number;
  appliesTo: "setup" | "subscription" | "both";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planTier, email, leadId, discount } = body as {
      planTier: string;
      email?: string;
      leadId?: string;
      discount?: DiscountInput;
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

    let discounts: { coupon: string }[] | undefined;

    if (discount && discount.value > 0) {
      const targetPriceIds: string[] = [];
      if (discount.appliesTo === "setup" && setupPriceId) targetPriceIds.push(setupPriceId);
      else if (discount.appliesTo === "subscription") targetPriceIds.push(subPriceId);

      const productIds: string[] = [];
      if (targetPriceIds.length > 0) {
        for (const priceId of targetPriceIds) {
          const price = await stripe.prices.retrieve(priceId);
          if (typeof price.product === "string") {
            productIds.push(price.product);
          }
        }
      }

      const couponParams: Record<string, unknown> = {
        max_redemptions: 1,
        name: `${planTier} – ${discount.value}${discount.type === "percent" ? "%" : "$"} off ${discount.appliesTo}`,
      };

      if (discount.type === "percent") {
        couponParams.percent_off = discount.value;
      } else {
        couponParams.amount_off = Math.round(discount.value * 100);
        couponParams.currency = "usd";
      }

      if (productIds.length > 0) {
        couponParams.applies_to = { products: productIds };
      }

      const coupon = await stripe.coupons.create(couponParams);
      discounts = [{ coupon: coupon.id }];
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata: {
        ...(leadId && { leadId }),
        planTier,
      },
      ...(discounts && { discounts }),
      ...(email && {
        custom_fields: [],
        after_completion: {
          type: "redirect" as const,
          redirect: { url: "https://leemasterdesign.com/checkout/success" },
        },
      }),
    });

    return NextResponse.json({ url: paymentLink.url });
  } catch (err) {
    console.error("[Payment Link] Failed to create:", err);
    const message = err instanceof Error ? err.message : "Failed to create payment link";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
