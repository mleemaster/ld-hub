/*
 * Dashboard — daily action plan.
 * Answers "What should I do right now?" with a hit list of follow-ups,
 * scheduled calls, and new leads, plus compact stats and activity.
 */
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client, type IClient } from "@/models/Client";
import { Activity } from "@/models/Activity";
import { formatCurrency } from "@/lib/utils";
import { startOfDayET, endOfDayET } from "@/lib/date-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getFollowUpsDue() {
  try {
    await connectDB();
    const now = new Date();
    return Lead.find({
      nextFollowUpDate: { $lte: endOfDayET() },
      status: { $nin: ["New", "Closed Won", "Closed Lost", "Rejected"] },
    })
      .select("businessName industry lastContactedDate nextFollowUpDate phone")
      .sort({ nextFollowUpDate: 1 })
      .limit(15)
      .lean()
      .then((leads) =>
        leads.map((l) => ({
          _id: String(l._id),
          businessName: l.businessName || "Unknown",
          industry: l.industry || "",
          lastContactedDate: l.lastContactedDate?.toISOString(),
          phone: l.phone,
          daysOverdue: Math.max(
            0,
            Math.floor((now.getTime() - new Date(l.nextFollowUpDate!).getTime()) / 86400000)
          ),
        }))
      );
  } catch {
    return [];
  }
}

async function getCallsToday() {
  try {
    await connectDB();
    const start = startOfDayET();
    const end = endOfDayET();
    return Lead.find({
      callScheduledDate: { $gte: start, $lte: end },
      status: "Call Scheduled",
    })
      .select("businessName phone callScheduledDate")
      .sort({ callScheduledDate: 1 })
      .lean()
      .then((leads) =>
        leads.map((l) => ({
          _id: String(l._id),
          businessName: l.businessName || "Unknown",
          phone: l.phone,
          callScheduledDate: l.callScheduledDate?.toISOString(),
        }))
      );
  } catch {
    return [];
  }
}

async function getQuickStats() {
  try {
    await connectDB();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [clients, newLeadCount, pipelineCount, outreachThisWeek, contactedLast30, repliedLast30] =
      await Promise.all([
        Client.find({}).lean<IClient[]>(),
        Lead.countDocuments({ status: "New" }),
        Lead.countDocuments({
          status: { $nin: ["New", "No Response", "Closed Won", "Closed Lost"] },
        }),
        Lead.countDocuments({ lastContactedDate: { $gte: sevenDaysAgo } }),
        Lead.countDocuments({
          lastContactedDate: { $gte: thirtyDaysAgo },
        }),
        Lead.countDocuments({
          lastContactedDate: { $gte: thirtyDaysAgo },
          status: { $in: ["Warm", "Call Scheduled", "Closed Won"] },
        }),
      ]);

    const activeClients = clients.filter(
      (c) => c.projectStatus !== "Deployed Canceled"
    );
    let mrr = 0;
    for (const c of activeClients) {
      if (c.monthlyRevenue) mrr += c.monthlyRevenue;
      if (c.ppcClient && c.ppcManagementFee) mrr += c.ppcManagementFee;
      if (c.addOnRevenue) mrr += c.addOnRevenue;
    }

    const responseRate =
      contactedLast30 > 0
        ? Math.round((repliedLast30 / contactedLast30) * 100)
        : 0;

    return {
      mrr,
      activeCount: activeClients.length,
      pipelineCount,
      newLeadCount,
      responseRate,
      outreachThisWeek,
    };
  } catch {
    return {
      mrr: 0,
      activeCount: 0,
      pipelineCount: 0,
      newLeadCount: 0,
      responseRate: 0,
      outreachThisWeek: 0,
    };
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
      else if (s === "degraded") {
        summary.degraded++;
        problems.push({ name: c.businessName, status: s });
      } else if (s === "down") {
        summary.down++;
        problems.push({ name: c.businessName, status: s });
      }
    }

    return { summary, problems };
  } catch {
    return {
      summary: { total: 0, healthy: 0, degraded: 0, down: 0 },
      problems: [],
    };
  }
}

