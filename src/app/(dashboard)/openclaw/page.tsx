/*
 * OpenClaw page — AI employee visibility and control.
 * Live heartbeat status, task queue, message templates, activity feed, cost tracking.
 * Polls heartbeat every 60s to keep status indicator current.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import ActivityFeed from "@/components/openclaw/ActivityFeed";
import TaskQueue from "@/components/openclaw/TaskQueue";
import TemplateManager from "@/components/openclaw/TemplateManager";
import CostTracking from "@/components/openclaw/CostTracking";

interface HeartbeatStatus {
  connected: boolean;
  lastHeartbeat: string | null;
  currentTaskSummary: string | null;
}

interface Summary {
  messagesSentToday: number;
  apiSpendThisMonth: number;
}

export default function OpenClawPage() {
  const [status, setStatus] = useState<HeartbeatStatus>({
    connected: false,
    lastHeartbeat: null,
    currentTaskSummary: null,
  });
  const [summary, setSummary] = useState<Summary>({
    messagesSentToday: 0,
    apiSpendThisMonth: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/openclaw/heartbeat").then((r) => r.json()),
      fetch("/api/openclaw/summary").then((r) => r.json()),
    ])
      .then(([heartbeatData, summaryData]) => {
        setStatus(heartbeatData);
        setSummary({
          messagesSentToday: summaryData.messagesSentToday ?? 0,
          apiSpendThisMonth: summaryData.apiSpendThisMonth ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    intervalRef.current = setInterval(() => {
      fetch("/api/openclaw/heartbeat")
        .then((r) => r.json())
        .then((data) => setStatus(data))
        .catch(() => {});
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">OpenClaw</h1>

      {/* Top row — status, messages, spend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`w-2 h-2 rounded-full ${
                status.connected ? "bg-success" : "bg-text-tertiary"
              }`}
            />
            <h3 className="text-sm font-medium text-text-secondary">Status</h3>
          </div>
          <p className="text-lg font-semibold text-text-primary">
            {status.connected ? "Connected" : "Not Connected"}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {status.currentTaskSummary
              ? status.currentTaskSummary
              : status.connected
                ? "Idle"
                : "Awaiting heartbeat"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Messages Sent
          </h3>
          <p className="text-3xl font-semibold text-text-primary">
            {loaded ? summary.messagesSentToday : "--"}
          </p>
          <p className="text-xs text-text-tertiary mt-1">Today</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            API Spend
          </h3>
          <p className="text-3xl font-semibold text-text-primary">
            {loaded ? formatCurrency(summary.apiSpendThisMonth) : "$0.00"}
          </p>
          <p className="text-xs text-text-tertiary mt-1">This month</p>
        </div>
      </div>

      {/* Middle row — activity feed + task queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed />
        <TaskQueue />
      </div>

      {/* Message templates */}
      <TemplateManager />

      {/* Cost tracking */}
      <CostTracking />
    </div>
  );
}
