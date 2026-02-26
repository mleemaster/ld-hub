/*
 * Lead detail panel rendered inside the SlideOver.
 * Three sections: read-only info with status control,
 * toggleable edit form, and activity timeline.
 * Includes click-to-call and click-to-text quick actions.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LeadForm, { type LeadFormData } from "@/components/leads/LeadForm";
import { STATUS_OPTIONS } from "@/lib/lead-utils";
import type { Lead, ActivityRecord } from "@/lib/lead-types";
import DatePicker from "@/components/ui/DatePicker";
import { cn, parseLocalDate } from "@/lib/utils";

interface TemplateOption {
  _id: string;
  name: string;
  active: boolean;
}

interface LeadDetailPanelProps {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onToggleHot?: (leadId: string, isHot: boolean) => void;
  onTemplateChange?: (leadId: string, templateId: string, templateName: string) => void;
  onCallScheduledDateChange?: (leadId: string, date: string) => void;
  onUpdate: (data: LeadFormData) => void;
  onDelete: () => void;
  onConvertToClient?: () => void;
  onSendPaymentLink?: () => void;
  submitting: boolean;
  initialEditing?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  if (!d) return "—";
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeMatch = String(dateStr).match(/T(\d{2}):(\d{2})/);
  if (!timeMatch) return datePart;
  const hour = +timeMatch[1];
  const minute = +timeMatch[2];
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${datePart} at ${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

const ACTIVITY_ICONS: Record<string, string> = {
  lead_created: "text-success",
  lead_status_changed: "text-accent",
  lead_contacted: "text-warning",
};

export default function LeadDetailPanel({
  lead,
  onStatusChange,
  onToggleHot,
  onTemplateChange,
  onCallScheduledDateChange,
  onUpdate,
  onDelete,
  onConvertToClient,
  onSendPaymentLink,
  submitting,
  initialEditing = false,
}: LeadDetailPanelProps) {
  const [editing, setEditing] = useState(initialEditing);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing, lead._id]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(
        `/api/activity?relatedEntityType=lead&relatedEntityId=${lead._id}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingActivities(false);
    }
  }, [lead._id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (lead.status === "New" || !onTemplateChange) return;
    fetch("/api/openclaw/templates")
      .then((r) => r.json())
      .then((data) => {
        const active = (Array.isArray(data) ? data : []).filter((t: TemplateOption) => t.active);
        setTemplateOptions(active);
      })
      .catch(() => {});
  }, [lead.status, onTemplateChange]);

  function handleTemplateSelect(templateId: string) {
    if (!onTemplateChange) return;
    if (!templateId) {
      onTemplateChange(lead._id, "", "");
      return;
    }
    const tpl = templateOptions.find((t) => t._id === templateId);
    if (tpl) onTemplateChange(lead._id, tpl._id, tpl.name);
  }

  function handleStatusChange(newStatus: string) {
    onStatusChange(lead._id, newStatus);
    setTimeout(fetchActivities, 500);
  }

  function handleUpdate(data: LeadFormData) {
    onUpdate(data);
    setEditing(false);
    setTimeout(fetchActivities, 500);
  }

  if (editing) {
    return (
      <LeadForm
        initialData={lead}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(false)}
        onDelete={onDelete}
        loading={submitting}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Status control */}
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={lead.status}
        onChange={(v) => handleStatusChange(v)}
      />

      {/* Hot lead toggle — only for Warm / Call Scheduled */}
      {onToggleHot && (lead.status === "Warm" || lead.status === "Call Scheduled") && (
        <button
          type="button"
          onClick={() => onToggleHot(lead._id, !lead.isHot)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer",
            lead.isHot
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-border bg-surface-secondary text-text-secondary hover:text-text-primary"
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                lead.isHot ? "bg-red-500 animate-pulse" : "bg-text-tertiary"
              )}
            />
            Hot Lead
          </span>
          <span className="text-xs">{lead.isHot ? "ON" : "OFF"}</span>
        </button>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Phone with quick actions */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Phone
          </dt>
          <dd className="text-sm text-text-primary mt-0.5 flex items-center gap-1.5">
            {lead.phone ? (
              <>
                <span>{lead.phone}</span>
                <a
                  href={`tel:${lead.phone}`}
                  title="Call"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-accent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </a>
                <a
                  href={`sms:${lead.phone}`}
                  title="Text"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-accent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </a>
              </>
            ) : (
              <span>—</span>
            )}
          </dd>
        </div>

        {/* Email */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Email</dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="hover:text-accent transition-colors">
                {lead.email}
              </a>
            ) : "—"}
          </dd>
        </div>

        {/* Website */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Website</dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors truncate block">
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            ) : "—"}
          </dd>
        </div>

        {/* Source */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Source</dt>
          <dd className="text-sm text-text-primary mt-0.5">{lead.source || "—"}</dd>
        </div>

        {/* Template (only for contacted leads) */}
        {lead.status !== "New" && (
          <div>
            {onTemplateChange && templateOptions.length > 0 ? (
              <Select
                label="Template"
                options={[
                  { value: "", label: "None" },
                  ...templateOptions.map((t) => ({ value: t._id, label: t.name })),
                ]}
                value={lead.outreachTemplateId || ""}
                onChange={handleTemplateSelect}
              />
            ) : (
              <>
                <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Template</dt>
                <dd className="text-sm text-text-primary mt-0.5">{lead.outreachTemplateName || "—"}</dd>
              </>
            )}
          </div>
        )}

        {/* Industry */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Industry</dt>
          <dd className="text-sm text-text-primary mt-0.5">{lead.industry || "—"}</dd>
        </div>

        {/* State */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">State</dt>
          <dd className="text-sm text-text-primary mt-0.5">{lead.state || "—"}</dd>
        </div>

        {/* Follow-Up */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Follow-Up</dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(lead.followUpDate)}</dd>
        </div>

        {/* Last Contacted */}
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Last Contacted</dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(lead.lastContactedDate)}</dd>
        </div>

        {/* Call Scheduled (conditional) */}
        {lead.status === "Call Scheduled" && (
          <div className="col-span-2">
            <DatePicker
              label="Call Scheduled"
              value={lead.callScheduledDate || ""}
              onChange={(val) => {
                if (onCallScheduledDateChange) onCallScheduledDateChange(lead._id, val);
              }}
              showTime
            />
          </div>
        )}
      </div>

      {/* Notes */}
      {lead.notes && (
        <div>
          <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
            Notes
          </h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary rounded-xl p-3 border border-border">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <Button variant="secondary" onClick={() => setEditing(true)} className="w-full">
          Edit Lead
        </Button>
        {onConvertToClient && (
          <Button variant="primary" onClick={onConvertToClient} className="w-full">
            Convert to Client
          </Button>
        )}
        {onSendPaymentLink && (
          <Button variant="secondary" onClick={onSendPaymentLink} className="w-full">
            Send Payment Link
          </Button>
        )}
      </div>

      {/* Activity timeline */}
      <div>
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Activity
        </h3>
        {loadingActivities ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">No activity yet</p>
        ) : (
          <div className="relative border-l-2 border-border-secondary ml-2">
            {activities.map((activity) => (
              <div key={activity._id} className="relative pl-5 pb-4 last:pb-0">
                <div
                  className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                    ACTIVITY_ICONS[activity.type] || "bg-surface-tertiary"
                  } bg-current`}
                />
                <p className="text-sm text-text-primary">{activity.description}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{timeAgo(activity.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
