/*
 * Shared logic for site health cron jobs.
 * Handles client querying, check recording, incident management,
 * alert deduplication, and Telegram notifications.
 */
import { connectDB } from "@/lib/db";
import { Client, type IClient } from "@/models/Client";
import { SiteHealthCheck, type HealthStatus } from "@/models/SiteHealthCheck";
import { SiteIncident, type IncidentType } from "@/models/SiteIncident";
import { Activity } from "@/models/Activity";
import { sendTelegramAlert } from "@/lib/telegram";
import type { Types } from "mongoose";

export async function getMonitoredClients(): Promise<IClient[]> {
  await connectDB();
  return Client.find({
    projectStatus: "Deployed Active",
    websiteUrl: { $exists: true, $ne: "" },
  }).lean();
}

export async function recordCheck(params: {
  clientId: Types.ObjectId;
  checkType: "uptime" | "ssl" | "contact_form";
  status: HealthStatus;
  responseTimeMs?: number;
  statusCode?: number;
  sslDaysRemaining?: number;
  sslExpiry?: Date;
  errorMessage?: string;
}) {
  await SiteHealthCheck.create({ ...params, checkedAt: new Date() });
}

export async function updateClientHealthStatus(clientId: Types.ObjectId) {
  await connectDB();

  const latestChecks = await SiteHealthCheck.aggregate([
    { $match: { clientId } },
    { $sort: { checkedAt: -1 } },
    { $group: { _id: "$checkType", status: { $first: "$status" } } },
  ]);

  let overall: HealthStatus = "healthy";
  for (const check of latestChecks) {
    if (check.status === "down") {
      overall = "down";
      break;
    }
    if (check.status === "degraded") {
      overall = "degraded";
    }
  }

  const previous = await Client.findById(clientId).select("currentHealthStatus businessName").lean();
  const previousStatus = previous?.currentHealthStatus;

  await Client.findByIdAndUpdate(clientId, {
    currentHealthStatus: overall,
    lastHealthCheck: new Date(),
  });

  if (previousStatus && previousStatus !== overall) {
    await Activity.create({
      type: "site_health_changed",
      description: `${previous?.businessName ?? "Client"} health: ${previousStatus} → ${overall}`,
      relatedEntityType: "client",
      relatedEntityId: clientId,
    });
  }
}

// Alert dedup: 1st immediate, 2nd at 1hr, then every 6hrs
function shouldAlert(incident: { alertCount: number; lastAlertSentAt?: Date }): boolean {
  if (incident.alertCount === 0) return true;
  if (!incident.lastAlertSentAt) return true;

  const elapsed = Date.now() - new Date(incident.lastAlertSentAt).getTime();
  const oneHour = 60 * 60 * 1000;
  const sixHours = 6 * 60 * 60 * 1000;

  if (incident.alertCount === 1) return elapsed >= oneHour;
  return elapsed >= sixHours;
}

export async function handleIncident(params: {
  clientId: Types.ObjectId;
  type: IncidentType;
  description: string;
  businessName: string;
  websiteUrl: string;
}) {
  await connectDB();

  let incident = await SiteIncident.findOne({
    clientId: params.clientId,
    type: params.type,
    resolvedAt: null,
  });

  if (!incident) {
    incident = await SiteIncident.create({
      clientId: params.clientId,
      type: params.type,
      description: params.description,
      startedAt: new Date(),
      alertCount: 0,
    });
  }

  if (shouldAlert(incident)) {
    const emoji = params.type.includes("expired") || params.type === "down" ? "🔴" : "🟡";
    const message =
      `${emoji} <b>${params.businessName}</b>\n` +
      `${params.description}\n` +
      `<a href="${params.websiteUrl}">${params.websiteUrl}</a>`;

    await sendTelegramAlert(message);
    incident.alertCount += 1;
    incident.lastAlertSentAt = new Date();
    await incident.save();
  }
}

export async function resolveIncidents(clientId: Types.ObjectId, type: IncidentType) {
  await connectDB();

  const openIncidents = await SiteIncident.find({
    clientId,
    type,
    resolvedAt: null,
  });

  for (const incident of openIncidents) {
    incident.resolvedAt = new Date();
    await incident.save();

    const client = await Client.findById(clientId).select("businessName websiteUrl").lean();
    await sendTelegramAlert(
      `✅ <b>${client?.businessName ?? "Client"}</b>\n` +
      `Resolved: ${incident.description}\n` +
      `<a href="${client?.websiteUrl ?? ""}">${client?.websiteUrl ?? ""}</a>`
    );
  }
}