async function getRecentActivity() {
  try {
    await connectDB();
    const activities = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(8)
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

export default async function DashboardPage() {
  const [followUps, calls, stats, { summary: health, problems }, activities] =
    await Promise.all([
      getFollowUpsDue(),
      getCallsToday(),
      getQuickStats(),
      getSiteHealthSummary(),
      getRecentActivity(),
    ]);

  const hitListEmpty =
    followUps.length === 0 && calls.length === 0 && stats.newLeadCount === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>

      {/* ── Today's Hit List ──────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <h2 className="text-sm font-medium text-text-secondary mb-4">
          Today&apos;s Hit List
        </h2>

        {hitListEmpty ? (
          <div className="text-center py-8">
            <p className="text-lg font-medium text-text-primary">
              You&apos;re all caught up
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              No follow-ups, calls, or new leads waiting
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Follow-ups due */}
            <div>
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                Follow-ups Due{" "}
                {followUps.length > 0 && (
                  <span className="text-warning">({followUps.length})</span>
                )}
              </h3>
              {followUps.length > 0 ? (
                <div className="space-y-2">
                  {followUps.map((lead) => (
                    <Link
                      key={lead._id}
                      href={`/leads?detail=${lead._id}`}
                      className="block rounded-lg border border-border-secondary bg-surface p-3 hover:border-accent/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {lead.businessName}
                        </span>
                        {lead.daysOverdue > 0 && (
                          <span className="text-xs font-medium text-danger ml-2 whitespace-nowrap">
                            {lead.daysOverdue}d overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {lead.industry && (
                          <span className="text-xs text-text-tertiary">
                            {lead.industry}
                          </span>
                        )}
                        {lead.lastContactedDate && (
                          <span className="text-xs text-text-tertiary">
                            Last:{" "}
                            {new Date(lead.lastContactedDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">None due</p>
              )}
            </div>

            {/* Calls scheduled today */}
            <div>
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                Calls Today{" "}
                {calls.length > 0 && (
                  <span className="text-accent">({calls.length})</span>
                )}
              </h3>
              {calls.length > 0 ? (
                <div className="space-y-2">
                  {calls.map((lead) => (
                    <div
                      key={lead._id}
                      className="rounded-lg border border-border-secondary bg-surface p-3"
                    >
                      <span className="text-sm font-medium text-text-primary">
                        {lead.businessName}
                      </span>
                      {lead.phone && (
                        <div className="mt-1">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-xs text-accent hover:underline"
                          >
                            {lead.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">No calls scheduled</p>
              )}
            </div>

            {/* New leads queue */}
            <div>
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                New Leads in Queue
              </h3>
              {stats.newLeadCount > 0 ? (
                <Link
                  href="/leads?tab=queue"
                  className="flex items-center justify-between rounded-lg border border-border-secondary bg-surface p-4 hover:border-accent/30 transition-colors"
                >
                  <div>
                    <span className="text-2xl font-semibold text-text-primary">
                      {stats.newLeadCount}
                    </span>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      ready to contact
                    </p>
                  </div>
                  <span className="text-sm text-accent font-medium">
                    Work Queue →
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-text-tertiary">Queue is empty</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-text-tertiary">MRR</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {formatCurrency(stats.mrr)}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {stats.activeCount} active client{stats.activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-text-tertiary">Pipeline</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {stats.pipelineCount}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">active leads</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-text-tertiary">Response Rate</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {stats.responseRate}%
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">rolling 30 days</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-text-tertiary">Outreach This Week</p>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {stats.outreachThisWeek}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">leads contacted</p>
        </div>
      </div>

      {/* ── Bottom Section: Activity + Site Health ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">
            Recent Activity
          </h3>
          {activities.length > 0 ? (
            <div className="space-y-2.5">
              {activities.map((a) => (
                <div
                  key={a._id}
                  className="flex items-start justify-between gap-4 py-1"
                >
                  <span className="text-sm text-text-primary leading-snug">
                    {a.description}
                  </span>
                  <span className="text-xs text-text-tertiary whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No recent activity</p>
          )}
        </div>

        {/* Site Health */}
        {health.total > 0 && (
          <Link href="/site-health" className="block">
            <div className="rounded-2xl border border-border bg-surface-secondary p-6 hover:border-accent/30 transition-colors h-full">
              <h3 className="text-sm font-medium text-text-secondary mb-3">
                Site Health
              </h3>
              {problems.length === 0 ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-text-primary">
                    All {health.total} sites healthy
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm text-text-primary">
                        {health.healthy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-warning" />
                      <span className="text-sm text-text-primary">
                        {health.degraded}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-danger" />
                      <span className="text-sm text-text-primary">
                        {health.down}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {problems.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.status === "down" ? "bg-danger" : "bg-warning"
                          }`}
                        />
                        <span className="text-sm text-text-secondary">
                          {p.name}
                        </span>
                        <span
                          className={`text-xs ${
                            p.status === "down"
                              ? "text-danger"
                              : "text-warning"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
