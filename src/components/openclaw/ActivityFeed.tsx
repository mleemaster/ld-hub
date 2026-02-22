/*
 * OpenClaw activity feed — paginated list of OpenClawActivity entries.
 * Displays icon by type, details text, and relative timestamps.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";

interface Activity {
  _id: string;
  type: string;
  details: string;
  cost?: number;
  createdAt: string;
}

function activityIcon(type: string): string {
  switch (type) {
    case "lead_scraped":
      return "🔍";
    case "message_sent":
      return "📤";
    case "follow_up_sent":
      return "🔁";
    case "lead_added":
      return "➕";
    case "error":
      return "⚠️";
    default:
      return "📋";
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PAGE_SIZE = 20;

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    try {
      const res = await fetch(
        `/api/openclaw/activity?limit=${PAGE_SIZE}&offset=${offset}`
      );
      const data = await res.json();
      if (append) {
        setActivities((prev) => [...prev, ...(data.activities || [])]);
      } else {
        setActivities(data.activities || []);
      }
      setTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  function handleLoadMore() {
    setLoadingMore(true);
    fetchActivities(activities.length, true);
  }

  const hasMore = activities.length < total;

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-4">
        Activity Feed
      </h3>

      {loading ? (
        <p className="text-sm text-text-tertiary">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-text-tertiary">No activity recorded yet</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 py-2"
            >
              <span className="text-sm shrink-0 mt-0.5">
                {activityIcon(activity.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{activity.details}</p>
              </div>
              <span className="text-xs text-text-tertiary whitespace-nowrap shrink-0">
                {timeAgo(activity.createdAt)}
              </span>
            </div>
          ))}

          {hasMore && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
