/*
 * Template response rate stats.
 * Aggregates leads by outreachTemplateId, counting total sends
 * and responses (any status beyond "No Response").
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";

export async function GET() {
  try {
    await connectDB();

    const stats = await Lead.aggregate([
      { $match: { outreachTemplateId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$outreachTemplateId",
          sent: { $sum: 1 },
          responded: {
            $sum: {
              $cond: [{ $ne: ["$status", "No Response"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          templateId: "$_id",
          sent: 1,
          responded: 1,
        },
      },
    ]);

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch template stats" }, { status: 500 });
  }
}
