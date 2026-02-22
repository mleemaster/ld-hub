/*
 * Industries API.
 * GET: Returns merged list of default + custom industries.
 * POST: Creates a new custom industry.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { INDUSTRIES } from "@/lib/lead-constants";
import { Industry } from "@/models/Industry";

export async function GET() {
  try {
    await connectDB();
    const custom = await Industry.find().lean();
    const customNames = custom.map((c) => c.name);

    const all = [...new Set([...INDUSTRIES, ...customNames])];
    const other = all.filter((i) => i === "Other");
    const rest = all.filter((i) => i !== "Other").sort((a, b) => a.localeCompare(b));

    return NextResponse.json([...rest, ...other]);
  } catch {
    return NextResponse.json([...INDUSTRIES], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Industry name is required" }, { status: 400 });
    }

    const trimmed = name.trim();

    const defaultMatch = INDUSTRIES.find(
      (i) => i.toLowerCase() === trimmed.toLowerCase()
    );
    if (defaultMatch) {
      return NextResponse.json({ error: "Industry already exists" }, { status: 409 });
    }

    const existing = await Industry.findOne({
      name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json({ error: "Industry already exists" }, { status: 409 });
    }

    const industry = await Industry.create({ name: trimmed });
    return NextResponse.json({ name: industry.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create industry" }, { status: 500 });
  }
}
