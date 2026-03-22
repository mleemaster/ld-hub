/*
 * Manual health check API — triggers uptime, SSL, and contact form checks
 * for all monitored clients on demand. Same logic as the cron jobs but
 * callable from the dashboard without CRON_SECRET.
 */
import { NextResponse } from "next/server";
import tls from "tls";
import { connectDB } from "@/lib/db";
import { Client, type IClient } from "@/models/Client";
import {
  getMonitoredClients,
  recordCheck,
  updateClientHealthStatus,
  handleIncident,
  resolveIncidents,
} from "@/lib/health-check-utils";
import type { HealthStatus } from "@/models/SiteHealthCheck";
import type { Types } from "mongoose";

export const maxDuration = 120;
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

async function runUptimeCheck(client: IClient) {
  const clientId = client._id as Types.ObjectId;
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

  return status;
}

async function runSSLCheck(client: IClient) {
  const clientId = client._id as Types.ObjectId;
  let status: HealthStatus = "healthy";
  let sslDaysRemaining: number | undefined;
  let sslExpiry: Date | undefined;
  let errorMessage: string | undefined;

  try {
    const url = new URL(client.websiteUrl!);
    const sslInfo = await checkSSL(url.hostname);
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

  await recordCheck({ clientId, checkType: "ssl", status, sslDaysRemaining, sslExpiry, errorMessage });

  if (status === "down") {
    await handleIncident({
      clientId, type: "ssl_expired", description: errorMessage!,
      businessName: client.businessName, websiteUrl: client.websiteUrl!,
    });
  } else if (status === "degraded" && sslDaysRemaining !== undefined) {
    await handleIncident({
      clientId, type: "ssl_expiring", description: errorMessage!,
      businessName: client.businessName, websiteUrl: client.websiteUrl!,
    });
  } else {
    await resolveIncidents(clientId, "ssl_expired");
    await resolveIncidents(clientId, "ssl_expiring");
  }

  return status;
}

async function runContactFormCheck(client: IClient) {
  if (!client.contactFormEndpoint) return null;

  const clientId = client._id as Types.ObjectId;
  let status: HealthStatus = "healthy";
  let statusCode: number | undefined;
  let errorMessage: string | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(client.contactFormEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _health_check: true,
        name: "Health Check",
        email: "healthcheck@leemasterdesign.com",
        message: "Automated health check — please ignore",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    statusCode = res.status;
    if (statusCode >= 500) {
      status = "down";
      errorMessage = `Contact form returned HTTP ${statusCode}`;
    }
  } catch (err) {
    status = "down";
    errorMessage = err instanceof Error ? err.message : "Network error";
  }

  await recordCheck({ clientId, checkType: "contact_form", status, statusCode, errorMessage });

  if (status === "down") {
    await handleIncident({
      clientId, type: "contact_form_broken",
      description: errorMessage || "Contact form unreachable",
      businessName: client.businessName, websiteUrl: client.websiteUrl || client.contactFormEndpoint,
    });
  } else {
    await resolveIncidents(clientId, "contact_form_broken");
  }

  return status;
}

export async function POST() {
  const clients = await getMonitoredClients();

  await connectDB();
  const contactClients = await Client.find({
    projectStatus: "Deployed Active",
    contactFormEndpoint: { $exists: true, $ne: "" },
  }).lean();

  const contactEndpointMap = new Map<string, string>();
  for (const c of contactClients) {
    contactEndpointMap.set(c._id.toString(), c.contactFormEndpoint!);
  }

  const results: { name: string; uptime: string; ssl: string; contactForm: string | null }[] = [];

  for (const client of clients) {
    const clientWithContact = {
      ...client,
      contactFormEndpoint: contactEndpointMap.get(client._id.toString()),
    } as IClient;

    const [uptimeStatus, sslStatus, contactStatus] = await Promise.all([
      runUptimeCheck(clientWithContact),
      runSSLCheck(clientWithContact),
      runContactFormCheck(clientWithContact),
    ]);

    await updateClientHealthStatus(client._id as Types.ObjectId);

    results.push({
      name: client.businessName,
      uptime: uptimeStatus,
      ssl: sslStatus,
      contactForm: contactStatus,
    });
  }

  return NextResponse.json({ checked: results.length, results });
}
