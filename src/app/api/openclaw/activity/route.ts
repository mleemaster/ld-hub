/*
 * OpenClaw activity log API routes.
 * GET: Fetch activity log (paginated, most recent first).
 * POST: Log a new activity (called by OpenClaw).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawActivity } from "@/models/OpenClawActivity";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const activities = await OpenClawActivity.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await OpenClawActivity.countDocuments();
    return NextResponse.json({ activities, total });
  } catch {
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.OPENCLAW_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const activity = await OpenClawActivity.create(body);
    return NextResponse.json(activity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
