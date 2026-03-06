/*
 * Lead Sources API.
 * GET: Returns merged list of default + custom sources, "Other" pinned last.
 * POST: Creates a new custom source.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LEAD_SOURCES } from "@/lib/lead-constants";
import { LeadSource } from "@/models/LeadSource";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const custom = await LeadSource.find().lean();
    const customMap = new Map(custom.map((c) => [c.name, String(c._id)]));
    const customNames = custom.map((c) => c.name);

    const all = [...new Set([...LEAD_SOURCES, ...customNames])];
    const other = all.filter((i) => i === "Other");
    const rest = all.filter((i) => i !== "Other").sort((a, b) => a.localeCompare(b));
    const sorted = [...rest, ...other];

    const detailed = request.nextUrl.searchParams.get("detailed") === "true";
    if (detailed) {
      return NextResponse.json(
        sorted.map((name) => ({
          _id: customMap.get(name) ?? null,
          name,
          isDefault: !customMap.has(name),
        }))
      );
    }

    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json([...LEAD_SOURCES], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Source name is required" }, { status: 400 });
    }

    const trimmed = name.trim();

    const defaultMatch = LEAD_SOURCES.find(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (defaultMatch) {
      return NextResponse.json({ error: "Source already exists" }, { status: 409 });
    }

    const existing = await LeadSource.findOne({
      name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json({ error: "Source already exists" }, { status: 409 });
    }

    const source = await LeadSource.create({ name: trimmed });
    return NextResponse.json({ name: source.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
