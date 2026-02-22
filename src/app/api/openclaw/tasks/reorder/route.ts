/*
 * Bulk reorder API for OpenClaw tasks.
 * PUT: Accept { taskIds: string[] } and update order fields based on array position.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawTask } from "@/models/OpenClawTask";

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { taskIds } = await request.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds array is required" },
        { status: 400 }
      );
    }

    const ops = taskIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index },
      },
    }));

    await OpenClawTask.bulkWrite(ops);
    return NextResponse.json({ reordered: taskIds.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to reorder tasks" },
      { status: 500 }
    );
  }
}
