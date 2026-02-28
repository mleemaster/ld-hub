/*
 * Payment model for tracking actual Stripe payments.
 * Each record corresponds to a paid Stripe invoice.
 * Used by the Finances section for real revenue calculation.
 * stripeInvoiceId has a unique index to prevent duplicate records from webhook retries.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPayment extends Document {
  clientId: mongoose.Types.ObjectId;
  clientName: string;
  amount: number;
  date: Date;
  stripeInvoiceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    clientName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    stripeInvoiceId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
