/*
 * OrphanIntake model for Tally submissions that couldn't be matched
 * to an existing Client or Lead. Stored for manual review and
 * later matching once the client/lead record exists.
 */
import mongoose, { Schema, type Document, type Model } from "mongoose";
import { IntakeFormSchema, type IIntakeForm } from "@/models/IntakeFormSchema";

export interface IOrphanIntake extends Document {
  email?: string;
  phone?: string;
  intakeForm: IIntakeForm;
  tallySubmissionId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrphanIntakeSchema = new Schema<IOrphanIntake>(
  {
    email: String,
    phone: String,
    intakeForm: { type: IntakeFormSchema, required: true },
    tallySubmissionId: { type: String, required: true },
  },
  { timestamps: true }
);

export const OrphanIntake: Model<IOrphanIntake> =
  mongoose.models.OrphanIntake ||
  mongoose.model<IOrphanIntake>("OrphanIntake", OrphanIntakeSchema);
