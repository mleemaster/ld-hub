/*
 * Contact form health cron job — runs every 6 hours.
 * POSTs a test payload to each client's contactFormEndpoint.
 * 2xx/4xx = endpoint alive (healthy), 5xx or network error = down.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import {
  recordCheck,
  updateClientHealthStatus,
  handleIncident,
  resolveIncidents,
} from "@/lib/health-check-utils";
import type { HealthStatus } from "@/models/SiteHealthCheck";
import type { IClient } from "@/models/Client";
import type { Types } from "mongoose";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const clients: IClient[] = await Client.find({
    projectStatus: "Deployed Active",
    contactFormEndpoint: { $exists: true, $ne: "" },
  }).lean();

  const results: { name: string; status: string }[] = [];

  for (const client of clients) {
    let status: HealthStatus = "healthy";
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(client.contactFormEndpoint!, {
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

    const clientId = client._id as Types.ObjectId;
    await recordCheck({ clientId, checkType: "contact_form", status, statusCode, errorMessage });

    if (status === "down") {
      await handleIncident({
        clientId,
        type: "contact_form_broken",
        description: errorMessage || "Contact form unreachable",
        businessName: client.businessName,
        websiteUrl: client.websiteUrl || client.contactFormEndpoint!,
      });
    } else {
      await resolveIncidents(clientId, "contact_form_broken");
    }

    await updateClientHealthStatus(clientId);
    results.push({ name: client.businessName, status });
  }

  return NextResponse.json({ checked: results.length, results });
}
