/*
 * API routes for lead collection operations.
 * GET: List leads with optional status/source/industry filters.
 * POST: Create a new lead record (with duplicate detection) and log activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client } from "@/models/Client";
import { Activity } from "@/models/Activity";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const industry = searchParams.get("industry");

    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (industry) filter.industry = industry;

    const leads = await Lead.find(filter).sort({ lastContactedDate: -1 });
    return NextResponse.json(leads);
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 });
    }

    const result = await Lead.deleteMany({ _id: { $in: ids } });

    try {
      await Activity.create({
        type: "lead_status_changed",
        description: `Deleted ${result.deletedCount} lead${result.deletedCount !== 1 ? "s" : ""}`,
      });
    } catch {
      // Activity logging should never block deletion
    }

    return NextResponse.json({ deleted: result.deletedCount });
  } catch {
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const { ids, update } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 });
    }
    if (!update || typeof update !== "object" || Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    const allowed = ["status", "lastContactedDate", "source", "industry", "isHot", "outreachTemplateId", "outreachTemplateName"];
    const safeUpdate: Record<string, string> = {};
    for (const key of allowed) {
      if (update[key] !== undefined) safeUpdate[key] = update[key];
    }

    const result = await Lead.updateMany({ _id: { $in: ids } }, safeUpdate);

    try {
      const fields = Object.entries(safeUpdate)
        .map(([k, v]) => `${k} → ${v}`)
        .join(", ");
      await Activity.create({
        type: "lead_status_changed",
        description: `Bulk updated ${result.modifiedCount} lead${result.modifiedCount !== 1 ? "s" : ""}: ${fields}`,
      });
    } catch {
      // Activity logging should never block updates
    }

    return NextResponse.json({ updated: result.modifiedCount });
  } catch {
    return NextResponse.json({ error: "Failed to bulk update leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (body.email) {
      const emailRegex = new RegExp(`^${body.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const [existingLead, existingClient] = await Promise.all([
        Lead.findOne({ email: { $regex: emailRegex } }),
        Client.findOne({ email: { $regex: emailRegex } }),
      ]);
      if (existingLead) {
        return NextResponse.json(
          { error: `A lead with this email already exists (${existingLead.name})` },
          { status: 409 }
        );
      }
      if (existingClient) {
        return NextResponse.json(
          { error: `A client with this email already exists (${existingClient.name})` },
          { status: 409 }
        );
      }
    }

    if (body.phone) {
      const normalized = normalizePhone(body.phone);
      if (normalized.length >= 7) {
        const phoneRegex = new RegExp(normalized.split("").join("\\D*"));
        const [existingLead, existingClient] = await Promise.all([
          Lead.findOne({ phone: { $regex: phoneRegex } }),
          Client.findOne({ phone: { $regex: phoneRegex } }),
        ]);
        if (existingLead) {
          return NextResponse.json(
            { error: `A lead with this phone number already exists (${existingLead.name})` },
            { status: 409 }
          );
        }
        if (existingClient) {
          return NextResponse.json(
            { error: `A client with this phone number already exists (${existingClient.name})` },
            { status: 409 }
          );
        }
      }
    }

    const lead = await Lead.create(body);

    try {
      await Activity.create({
        type: "lead_created",
        description: `New lead added: ${lead.name}`,
        relatedEntityType: "lead",
        relatedEntityId: lead._id,
      });
    } catch {
      // Activity logging should never block lead creation
    }

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
