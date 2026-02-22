/*
 * Client detail panel rendered inside the SlideOver.
 * Read-only info with status control, collapsible intake form,
 * toggleable edit form, and activity timeline.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ClientForm from "@/components/clients/ClientForm";
import { PROJECT_STATUS_OPTIONS } from "@/lib/client-utils";
import type { Client, ClientFormData, IntakeForm } from "@/lib/client-types";
import type { ActivityRecord } from "@/lib/lead-types";
import { parseLocalDate, formatCurrency } from "@/lib/utils";

interface ClientDetailPanelProps {
  client: Client;
  onStatusChange: (clientId: string, newStatus: string) => void;
  onUpdate: (data: ClientFormData) => void;
  onDelete: () => void;
  submitting: boolean;
  initialEditing?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const d = parseLocalDate(dateStr);
  if (!d) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

function StripeIndicator() {
  return (
    <span className="text-[10px] font-medium text-accent/70 ml-1">STRIPE</span>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  client_created: "text-success",
  client_status_changed: "text-accent",
  client_updated: "text-warning",
};

function IntakeFormField({ label, value }: { label: string; value?: string | string[] }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div>
      <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-text-primary mt-0.5">{display}</dd>
    </div>
  );
}

function hasIntakeData(form?: IntakeForm): boolean {
  if (!form) return false;
  return Object.values(form).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  });
}

function IntakeFormSection({ intakeForm }: { intakeForm: IntakeForm }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <IntakeFormField label="Business Name" value={intakeForm.businessName} />
      <IntakeFormField label="Contact Name" value={intakeForm.primaryContactName} />
      <IntakeFormField label="Email" value={intakeForm.email} />
      <IntakeFormField label="Phone" value={intakeForm.phone} />
      <IntakeFormField label="Address" value={intakeForm.address} />
      <IntakeFormField label="Plan Chosen" value={intakeForm.planChosen} />
      <div className="col-span-2">
        <IntakeFormField label="Business Description" value={intakeForm.businessDescription} />
      </div>
      <div className="col-span-2">
        <IntakeFormField label="Services Offered" value={intakeForm.servicesOffered} />
      </div>
      <IntakeFormField label="Domain Preference" value={intakeForm.domainPreference} />
      <IntakeFormField label="Domain Backup 1" value={intakeForm.domainBackup1} />
      <IntakeFormField label="Domain Backup 2" value={intakeForm.domainBackup2} />
      <IntakeFormField label="Logo URL" value={intakeForm.logoUrl} />
      <IntakeFormField label="Branded Content" value={intakeForm.brandedContentUrls} />
      <IntakeFormField label="Social Links" value={intakeForm.socialLinks} />
      <div className="col-span-2">
        <IntakeFormField label="Website Examples" value={intakeForm.websiteExamples} />
      </div>
      <div className="col-span-2">
        <IntakeFormField label="Style Requests" value={intakeForm.styleRequests} />
      </div>
      <IntakeFormField label="Call to Action" value={intakeForm.callToAction} />
      <IntakeFormField label="Service Area" value={intakeForm.serviceArea} />
      <IntakeFormField label="Tagline" value={intakeForm.tagline} />
    </div>
  );
}

export default function ClientDetailPanel({
  client,
  onStatusChange,
  onUpdate,
  onDelete,
  submitting,
  initialEditing = false,
}: ClientDetailPanelProps) {
  const [editing, setEditing] = useState(initialEditing);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing, client._id]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(
        `/api/activity?relatedEntityType=client&relatedEntityId=${client._id}&limit=50`
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
  }, [client._id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  function handleStatusChange(newStatus: string) {
    onStatusChange(client._id, newStatus);
    setTimeout(fetchActivities, 500);
  }

  function handleUpdate(data: ClientFormData) {
    onUpdate(data);
    setEditing(false);
    setTimeout(fetchActivities, 500);
  }

  const isStripeManaged = !!client.stripeCustomerId;

  if (editing) {
    return (
      <ClientForm
        initialData={{ ...client }}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(false)}
        onDelete={onDelete}
        loading={submitting}
        stripeManaged={isStripeManaged}
      />
    );
  }

  const showIntake = hasIntakeData(client.intakeForm);

  return (
    <div className="space-y-6">
      {/* Status control */}
      <Select
        label="Project Status"
        options={PROJECT_STATUS_OPTIONS}
        value={client.projectStatus}
        onChange={(v) => handleStatusChange(v)}
      />

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Phone</dt>
          <dd className="text-sm text-text-primary mt-0.5 flex items-center gap-1.5">
            {client.phone ? (
              <>
                <span>{client.phone}</span>
                <a
                  href={`tel:${client.phone}`}
                  title="Call"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-accent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </a>
                <a
                  href={`sms:${client.phone}`}
                  title="Text"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-accent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </a>
              </>
            ) : (
              <span>{"\u2014"}</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Email</dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {client.email ? (
              <a href={`mailto:${client.email}`} className="hover:text-accent transition-colors">
                {client.email}
              </a>
            ) : "\u2014"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Industry</dt>
          <dd className="text-sm text-text-primary mt-0.5">{client.industry || "\u2014"}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Plan Tier{isStripeManaged && <StripeIndicator />}
          </dt>
          <dd className="text-sm text-text-primary mt-0.5">{client.planTier}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Website</dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {client.websiteUrl ? (
              <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors truncate block">
                {client.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : "\u2014"}
          </dd>
        </div>

        {client.websiteUrl && client.currentHealthStatus && (
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Site Health</dt>
            <dd className="text-sm text-text-primary mt-0.5 flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  client.currentHealthStatus === "healthy"
                    ? "bg-success"
                    : client.currentHealthStatus === "degraded"
                      ? "bg-warning"
                      : "bg-danger"
                }`}
              />
              {client.currentHealthStatus.charAt(0).toUpperCase() + client.currentHealthStatus.slice(1)}
            </dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Domain Info</dt>
          <dd className="text-sm text-text-primary mt-0.5">{client.domainInfo || "\u2014"}</dd>
        </div>

        {client.ppcClient && (
          <>
            <div>
              <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">PPC Mgmt Fee</dt>
              <dd className="text-sm text-text-primary mt-0.5">
                {client.ppcManagementFee != null ? formatCurrency(client.ppcManagementFee) : "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">PPC Ad Spend</dt>
              <dd className="text-sm text-text-primary mt-0.5">
                {client.ppcAdSpend != null ? formatCurrency(client.ppcAdSpend) : "\u2014"}
              </dd>
            </div>
          </>
        )}

        {!client.ppcClient && (
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">PPC Client</dt>
            <dd className="text-sm text-text-primary mt-0.5">
              <Badge variant="neutral">No</Badge>
            </dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Revenue{isStripeManaged && <StripeIndicator />}
          </dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {client.monthlyRevenue != null ? formatCurrency(client.monthlyRevenue) : "\u2014"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Setup Fee{isStripeManaged && <StripeIndicator />}
          </dt>
          <dd className="text-sm text-text-primary mt-0.5">
            {client.setupFeeAmount != null ? formatCurrency(client.setupFeeAmount) : "\u2014"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Start Date{isStripeManaged && <StripeIndicator />}
          </dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(client.startDate)}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Next Billing{isStripeManaged && <StripeIndicator />}
          </dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(client.nextBillingDate)}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Created</dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(client.createdAt)}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Updated</dt>
          <dd className="text-sm text-text-primary mt-0.5">{formatDate(client.updatedAt)}</dd>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div>
          <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
            Notes
          </h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary rounded-xl p-3 border border-border">
            {client.notes}
          </p>
        </div>
      )}

      {/* Collapsible intake form */}
      {showIntake && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIntakeOpen(!intakeOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            <span>Intake Form</span>
            <svg
              className={`w-4 h-4 text-text-tertiary transition-transform ${intakeOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {intakeOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-border">
              <IntakeFormSection intakeForm={client.intakeForm!} />
            </div>
          )}
        </div>
      )}

      {/* Edit button */}
      <Button variant="secondary" onClick={() => setEditing(true)} className="w-full">
        Edit Client
      </Button>

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
