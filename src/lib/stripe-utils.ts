/*
 * Stripe helper utilities. Server-only.
 * Maps Stripe Price IDs to plan tiers, extracts fees,
 * and converts subscription objects to Client field updates.
 */
import type Stripe from "stripe";
import type { PlanTier } from "@/lib/client-constants";

/* ── Price ID → Plan Tier mapping ─────────────────────────── */

interface PriceMapping {
  planTier: PlanTier | "ppc";
  type: "subscription" | "setup";
}

function buildPriceMap(): Map<string, PriceMapping> {
  const map = new Map<string, PriceMapping>();

  const entries: { env: string; planTier: PlanTier | "ppc"; type: "subscription" | "setup" }[] = [
    { env: "STRIPE_PRICE_LANDING_PAGE", planTier: "Landing Page", type: "subscription" },
    { env: "STRIPE_PRICE_LANDING_PAGE_SETUP", planTier: "Landing Page", type: "setup" },
    { env: "STRIPE_PRICE_MULTI_PAGE", planTier: "Multi-Page", type: "subscription" },
    { env: "STRIPE_PRICE_MULTI_PAGE_SETUP", planTier: "Multi-Page", type: "setup" },
    { env: "STRIPE_PRICE_ECOMMERCE", planTier: "eCommerce", type: "subscription" },
    { env: "STRIPE_PRICE_ECOMMERCE_SETUP", planTier: "eCommerce", type: "setup" },
    { env: "STRIPE_PRICE_PPC", planTier: "ppc", type: "subscription" },
  ];

  for (const { env, planTier, type } of entries) {
    const id = process.env[env];
    if (id) map.set(id, { planTier, type });
  }

  return map;
}

let _priceMap: Map<string, PriceMapping> | null = null;
function priceMap(): Map<string, PriceMapping> {
  if (!_priceMap) _priceMap = buildPriceMap();
  return _priceMap;
}

/** Look up a Stripe Price ID and return the plan tier (or "ppc" for PPC subscriptions). */
export function getPlanTierFromPriceId(priceId: string): PlanTier | "ppc" | null {
  return priceMap().get(priceId)?.planTier ?? null;
}

/** Reverse lookup: get the subscription Price ID for a given plan tier. */
export function getSubscriptionPriceId(planTier: PlanTier): string | null {
  for (const [id, mapping] of priceMap()) {
    if (mapping.planTier === planTier && mapping.type === "subscription") return id;
  }
  return null;
}

/** Get the setup fee Price ID for a given plan tier. */
export function getSetupPriceId(planTier: PlanTier): string | null {
  for (const [id, mapping] of priceMap()) {
    if (mapping.planTier === planTier && mapping.type === "setup") return id;
  }
  return null;
}

/** Check if a Stripe Price ID corresponds to a setup fee. */
export function isSetupPrice(priceId: string): boolean {
  return priceMap().get(priceId)?.type === "setup";
}

/* ── Fee extraction ───────────────────────────────────────── */

/** Extract the Stripe processing fee from a BalanceTransaction. */
export function extractStripeFee(bt: Stripe.BalanceTransaction): number {
  return bt.fee / 100;
}

/* ── Subscription → Client field mapping ──────────────────── */

interface PlanTierFields {
  kind: "planTier";
  planTier: PlanTier;
  monthlyRevenue: number;
  startDate: Date;
  nextBillingDate: Date;
}

interface PpcFields {
  kind: "ppc";
  ppcClient: true;
  ppcManagementFee: number;
}

export type SubscriptionFields = PlanTierFields | PpcFields;

/**
 * Apply subscription-level discounts to a base amount.
 * Expects expanded discount objects (not string IDs).
 */
export function applySubscriptionDiscounts(
  amount: number,
  discounts: Stripe.Discount[] | undefined
): number {
  for (const disc of discounts ?? []) {
    if (typeof disc === "string") continue;
    const coupon = disc.source?.coupon;
    if (!coupon || typeof coupon === "string") continue;
    if (coupon.percent_off) {
      amount = Math.round(amount * (1 - coupon.percent_off / 100) * 100) / 100;
    } else if (coupon.amount_off) {
      amount = Math.max(0, amount - coupon.amount_off / 100);
    }
  }
  return amount;
}

/**
 * Convert a Stripe Subscription into Client model field updates.
 * Returns different shapes for plan tier vs PPC subscriptions.
 * When discounts are expanded on the subscription, applies them to the price.
 */
export function mapSubscriptionToClientFields(
  sub: Stripe.Subscription
): SubscriptionFields | null {
  const item = sub.items.data[0];
  if (!item) return null;

  const priceId = item.price.id;
  const tier = getPlanTierFromPriceId(priceId);
  if (!tier) return null;

  const listPrice = (item.price.unit_amount ?? 0) / 100;
  const amount = applySubscriptionDiscounts(listPrice, sub.discounts as Stripe.Discount[] | undefined);

  if (tier === "ppc") {
    return {
      kind: "ppc",
      ppcClient: true,
      ppcManagementFee: amount,
    };
  }

  return {
    kind: "planTier",
    planTier: tier,
    monthlyRevenue: amount,
    startDate: new Date(sub.start_date * 1000),
    nextBillingDate: new Date(item.current_period_end * 1000),
  };
}
