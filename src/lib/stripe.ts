/*
 * Stripe SDK singleton.
 * Server-only — do not import from client components.
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});
