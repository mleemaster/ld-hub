/*
 * Dashboard page — the landing view after login.
 * Displays business snapshot: MRR, active clients, lead pipeline,
 * outreach queue, leads needing attention, OpenClaw status, site health, activity feed.
 */
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client, type IClient } from "@/models/Client";
import { Activity } from "@/models/Activity";
import { OpenClawStatus } from "@/models/OpenClawStatus";
import { OpenClawActivity } from "@/models/OpenClawActivity";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

async function getLeadCounts() {
  try {
    await connectDB();
    const [outreachCount, pipelineCount] = await Promise.all([
      Lead.countDocuments({ status: "New" }),
      Lead.countDocuments({ status: { $nin: ["New", "Closed Won", "Closed Lost"] } }),
    ]);
    return { outreachCount, pipelineCount };
  } catch {
    return { outreachCount: 0, pipelineCount: 0 };
  }
}

async function getSiteHealthSummary() {
  try {
    await connectDB();
    const clients = await Client.find({
      projectStatus: "Deployed Active",
      websiteUrl: { $exists: true, $ne: "" },
    })
      .select("businessName currentHealthStatus")
      .lean();

    const summary = { total: clients.length, healthy: 0, degraded: 0, down: 0 };
    const problems: { name: string; status: string }[] = [];

    for (const c of clients) {
      const s = c.currentHealthStatus || "healthy";
      if (s === "healthy") summary.healthy++;
      else if (s === "degraded") { summary.degraded++; problems.push({ name: c.businessName, status: s }); }
      else if (s === "down") { summary.down++; problems.push({ name: c.businessName, status: s }); }
    }

    return { summary, problems };
  } catch {
    return { summary: { total: 0, healthy: 0, degraded: 0, down: 0 }, problems: [] };
  }
}

async function getMrrAndActiveClients() {
  try {
    await connectDB();
    const clients = (await Client.find({}).lean()) as IClient[];
    let mrr = 0;
    let activeCount = 0;

    for (const client of clients) {
      if (client.projectStatus === "Deployed Canceled") continue;
      activeCount++;
      if (client.monthlyRevenue) mrr += client.monthlyRevenue;
      if (client.ppcClient && client.ppcManagementFee) mrr += client.ppcManagementFee;
    }

    return { mrr, activeCount };
  } catch {
    return { mrr: 0, activeCount: 0 };
  }
}

async function getNeedsAttention() {
  try {
    await connectDB();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [followUpsToday, callsToday] = await Promise.all([
      Lead.countDocuments({
        followUpDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["Closed Won", "Closed Lost"] },
      }),
      Lead.countDocuments({
        callScheduledDate: { $gte: startOfDay, $lte: endOfDay },
        status: "Call Scheduled",
      }),
    ]);

    return { followUpsToday, callsToday };
  } catch {
    return { followUpsToday: 0, callsToday: 0 };
  }
}

async function getRecentActivity() {
  try {
    await connectDB();
    const activities = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return activities.map((a) => ({
      _id: String(a._id),
      description: a.description,
      createdAt: a.createdAt,
    }));
  } catch {
    return [];
  }
}

async function getOpenClawStats() {
  try {
    await connectDB();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [statusDoc, messagesSentToday, leadsScrapedToday] = await Promise.all([
      OpenClawStatus.findOne().lean(),
      OpenClawActivity.countDocuments({
        type: { $in: ["message_sent", "follow_up_sent"] },
        createdAt: { $gte: startOfDay },
      }),
      OpenClawActivity.countDocuments({
        type: "lead_scraped",
        createdAt: { $gte: startOfDay },
      }),
    ]);

    const connected = statusDoc
      ? Date.now() - new Date(statusDoc.lastHeartbeat).getTime() < 15 * 60 * 1000
      : false;

    return { connected, messagesSentToday, leadsScrapedToday };
  } catch {
    return { connected: false, messagesSentToday: 0, leadsScrapedToday: 0 };
  }
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-2">{title}</h3>
      <p className="text-3xl font-semibold text-text-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [
    { outreachCount, pipelineCount },
    { summary: health, problems },
    { mrr, activeCount },
    { followUpsToday, callsToday },
    activities,
    openClawStats,
  ] = await Promise.all([
    getLeadCounts(),
    getSiteHealthSummary(),
    getMrrAndActiveClients(),
    getNeedsAttention(),
    getRecentActivity(),
    getOpenClawStats(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(mrr)}
          subtitle={`${activeCount} active client${activeCount !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Active Clients"
          value={activeCount}
        />
        <StatCard
          title="Leads in Pipeline"
          value={pipelineCount}
          subtitle="Contacted and actively in sales process"
        />
        <StatCard
          title="Outreach Queue"
          value={outreachCount}
          subtitle={outreachCount > 0 ? `${outreachCount} leads ready to contact` : "Queue is empty"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Needs Attention</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-secondary">
              <span className="text-sm text-text-secondary">Follow-ups due today</span>
              <span className={`text-sm font-medium ${followUpsToday > 0 ? "text-warning" : "text-text-primary"}`}>
                {followUpsToday}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">Scheduled calls today</span>
              <span className={`text-sm font-medium ${callsToday > 0 ? "text-accent" : "text-text-primary"}`}>
                {callsToday}
              </span>
            </div>
          </div>
        </div>

        <Link href="/openclaw" className="block">
          <div className="rounded-2xl border border-border bg-surface-secondary p-6 hover:border-accent/30 transition-colors">
            <h3 className="text-sm font-medium text-text-secondary mb-4">OpenClaw Status</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${openClawStats.connected ? "bg-success" : "bg-text-tertiary"}`} />
              <span className={`text-sm ${openClawStats.connected ? "text-success" : "text-text-tertiary"}`}>
                {openClawStats.connected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Messages sent today</span>
                <span className="text-sm font-medium text-text-primary">{openClawStats.messagesSentToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Leads scraped today</span>
                <span className="text-sm font-medium text-text-primary">{openClawStats.leadsScrapedToday}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Site Health card */}
      <Link href="/site-health" className="block">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6 hover:border-accent/30 transition-colors">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Site Health</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm text-text-primary">{health.healthy}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-sm text-text-primary">{health.degraded}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-sm text-text-primary">{health.down}</span>
            </div>
            <span className="text-xs text-text-tertiary">of {health.total} monitored</span>
          </div>
          {problems.length > 0 ? (
            <div className="space-y-1.5">
              {problems.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.status === "down" ? "bg-danger" : "bg-warning"}`} />
                  <span className="text-sm text-text-secondary">{p.name}</span>
                  <span className={`text-xs ${p.status === "down" ? "text-danger" : "text-warning"}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">All sites healthy</p>
          )}
        </div>
      </Link>

      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={String(a._id)} className="flex items-start justify-between gap-4 py-1.5">
                <span className="text-sm text-text-primary">{a.description}</span>
                <span className="text-xs text-text-tertiary whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No recent activity</p>
        )}
      </div>
    </div>
  );
}
