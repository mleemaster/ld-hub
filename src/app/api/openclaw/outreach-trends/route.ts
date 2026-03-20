/*
 * Outreach trend data API.
 * GET: Returns daily counts of leads contacted and follow-ups
 * within a date range, grouped by day in ET timezone.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawActivity } from "@/models/OpenClawActivity";
import { toYMD } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "start and end params required" }, { status: 400 });
    }

    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const pipeline = [
      {
        $match: {
          type: { $in: ["lead_contacted", "follow_up_sent", "message_sent"] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "America/New_York",
              },
            },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 as const } },
    ];

    const results = await OpenClawActivity.aggregate(pipeline);

    const dayMap = new Map<string, { leadsContacted: number; followUps: number }>();

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = toYMD(cursor);
      dayMap.set(key, { leadsContacted: 0, followUps: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const row of results) {
      const day = dayMap.get(row._id.date);
      if (!day) continue;
      if (row._id.type === "lead_contacted" || row._id.type === "message_sent") {
        day.leadsContacted += row.count;
      } else if (row._id.type === "follow_up_sent") {
        day.followUps += row.count;
      }
    }

    const trends = Array.from(dayMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return NextResponse.json({ trends });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}
