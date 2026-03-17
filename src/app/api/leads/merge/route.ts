/*
 * Lead attribute merge API.
 * POST: Bulk-updates all leads matching a field value to a new value.
 * Used from the outreach response statistics to merge duplicate categories
 * (e.g., "KSL Classifieds" → "KSL", "UT" → "Utah").
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";

const ALLOWED_FIELDS = new Set(["source", "state", "industry"]);

export async function POST(req: NextRequest) {
  try {
    const { field, fromValue, toValue } = await req.json();

    if (!field || !ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { error: "Invalid field. Must be source, state, or industry." },
        { status: 400 }
      );
    }

    if (!fromValue || !toValue || typeof fromValue !== "string" || typeof toValue !== "string") {
      return NextResponse.json(
        { error: "fromValue and toValue are required strings." },
        { status: 400 }
      );
    }

    if (fromValue.trim() === toValue.trim()) {
      return NextResponse.json(
        { error: "fromValue and toValue must be different." },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await Lead.updateMany(
      { [field]: fromValue.trim() },
      { $set: { [field]: toValue.trim() } }
    );

    return NextResponse.json({ updated: result.modifiedCount });
  } catch {
    return NextResponse.json(
      { error: "Failed to merge leads" },
      { status: 500 }
    );
  }
}
