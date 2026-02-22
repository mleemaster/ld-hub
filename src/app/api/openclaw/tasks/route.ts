/*
 * OpenClaw task queue collection API routes.
 * GET: Return pending tasks (sorted by order) + recent completed/failed (last 20).
 * POST: Create a new pending task with auto-assigned order.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawTask } from "@/models/OpenClawTask";

export async function GET() {
  try {
    await connectDB();

    const [pending, history] = await Promise.all([
      OpenClawTask.find({ status: { $in: ["pending", "in_progress"] } })
        .sort({ order: 1 })
        .lean(),
      OpenClawTask.find({ status: { $in: ["completed", "failed"] } })
        .sort({ completedAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return NextResponse.json({ pending, history });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const maxOrderDoc = await OpenClawTask.findOne({ status: "pending" })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const order = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    const task = await OpenClawTask.create({
      prompt: body.prompt,
      status: "pending",
      order,
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
