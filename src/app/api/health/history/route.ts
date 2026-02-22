/*
 * Incident history API — returns recent incidents with client info.
 * Supports query params: ?limit=50&status=open|resolved|all
 * Protected by NextAuth session (internal dashboard use only).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteIncident } from "@/models/SiteIncident";
import type { IncidentHistoryResponse, HealthIncident } from "@/lib/health-types";

export async function GET(request: Request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const statusFilter = searchParams.get("status") || "all";

  const query: Record<string, unknown> = {};
  if (statusFilter === "open") query.resolvedAt = null;
  else if (statusFilter === "resolved") query.resolvedAt = { $ne: null };

  const incidents = await SiteIncident.find(query)
    .sort({ startedAt: -1 })
    .limit(limit)
    .populate("clientId", "businessName websiteUrl")
    .lean();

  const mapped: HealthIncident[] = incidents.map((inc) => {
    const client = inc.clientId as unknown as { businessName?: string; websiteUrl?: string } | null;
    return {
      _id: inc._id.toString(),
      clientId: typeof inc.clientId === "object" && client ? (inc.clientId as { _id: { toString(): string } })._id.toString() : inc.clientId.toString(),
      businessName: client?.businessName,
      websiteUrl: client?.websiteUrl,
      type: inc.type,
      description: inc.description,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt?.toISOString(),
      alertCount: inc.alertCount,
    };
  });

  const response: IncidentHistoryResponse = { incidents: mapped };
  return NextResponse.json(response);
}
