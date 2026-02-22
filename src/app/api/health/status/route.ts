/*
 * Health status API — returns current health for all monitored sites.
 * Protected by NextAuth session (internal dashboard use only).
 * Aggregates latest check per client per type + open incidents.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { SiteHealthCheck } from "@/models/SiteHealthCheck";
import { SiteIncident } from "@/models/SiteIncident";
import type { HealthStatusResponse, SiteHealth, HealthCheck, HealthIncident, HealthSummary } from "@/lib/health-types";

export async function GET() {
  await connectDB();

  const clients = await Client.find({
    projectStatus: "Deployed Active",
    websiteUrl: { $exists: true, $ne: "" },
  })
    .select("businessName websiteUrl currentHealthStatus lastHealthCheck")
    .lean();

  const clientIds = clients.map((c) => c._id);

  const [latestChecks, openIncidents] = await Promise.all([
    SiteHealthCheck.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $sort: { checkedAt: -1 } },
      {
        $group: {
          _id: { clientId: "$clientId", checkType: "$checkType" },
          status: { $first: "$status" },
          responseTimeMs: { $first: "$responseTimeMs" },
          statusCode: { $first: "$statusCode" },
          sslDaysRemaining: { $first: "$sslDaysRemaining" },
          sslExpiry: { $first: "$sslExpiry" },
          errorMessage: { $first: "$errorMessage" },
          checkedAt: { $first: "$checkedAt" },
        },
      },
    ]),
    SiteIncident.find({ clientId: { $in: clientIds }, resolvedAt: null }).lean(),
  ]);

  const checksByClient = new Map<string, HealthCheck[]>();
  for (const check of latestChecks) {
    const cid = check._id.clientId.toString();
    if (!checksByClient.has(cid)) checksByClient.set(cid, []);
    checksByClient.get(cid)!.push({
      checkType: check._id.checkType,
      status: check.status,
      responseTimeMs: check.responseTimeMs,
      statusCode: check.statusCode,
      sslDaysRemaining: check.sslDaysRemaining,
      sslExpiry: check.sslExpiry?.toISOString(),
      errorMessage: check.errorMessage,
      checkedAt: check.checkedAt.toISOString(),
    });
  }

  const incidentsByClient = new Map<string, HealthIncident[]>();
  for (const inc of openIncidents) {
    const cid = inc.clientId.toString();
    if (!incidentsByClient.has(cid)) incidentsByClient.set(cid, []);
    incidentsByClient.get(cid)!.push({
      _id: inc._id.toString(),
      clientId: cid,
      type: inc.type,
      description: inc.description,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt?.toISOString(),
      alertCount: inc.alertCount,
    });
  }

  const summary: HealthSummary = { total: clients.length, healthy: 0, degraded: 0, down: 0 };
  const sites: SiteHealth[] = [];

  for (const client of clients) {
    const cid = client._id.toString();
    const status = client.currentHealthStatus || "healthy";

    if (status === "healthy") summary.healthy++;
    else if (status === "degraded") summary.degraded++;
    else if (status === "down") summary.down++;

    sites.push({
      clientId: cid,
      businessName: client.businessName,
      websiteUrl: client.websiteUrl!,
      currentHealthStatus: status as SiteHealth["currentHealthStatus"],
      lastHealthCheck: client.lastHealthCheck?.toISOString(),
      checks: checksByClient.get(cid) || [],
      incidents: incidentsByClient.get(cid) || [],
    });
  }

  // Sort: problems first
  sites.sort((a, b) => {
    const order = { down: 0, degraded: 1, healthy: 2 };
    return (order[a.currentHealthStatus] ?? 2) - (order[b.currentHealthStatus] ?? 2);
  });

  const response: HealthStatusResponse = { summary, sites };
  return NextResponse.json(response);
}
