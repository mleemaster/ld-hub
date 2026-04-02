/*
 * API routes for individual lead operations.
 * GET: Fetch a single lead by ID.
 * PUT: Update a lead record with activity logging for status/contact changes.
 * DELETE: Remove a lead record and log the deletion.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Activity } from "@/models/Activity";
import { OpenClawActivity } from "@/models/OpenClawActivity";
import { calculateNextFollowUpDate } from "@/lib/followup-constants";
import type { LeadStatus } from "@/lib/lead-constants";

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

    if (body.lastContactedDate && existing.followUpDate) {
      const contactDate = String(body.lastContactedDate).split("T")[0];
      const followUp = existing.followUpDate.toISOString().split("T")[0];
      if (contactDate === followUp) {
        body.followUpDate = null;
      }
    }

    // Smart follow-up: handle contact tracking
    const existingContactDate = existing.lastContactedDate
      ? existing.lastContactedDate.toISOString().split("T")[0]
      : null;
    const newContactDate = body.lastContactedDate
      ? String(body.lastContactedDate).split("T")[0]
      : null;
    const isNewContact = newContactDate && newContactDate !== existingContactDate;

    if (isNewContact) {
      body.contactAttempts = (existing.contactAttempts || 0) + 1;
      if (!existing.firstContactedDate) {
        body.firstContactedDate = new Date();
      }
    }

    // Smart follow-up: handle status change
    const statusChanged = body.status && body.status !== existing.status;
    if (statusChanged) {
      body.stageEnteredAt = new Date();
    }

    // Calculate nextFollowUpDate on contact or status change
    if (isNewContact || statusChanged) {
      const effectiveStatus = (body.status || existing.status) as LeadStatus;
      const effectiveCallDate = body.callScheduledDate || existing.callScheduledDate;
      const nextFollowUp = calculateNextFollowUpDate(effectiveStatus, effectiveCallDate);
      body.nextFollowUpDate = nextFollowUp ?? null;
    }

    const lead = await Lead.findByIdAndUpdate(id, body, { new: true });

    try {
      const isFirstContact = existing.status === "New" && body.status && body.status !== "New";

      if (statusChanged) {
        await Activity.create({
          type: "lead_status_changed",
          description: `${existing.name}: ${existing.status} → ${body.status}`,
          relatedEntityType: "lead",
          relatedEntityId: existing._id,
        });
      }

      if (isNewContact) {
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    try {
      await Activity.create({
        type: "lead_status_changed",
        description: `Lead deleted: ${lead.name}`,
        relatedEntityType: "lead",
        relatedEntityId: lead._id,
      });
    } catch {
      // Activity logging should never block lead deletion
    }

    return NextResponse.json({ message: "Lead deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
