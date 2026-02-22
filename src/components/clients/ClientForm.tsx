/*
 * Shared client create/edit form.
 * Two-column grid on md+, single column on mobile.
 * Supports pre-fill from lead conversion via leadData prop.
 * Includes inline delete confirmation for edit mode.
 */
"use client";

import { useState, useEffect, type FormEvent } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import {
  PLAN_TIER_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/lib/client-utils";
import type { ClientFormData } from "@/lib/client-types";

export type { ClientFormData } from "@/lib/client-types";

interface ClientFormProps {
  initialData?: Record<string, unknown>;
  leadData?: {
    name?: string;
    businessName?: string;
    phone?: string;
    email?: string;
    industry?: string;
    leadId?: string;
  };
  onSubmit: (data: ClientFormData & { leadId?: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  loading?: boolean;
  stripeManaged?: boolean;
}

const EMPTY_FORM: ClientFormData = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  industry: "",
  planTier: "",
  ppcClient: false,
  ppcManagementFee: "",
  ppcAdSpend: "",
  monthlyRevenue: "",
  setupFeeAmount: "",
  startDate: "",
  nextBillingDate: "",
  projectStatus: "Awaiting Design",
  websiteUrl: "",
  contactFormEndpoint: "",
  domainInfo: "",
  notes: "",
};

function toDateInputValue(val?: string | Date | null): string {
  if (!val) return "";
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(val as string);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ClientForm({
  initialData,
  leadData,
  onSubmit,
  onCancel,
  onDelete,
  loading,
  stripeManaged,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>(() => {
    const base = { ...EMPTY_FORM };

    if (leadData) {
      if (leadData.name) base.name = leadData.name;
      if (leadData.businessName) base.businessName = leadData.businessName;
      if (leadData.phone) base.phone = leadData.phone;
      if (leadData.email) base.email = leadData.email;
      if (leadData.industry) base.industry = leadData.industry;
    }

    if (initialData) {
      for (const key of Object.keys(base) as (keyof ClientFormData)[]) {
        const val = initialData[key];
        if (val !== undefined && val !== null) {
          if (key === "ppcClient") {
            base.ppcClient = Boolean(val);
          } else {
            (base as Record<string, string | boolean>)[key] = String(val);
          }
        }
      }
      base.startDate = toDateInputValue(initialData.startDate as string | undefined);
      base.nextBillingDate = toDateInputValue(initialData.nextBillingDate as string | undefined);
    }
    return base;
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [industries, setIndustries] = useState<string[]>([]);
  const [creatingIndustry, setCreatingIndustry] = useState(false);
  const [newIndustryName, setNewIndustryName] = useState("");

  useEffect(() => {
    fetch("/api/industries")
      .then((r) => r.json())
      .then((data) => setIndustries(data))
      .catch(() => {});
  }, []);

  function update<K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ClientFormData, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.businessName.trim()) next.businessName = "Business name is required";
    if (!form.planTier) next.planTier = "Plan tier is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: ClientFormData & { leadId?: string } = { ...form };
    if (leadData?.leadId) payload.leadId = leadData.leadId;
    onSubmit(payload);
  }

  const planTierWithPlaceholder = [
    { value: "", label: "Select plan..." },
    ...PLAN_TIER_OPTIONS,
  ];

  const industryOptions = [
    { value: "", label: "Select industry..." },
    ...industries.map((i) => ({ value: i, label: i })),
    { value: "__create__", label: "+ Create new..." },
  ];

  async function handleCreateIndustry() {
    if (!newIndustryName.trim()) return;
    try {
      const res = await fetch("/api/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newIndustryName.trim() }),
      });
      if (res.ok || res.status === 409) {
        const name = newIndustryName.trim();
        update("industry", name);
        if (!industries.includes(name)) {
          setIndustries((prev) => [...prev.filter((i) => i !== "Other"), name, "Other"]);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setCreatingIndustry(false);
      setNewIndustryName("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Business Name"
          value={form.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          error={errors.businessName}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label={stripeManaged ? "Plan Tier (from Stripe)" : "Plan Tier"}
          options={planTierWithPlaceholder}
          value={form.planTier}
          onChange={(v) => update("planTier", v)}
          error={errors.planTier}
          disabled={stripeManaged}
        />
        <Select
          label="Project Status"
          options={PROJECT_STATUS_OPTIONS}
          value={form.projectStatus}
          onChange={(v) => update("projectStatus", v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {creatingIndustry ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">New Industry</label>
            <div className="flex gap-2">
              <Input
                value={newIndustryName}
                onChange={(e) => setNewIndustryName(e.target.value)}
                placeholder="Industry name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleCreateIndustry(); }
                  if (e.key === "Escape") { setCreatingIndustry(false); setNewIndustryName(""); }
                }}
                autoFocus
              />
              <Button type="button" size="sm" onClick={handleCreateIndustry}>Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setCreatingIndustry(false); setNewIndustryName(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Select
            label="Industry"
            options={industryOptions}
            value={form.industry}
            onChange={(v) => {
              if (v === "__create__") {
                setCreatingIndustry(true);
              } else {
                update("industry", v);
              }
            }}
          />
        )}
        <Input
          label="Website URL"
          value={form.websiteUrl}
          onChange={(e) => update("websiteUrl", e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <Input
        label="Contact Form Endpoint"
        value={form.contactFormEndpoint}
        onChange={(e) => update("contactFormEndpoint", e.target.value)}
        placeholder="https://example.com/api/contact"
      />

      {/* PPC toggle + conditional fields */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ppcClient}
            onChange={(e) => update("ppcClient", e.target.checked)}
            className="w-4 h-4 rounded border-border text-accent cursor-pointer"
          />
          <span className="text-sm font-medium text-text-primary">PPC Client</span>
        </label>

        {form.ppcClient && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="PPC Management Fee"
              type="number"
              value={form.ppcManagementFee}
              onChange={(e) => update("ppcManagementFee", e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="PPC Ad Spend"
              type="number"
              value={form.ppcAdSpend}
              onChange={(e) => update("ppcAdSpend", e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={stripeManaged ? "Monthly Revenue (from Stripe)" : "Monthly Revenue"}
          type="number"
          value={form.monthlyRevenue}
          onChange={(e) => update("monthlyRevenue", e.target.value)}
          placeholder="0.00"
          disabled={stripeManaged}
        />
        <Input
          label={stripeManaged ? "Setup Fee (from Stripe)" : "Setup Fee"}
          type="number"
          value={form.setupFeeAmount}
          onChange={(e) => update("setupFeeAmount", e.target.value)}
          placeholder="0.00"
          disabled={stripeManaged}
        />
      </div>

      <Input
        label="Domain Info"
        value={form.domainInfo}
        onChange={(e) => update("domainInfo", e.target.value)}
        placeholder="e.g. GoDaddy, Namecheap"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker
          label={stripeManaged ? "Start Date (from Stripe)" : "Start Date"}
          value={form.startDate}
          onChange={(v) => update("startDate", v)}
          disabled={stripeManaged}
        />
        <DatePicker
          label={stripeManaged ? "Next Billing Date (from Stripe)" : "Next Billing Date"}
          value={form.nextBillingDate}
          onChange={(v) => update("nextBillingDate", v)}
          disabled={stripeManaged}
        />
      </div>

      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder="Additional notes..."
        rows={3}
      />

      <div className="flex items-center justify-between pt-2">
        <div>
          {onDelete && !confirmingDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
          {onDelete && confirmingDelete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-danger font-medium">Are you sure?</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onDelete}
                loading={loading}
              >
                Yes, Delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={confirmingDelete}>
            {initialData ? "Save Changes" : "Add Client"}
          </Button>
        </div>
      </div>
    </form>
  );
}
