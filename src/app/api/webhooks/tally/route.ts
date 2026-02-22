/*
 * Tally webhook handler.
 * Receives intake form submissions, extracts fields by label matching,
 * then matches to an existing Client or Lead by email/phone.
 * If no match is found, saves to OrphanIntake for manual review.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Lead } from "@/models/Lead";
import { Activity } from "@/models/Activity";
import { OrphanIntake } from "@/models/OrphanIntake";
import type { IIntakeForm } from "@/models/IntakeFormSchema";

interface TallyOption {
  id: string;
  text: string;
}

interface TallyFileUpload {
  url: string;
  name?: string;
}

interface TallyField {
  key: string;
  label: string;
  type: string;
  value: string | string[] | TallyFileUpload[] | null;
  options?: TallyOption[];
}

interface TallyPayload {
  eventType: string;
  data: {
    responseId?: string;
    fields: TallyField[];
  };
}

type IntakeFormKey = keyof IIntakeForm;

const LABEL_MAP: [string, IntakeFormKey][] = [
  ["business name", "businessName"],
  ["primary contact name", "primaryContactName"],
  ["email", "email"],
  ["mobile phone", "phone"],
  ["business address", "address"],
  ["brief description", "businessDescription"],
  ["products or services", "servicesOffered"],
  ["which plan", "planChosen"],
  ["tagline", "tagline"],
  ["areas do you serve", "serviceArea"],
  ["domain option", "domainPreference"],
  ["domain backup backup", "domainBackup2"],
  ["domain backup", "domainBackup1"],
  ["upload your logo", "logoUrl"],
  ["branded content", "brandedContentUrls"],
  ["linked sites", "socialLinks"],
  ["examples of websites", "websiteExamples"],
  ["style requests", "styleRequests"],
];

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const computed = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function extractFieldValue(field: TallyField): string {
  if (field.value == null) return "";

  if (field.type === "DROPDOWN" && field.options && Array.isArray(field.value)) {
    const selectedIds = field.value as string[];
    const matched = field.options.find((o) => selectedIds.includes(o.id));
    return matched?.text ?? "";
  }

  if (typeof field.value === "string") return field.value;
  return "";
}

function extractFileUrls(field: TallyField): string[] {
  if (!Array.isArray(field.value)) return [];
  return (field.value as TallyFileUpload[])
    .filter((f) => f && typeof f === "object" && f.url)
    .map((f) => f.url);
}

function extractIntakeForm(fields: TallyField[]): IIntakeForm {
  const form: Record<string, string | string[]> = {};

  for (const field of fields) {
    const labelLower = field.label.toLowerCase();

    for (const [substring, formKey] of LABEL_MAP) {
      if (!labelLower.includes(substring)) continue;

      if (formKey === "logoUrl") {
        const urls = extractFileUrls(field);
        if (urls.length > 0) form[formKey] = urls[0];
      } else if (formKey === "brandedContentUrls") {
        const urls = extractFileUrls(field);
        if (urls.length > 0) form[formKey] = urls;
      } else {
        const val = extractFieldValue(field);
        if (val) form[formKey] = val;
      }
      break;
    }
  }

  return form as unknown as IIntakeForm;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.TALLY_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("tally-signature");
    if (!verifySignature(rawBody, signature, secret)) {
      console.error("[Tally Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: TallyPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.eventType !== "FORM_RESPONSE") {
    console.log(`[Tally Webhook] Ignoring event type: ${payload.eventType}`);
    return NextResponse.json({ received: true });
  }

  const fields = payload.data?.fields;
  if (!fields || !Array.isArray(fields)) {
    console.warn("[Tally Webhook] No fields in payload");
    return NextResponse.json({ received: true });
  }

  const intakeForm = extractIntakeForm(fields);
  const email = intakeForm.email;
  const phone = intakeForm.phone;
  const submissionId = payload.data.responseId || `tally_${Date.now()}`;

  console.log(`[Tally Webhook] Processing submission ${submissionId} — email: ${email}, phone: ${phone}`);

  await connectDB();

  // Try matching to Client first, then Lead
  let matched = false;

  // Match by email
  if (email) {
    const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const client = await Client.findOne({ email: { $regex: emailRegex } });
    if (client) {
      client.intakeForm = intakeForm;
      if (intakeForm.businessName) client.businessName = intakeForm.businessName;
      if (phone) client.phone = phone;
      await client.save();
      matched = true;
      console.log(`[Tally Webhook] Matched to client by email: ${client.name}`);
      try {
        await Activity.create({
          type: "client_updated",
          description: `Intake form received for ${client.name}`,
          relatedEntityType: "client",
          relatedEntityId: client._id,
        });
      } catch { /* Activity logging should never block */ }
    }
  }

  // Match client by phone
  if (!matched && phone) {
    const digits = normalizePhone(phone);
    if (digits.length >= 7) {
      const phoneRegex = new RegExp(digits.split("").join("\\D*"));
      const client = await Client.findOne({ phone: { $regex: phoneRegex } });
      if (client) {
        client.intakeForm = intakeForm;
        if (intakeForm.businessName) client.businessName = intakeForm.businessName;
        if (email) client.email = email;
        await client.save();
        matched = true;
        console.log(`[Tally Webhook] Matched to client by phone: ${client.name}`);
        try {
          await Activity.create({
            type: "client_updated",
            description: `Intake form received for ${client.name}`,
            relatedEntityType: "client",
            relatedEntityId: client._id,
          });
        } catch { /* Activity logging should never block */ }
      }
    }
  }

  // Match lead by email
  if (!matched && email) {
    const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const lead = await Lead.findOne({ email: { $regex: emailRegex } });
    if (lead) {
      lead.intakeForm = intakeForm;
      if (intakeForm.businessName) lead.businessName = intakeForm.businessName;
      if (phone) lead.phone = phone;
      await lead.save();
      matched = true;
      console.log(`[Tally Webhook] Matched to lead by email: ${lead.name}`);
      try {
        await Activity.create({
          type: "lead_status_changed",
          description: `Intake form received for lead ${lead.name}`,
          relatedEntityType: "lead",
          relatedEntityId: lead._id,
        });
      } catch { /* Activity logging should never block */ }
    }
  }

  // Match lead by phone
  if (!matched && phone) {
    const digits = normalizePhone(phone);
    if (digits.length >= 7) {
      const phoneRegex = new RegExp(digits.split("").join("\\D*"));
      const lead = await Lead.findOne({ phone: { $regex: phoneRegex } });
      if (lead) {
        lead.intakeForm = intakeForm;
        if (intakeForm.businessName) lead.businessName = intakeForm.businessName;
        if (email) lead.email = email;
        await lead.save();
        matched = true;
        console.log(`[Tally Webhook] Matched to lead by phone: ${lead.name}`);
        try {
          await Activity.create({
            type: "lead_status_changed",
            description: `Intake form received for lead ${lead.name}`,
            relatedEntityType: "lead",
            relatedEntityId: lead._id,
          });
        } catch { /* Activity logging should never block */ }
      }
    }
  }

  // No match — save as orphan
  if (!matched) {
    console.warn(`[Tally Webhook] No match found for submission ${submissionId}. Saving as orphan.`);
    try {
      await OrphanIntake.create({
        email: email || undefined,
        phone: phone || undefined,
        intakeForm,
        tallySubmissionId: submissionId,
      });
    } catch (err) {
      console.error("[Tally Webhook] Failed to save orphan intake:", err);
    }
  }

  return NextResponse.json({ received: true });
}
