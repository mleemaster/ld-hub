/*
 * OpenClaw heartbeat API routes.
 * POST: Upsert heartbeat status (called by OpenClaw agent, auth via x-api-key).
 * GET: Return current status with computed `connected` boolean.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawStatus } from "@/models/OpenClawStatus";

const HEARTBEAT_THRESHOLD_MS = 15 * 60 * 1000;

export async function GET() {
  try {
    await connectDB();
    const status = await OpenClawStatus.findOne().lean();

    if (!status) {
      return NextResponse.json({
        connected: false,
        lastHeartbeat: null,
        currentTaskId: null,
        currentTaskSummary: null,
      });
    }

    const connected =
      Date.now() - new Date(status.lastHeartbeat).getTime() < HEARTBEAT_THRESHOLD_MS;

    return NextResponse.json({
      connected,
      lastHeartbeat: status.lastHeartbeat,
      currentTaskId: status.currentTaskId || null,
      currentTaskSummary: status.currentTaskSummary || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch heartbeat status" },
      { status: 500 }
    );
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

    const update: Record<string, unknown> = { lastHeartbeat: new Date() };
    if (body.currentTaskId !== undefined) update.currentTaskId = body.currentTaskId;
    if (body.currentTaskSummary !== undefined)
      update.currentTaskSummary = body.currentTaskSummary;

    const status = await OpenClawStatus.findOneAndUpdate({}, update, {
      upsert: true,
      new: true,
    });

    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: "Failed to update heartbeat" },
      { status: 500 }
    );
  }
}
