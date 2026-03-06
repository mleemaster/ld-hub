/*
 * Lead Source CRUD by ID.
 * PUT: Rename a source and bulk-update all leads with the old name.
 * DELETE: Reassign all leads to a target source, then delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LEAD_SOURCES } from "@/lib/lead-constants";
import { LeadSource } from "@/models/LeadSource";
import { Lead } from "@/models/Lead";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Source name is required" }, { status: 400 });
    }

    const trimmed = name.trim();

    const defaultMatch = LEAD_SOURCES.find(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (defaultMatch) {
      return NextResponse.json({ error: "A default source with that name already exists" }, { status: 409 });
    }

    const duplicate = await LeadSource.findOne({
      _id: { $ne: id },
      name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Source already exists" }, { status: 409 });
    }

    const source = await LeadSource.findById(id);
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const oldName = source.name;
    source.name = trimmed;
    await source.save();

    await Lead.updateMany({ source: oldName }, { source: trimmed });

    return NextResponse.json({ name: source.name });
  } catch {
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const { reassignTo } = await request.json();

    if (!reassignTo?.trim()) {
      return NextResponse.json({ error: "reassignTo is required" }, { status: 400 });
    }

    const source = await LeadSource.findById(id);
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await Lead.updateMany({ source: source.name }, { source: reassignTo.trim() });
    await source.deleteOne();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
