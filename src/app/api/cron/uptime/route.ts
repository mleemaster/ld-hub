/*
 * Uptime cron job — runs every 30 minutes.
 * Fetches each monitored client's website and checks response status/time.
 * 500+ = down, 400+ = degraded, >10s response = degraded.
 */
import { NextResponse } from "next/server";
import {
  getMonitoredClients,
  recordCheck,
  updateClientHealthStatus,
  handleIncident,
  resolveIncidents,
} from "@/lib/health-check-utils";
import type { HealthStatus } from "@/models/SiteHealthCheck";
import type { Types } from "mongoose";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await getMonitoredClients();
  const results: { name: string; status: string }[] = [];

  for (const client of clients) {
    let status: HealthStatus = "healthy";
    let statusCode: number | undefined;
    let responseTimeMs: number | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const start = Date.now();
      const res = await fetch(client.websiteUrl!, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);

      responseTimeMs = Date.now() - start;
      statusCode = res.status;

      if (statusCode >= 500) {
        status = "down";
        errorMessage = `HTTP ${statusCode}`;
      } else if (statusCode >= 400) {
        status = "degraded";
        errorMessage = `HTTP ${statusCode}`;
      } else if (responseTimeMs > 10000) {
        status = "degraded";
        errorMessage = `Slow response: ${responseTimeMs}ms`;
      }
    } catch (err) {
      status = "down";
      errorMessage = err instanceof Error ? err.message : "Network error";
    }

    const clientId = client._id as Types.ObjectId;
    await recordCheck({ clientId, checkType: "uptime", status, responseTimeMs, statusCode, errorMessage });

    if (status === "down" || status === "degraded") {
      await handleIncident({
        clientId,
        type: status === "down" ? "down" : "degraded",
        description: errorMessage || `Site ${status}`,
        businessName: client.businessName,
        websiteUrl: client.websiteUrl!,
      });
    } else {
      await resolveIncidents(clientId, "down");
      await resolveIncidents(clientId, "degraded");
    }

    await updateClientHealthStatus(clientId);
    results.push({ name: client.businessName, status });
  }

  return NextResponse.json({ checked: results.length, results });
}
