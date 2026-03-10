/*
 * OpenClaw agent individual lead routes (API-key authenticated via middleware).
 * GET: Fetch a single lead by ID.
 * PUT: Update a lead with activity logging for status and contact-date changes.
 * Mirrors the logic in /api/leads/[id] but accessible to the agent without a browser session.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Activity } from "@/models/Activity";
import { OpenClawActivity } from "@/models/OpenClawActivity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const existing = await Lead.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const lead = await Lead.findByIdAndUpdate(id, body, { new: true });

    try {
      const isFirstContact = body.status && existing.status === "New" && body.status !== "New";

      if (body.status && body.status !== existing.status) {
        await Activity.create({
          type: "lead_status_changed",
          description: `${existing.name}: ${existing.status} → ${body.status}`,
          relatedEntityType: "lead",
          relatedEntityId: existing._id,
        });
      }

      const existingContactDate = existing.lastContactedDate
        ? existing.lastContactedDate.toISOString().split("T")[0]
        : null;
      const newContactDate = body.lastContactedDate
        ? String(body.lastContactedDate).split("T")[0]
        : null;

      if (newContactDate && newContactDate !== existingContactDate) {
        const activityType = isFirstContact ? "lead_contacted" : "follow_up_sent";
        await Activity.create({
          type: "lead_contacted",
          description: `Contacted ${existing.name}`,
          relatedEntityType: "lead",
          relatedEntityId: existing._id,
        });
        await OpenClawActivity.create({
          type: activityType,
          details: `${isFirstContact ? "Contacted" : "Followed up with"} ${existing.name}`,
          relatedLeadId: existing._id,
        });
      }
    } catch {
      // Activity logging should never block lead updates
    }

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
