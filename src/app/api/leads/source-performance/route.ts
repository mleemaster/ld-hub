/*
 * Source performance API — aggregates lead outcomes by source.
 * Returns leads count, contacted count, replied count, and conversion rate per source.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";

export async function GET() {
  try {
    await connectDB();

    const results = await Lead.aggregate([
      {
        $group: {
          _id: "$source",
          total: { $sum: 1 },
          contacted: {
            $sum: { $cond: [{ $ne: ["$lastContactedDate", null] }, 1, 0] },
          },
          replied: {
            $sum: {
              $cond: [
                { $in: ["$status", ["Warm", "Call Scheduled", "Closed Won"]] },
                1,
                0,
              ],
            },
          },
          won: {
            $sum: { $cond: [{ $eq: ["$status", "Closed Won"] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const data = results.map((r) => ({
      source: r._id || "Unknown",
      total: r.total,
      contacted: r.contacted,
      replied: r.replied,
      conversionRate:
        r.contacted > 0
          ? `${Math.round((r.won / r.contacted) * 100)}%`
          : "0%",
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
