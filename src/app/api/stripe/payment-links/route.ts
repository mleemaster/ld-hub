/*
 * List and deactivate Stripe payment links.
 * GET  — returns active + inactive payment links (most recent first)
 * PATCH — deactivates a payment link by ID
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const links = await stripe.paymentLinks.list({ limit: 50 });

    const items = links.data.map((link) => ({
      id: link.id,
      url: link.url,
      active: link.active,
      planTier: link.metadata?.planTier || null,
      leadId: link.metadata?.leadId || null,
      leadName: link.metadata?.leadName || null,
    }));

    return NextResponse.json(items);
  } catch (err) {
    console.error("[Payment Links] List failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch payment links" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await stripe.paymentLinks.update(id, { active: false });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Payment Links] Deactivate failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to deactivate payment link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
