/*
 * POST /api/clients/[id]/link-lead
 * Manually links an unmatched lead to an existing client.
 * Copies intake form data if the client doesn't have one,
 * then deletes the lead record.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Lead } from "@/models/Lead";
import { Activity } from "@/models/Activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.leadId) {
      return NextResponse.json({ error: "Client already linked to a lead" }, { status: 400 });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    client.leadId = lead._id;
    if (!client.intakeForm && lead.intakeForm) {
      client.intakeForm = lead.intakeForm;
    }
    await client.save();

    await Lead.findByIdAndDelete(leadId);

    try {
      await Activity.create({
        type: "client_updated",
        description: `Manually linked lead "${lead.name}" to client`,
        relatedEntityType: "client",
        relatedEntityId: client._id,
      });
    } catch {
      // Activity logging should never block
    }

    return NextResponse.json(client);
  } catch {
    return NextResponse.json({ error: "Failed to link lead" }, { status: 500 });
  }
}
