/*
 * OpenClaw summary/cost aggregation API.
 * GET: Returns activity counts for today and cost breakdowns.
 * All date boundaries use America/New_York so counters reset at midnight ET.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OpenClawActivity } from "@/models/OpenClawActivity";

const TZ = "America/New_York";

function nowInET() {
  const s = new Date().toLocaleString("en-US", { timeZone: TZ });
  return new Date(s);
}

function startOfToday(): Date {
  const et = nowInET();
  et.setHours(0, 0, 0, 0);
  return et;
}

function startOfWeek(): Date {
  const et = nowInET();
  const day = et.getDay();
  const diff = day === 0 ? 6 : day - 1;
  et.setDate(et.getDate() - diff);
  et.setHours(0, 0, 0, 0);
  return et;
}

function startOfMonth(): Date {
  const et = nowInET();
  et.setDate(1);
  et.setHours(0, 0, 0, 0);
  return et;
}

export async function GET() {
  try {
    await connectDB();

    const today = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    const [
      messagesSentToday,
      leadsScrapedToday,
      costThisWeekAgg,
      costThisMonthAgg,
      totalCostAgg,
      totalLeadActivities,
      totalMessageActivities,
    ] = await Promise.all([
      OpenClawActivity.countDocuments({
        type: { $in: ["message_sent", "follow_up_sent"] },
        createdAt: { $gte: today },
      }),
      OpenClawActivity.countDocuments({
        type: "lead_scraped",
        createdAt: { $gte: today },
      }),
      OpenClawActivity.aggregate([
        { $match: { createdAt: { $gte: weekStart }, cost: { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
      OpenClawActivity.aggregate([
        { $match: { createdAt: { $gte: monthStart }, cost: { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
      OpenClawActivity.aggregate([
        { $match: { cost: { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
      OpenClawActivity.countDocuments({
        type: { $in: ["lead_scraped", "lead_added"] },
      }),
      OpenClawActivity.countDocuments({
        type: { $in: ["message_sent", "follow_up_sent"] },
      }),
    ]);

    const costThisWeek = costThisWeekAgg[0]?.total || 0;
    const costThisMonth = costThisMonthAgg[0]?.total || 0;
    const totalCost = totalCostAgg[0]?.total || 0;

    const costPerLead =
      totalLeadActivities > 0 ? totalCost / totalLeadActivities : 0;
    const costPerMessage =
      totalMessageActivities > 0 ? totalCost / totalMessageActivities : 0;

    return NextResponse.json({
      messagesSentToday,
      leadsScrapedToday,
      costThisWeek,
      costThisMonth,
      costPerLead,
      costPerMessage,
      apiSpendThisMonth: costThisMonth,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
