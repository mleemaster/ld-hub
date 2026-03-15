/*
 * List and delete Stripe coupons.
 * GET    — returns all coupons with their associated promotion codes
 * DELETE — deletes a coupon by ID (its promo codes become unusable)
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const coupons = await stripe.coupons.list({ limit: 50 });

    const items = await Promise.all(
      coupons.data.map(async (coupon) => {
        const promoCodes = await stripe.promotionCodes.list({
          coupon: coupon.id,
          limit: 5,
        });

        return {
          id: coupon.id,
          name: coupon.name,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
          currency: coupon.currency,
          maxRedemptions: coupon.max_redemptions,
          timesRedeemed: coupon.times_redeemed,
          valid: coupon.valid,
          created: coupon.created,
          promoCodes: promoCodes.data.map((p) => ({
            id: p.id,
            code: p.code,
            active: p.active,
            timesRedeemed: p.times_redeemed,
          })),
        };
      })
    );

    return NextResponse.json(items);
  } catch (err) {
    console.error("[Coupons] List failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await stripe.coupons.del(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Coupons] Delete failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete coupon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
