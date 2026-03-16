/*
 * Outreach response statistics API.
 * Aggregates lead data to compute response rates broken down by
 * state, source, template, day of week, industry, and status funnel.
 * A lead counts as "contacted" if status !== "New".
 * A lead counts as "responded" if status is not "New" or "No Response".
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client } from "@/models/Client";
import { MessageTemplate } from "@/models/MessageTemplate";

const RESPONDED_STATUSES = ["Rejected", "Cold", "Warm", "Call Scheduled", "Closed Won", "Closed Lost"];
const POSITIVE_STATUSES = ["Warm", "Call Scheduled", "Closed Won"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface BreakdownRow {
  label: string;
  sent: number;
  responded: number;
  positive: number;
  rate: number;
}

function buildBreakdown(rows: { label: string; status: string }[]): BreakdownRow[] {
  const map = new Map<string, { sent: number; responded: number; positive: number }>();

  for (const row of rows) {
    if (!row.label) continue;
    let entry = map.get(row.label);
    if (!entry) {
      entry = { sent: 0, responded: 0, positive: 0 };
      map.set(row.label, entry);
    }
    entry.sent++;
    if (RESPONDED_STATUSES.includes(row.status)) entry.responded++;
    if (POSITIVE_STATUSES.includes(row.status)) entry.positive++;
  }

  return Array.from(map.entries())
    .map(([label, d]) => ({
      label,
      sent: d.sent,
      responded: d.responded,
      positive: d.positive,
      rate: d.sent > 0 ? parseFloat(((d.responded / d.sent) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.sent - a.sent);
}

export async function GET() {
  try {
    await connectDB();

    const contactedLeads = await Lead.find(
      { status: { $ne: "New" }, lastContactedDate: { $exists: true } },
      { status: 1, state: 1, source: 1, industry: 1, outreachTemplateName: 1, lastContactedDate: 1 }
    ).lean();

    const withDay = contactedLeads.map((l) => {
      const d = l.lastContactedDate ? new Date(l.lastContactedDate) : null;
      return {
        status: l.status as string,
        state: (l.state as string) || "",
        source: (l.source as string) || "",
        industry: (l.industry as string) || "",
        templateName: (l.outreachTemplateName as string) || "",
        dayOfWeek: d ? DAY_NAMES[d.getDay()] : "",
      };
    });

    const byState = buildBreakdown(withDay.filter((r) => r.state).map((r) => ({ label: r.state, status: r.status })));
    const bySource = buildBreakdown(withDay.filter((r) => r.source).map((r) => ({ label: r.source, status: r.status })));
    const activeTemplates = await MessageTemplate.find({ active: true }, { name: 1 }).lean();
    const activeTemplateNames = new Set(activeTemplates.map((t) => t.name as string));
    const byTemplate = buildBreakdown(
      withDay.filter((r) => r.templateName && activeTemplateNames.has(r.templateName))
        .map((r) => ({ label: r.templateName, status: r.status }))
    );
    const byIndustry = buildBreakdown(withDay.filter((r) => r.industry).map((r) => ({ label: r.industry, status: r.status })));
    const byDayOfWeek = buildBreakdown(withDay.filter((r) => r.dayOfWeek).map((r) => ({ label: r.dayOfWeek, status: r.status })));

    // Re-sort day of week in calendar order
    const dayOrder = DAY_NAMES;
    byDayOfWeek.sort((a, b) => dayOrder.indexOf(a.label) - dayOrder.indexOf(b.label));

    const totalSent = contactedLeads.length;
    const totalResponded = contactedLeads.filter((l) => RESPONDED_STATUSES.includes(l.status as string)).length;
    const totalPositive = contactedLeads.filter((l) => POSITIVE_STATUSES.includes(l.status as string)).length;
    const closedWonLeads = contactedLeads.filter((l) => l.status === "Closed Won").length;
    const convertedClients = await Client.countDocuments({ leadId: { $exists: true, $ne: null } });
    const totalClosedWon = closedWonLeads + convertedClients;

    // Status breakdown for funnel
    const statusCounts: Record<string, number> = {};
    for (const l of contactedLeads) {
      const s = l.status as string;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    return NextResponse.json({
      overview: {
        totalSent,
        totalResponded,
        totalPositive,
        totalClosedWon,
        responseRate: totalSent > 0 ? parseFloat(((totalResponded / totalSent) * 100).toFixed(1)) : 0,
        positiveRate: totalSent > 0 ? parseFloat(((totalPositive / totalSent) * 100).toFixed(1)) : 0,
        closeRate: totalSent > 0 ? parseFloat(((totalClosedWon / totalSent) * 100).toFixed(1)) : 0,
      },
      statusCounts,
      byState,
      bySource,
      byTemplate,
      byIndustry,
      byDayOfWeek,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch outreach stats" }, { status: 500 });
  }
}
