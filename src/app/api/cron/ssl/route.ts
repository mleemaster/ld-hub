/*
 * SSL certificate cron job — runs daily at 6am UTC.
 * Connects via TLS to inspect each site's certificate expiry.
 * Alerts at <=14 days (degraded/ssl_expiring), <=0 days (down/ssl_expired).
 * Must run in Node.js runtime (not Edge) for tls module access.
 */
import { NextResponse } from "next/server";
import tls from "tls";
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
export const runtime = "nodejs";

function checkSSL(hostname: string): Promise<{ daysRemaining: number; expiry: Date }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || !cert.valid_to) {
        reject(new Error("No certificate found"));
        return;
      }

      const expiry = new Date(cert.valid_to);
      const daysRemaining = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      resolve({ daysRemaining, expiry });
    });

    socket.setTimeout(10000);
    socket.on("timeout", () => { socket.destroy(); reject(new Error("Connection timed out")); });
    socket.on("error", reject);
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await getMonitoredClients();
  const results: { name: string; status: string; daysRemaining?: number }[] = [];

  for (const client of clients) {
    let status: HealthStatus = "healthy";
    let sslDaysRemaining: number | undefined;
    let sslExpiry: Date | undefined;
    let errorMessage: string | undefined;

    try {
      const url = new URL(client.websiteUrl!);
      const hostname = url.hostname;
      const sslInfo = await checkSSL(hostname);

      sslDaysRemaining = sslInfo.daysRemaining;
      sslExpiry = sslInfo.expiry;

      if (sslDaysRemaining <= 0) {
        status = "down";
        errorMessage = "SSL certificate expired";
      } else if (sslDaysRemaining <= 14) {
        status = "degraded";
        errorMessage = `SSL expires in ${sslDaysRemaining} days`;
      }
    } catch (err) {
      status = "degraded";
      errorMessage = err instanceof Error ? err.message : "SSL check failed";
    }

    const clientId = client._id as Types.ObjectId;
    await recordCheck({ clientId, checkType: "ssl", status, sslDaysRemaining, sslExpiry, errorMessage });

    if (status === "down") {
      await handleIncident({
        clientId,
        type: "ssl_expired",
        description: errorMessage!,
        businessName: client.businessName,
        websiteUrl: client.websiteUrl!,
      });
    } else if (status === "degraded" && sslDaysRemaining !== undefined) {
      await handleIncident({
        clientId,
        type: "ssl_expiring",
        description: errorMessage!,
        businessName: client.businessName,
        websiteUrl: client.websiteUrl!,
      });
    } else {
      await resolveIncidents(clientId, "ssl_expired");
      await resolveIncidents(clientId, "ssl_expiring");
    }

    await updateClientHealthStatus(clientId);
    results.push({ name: client.businessName, status, daysRemaining: sslDaysRemaining });
  }

  return NextResponse.json({ checked: results.length, results });
}
