/*
 * Activity feed API route.
 * GET: Returns recent activity, optionally filtered by related entity.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const entityId = searchParams.get("relatedEntityId");
    const entityType = searchParams.get("relatedEntityType");

    const filter: Record<string, string> = {};
    if (entityId) filter.relatedEntityId = entityId;
    if (entityType) filter.relatedEntityType = entityType;

    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(activities);
  } catch {
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
