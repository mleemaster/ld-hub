/*
 * Message Template model for OpenClaw outreach scripts.
 * Supports template variables like {name}, {business_name}
 * that get interpolated at send time. Editable in the hub UI.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";

export const TEMPLATE_TYPES = [
  "initial_contact",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "custom",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export interface IMessageTemplate extends Document {
  name: string;
  type: TemplateType;
  content: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema = new Schema<IMessageTemplate>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: TEMPLATE_TYPES, required: true },
    content: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MessageTemplate: Model<IMessageTemplate> =
  mongoose.models.MessageTemplate ||
  mongoose.model<IMessageTemplate>("MessageTemplate", MessageTemplateSchema);
