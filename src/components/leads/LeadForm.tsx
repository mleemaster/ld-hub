/*
 * Shared lead create/edit form.
 * Two-column grid on md+, single column on mobile.
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
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  STATE_OPTIONS,
} from "@/lib/lead-utils";

export interface LeadFormData {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  source: string;
  callScheduledDate: string;
  followUpDate: string;
  lastContactedDate: string;
  industry: string;
  state: string;
  notes: string;
}

interface LeadFormProps {
  initialData?: Partial<LeadFormData>;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  loading?: boolean;
}

const EMPTY_FORM: LeadFormData = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  website: "",
  status: "New",
  source: "",
  callScheduledDate: "",
  followUpDate: "",
  lastContactedDate: "",
  industry: "",
  state: "",
  notes: "",
};

function toDateInputValue(val?: string | Date | null): string {
  if (!val) return "";
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LeadForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  loading,
}: LeadFormProps) {
  const [form, setForm] = useState<LeadFormData>(() => {
    const base = { ...EMPTY_FORM };
    if (initialData) {
      for (const key of Object.keys(base) as (keyof LeadFormData)[]) {
        const val = initialData[key];
        if (val !== undefined && val !== null) base[key] = String(val);
      }
    }
    base.callScheduledDate = toDateInputValue(initialData?.callScheduledDate);
    base.followUpDate = toDateInputValue(initialData?.followUpDate);
    base.lastContactedDate = toDateInputValue(initialData?.lastContactedDate);
    return base;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({});
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

  function update(field: keyof LeadFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof LeadFormData, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.source) next.source = "Source is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(form);
  }

  const sourceOptionsWithPlaceholder = [
    { value: "", label: "Select source..." },
    ...SOURCE_OPTIONS,
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

      <Input
        label="Website"
        value={form.website}
        onChange={(e) => update("website", e.target.value)}
        placeholder="https://example.com"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(v) => update("status", v)}
        />
        <Select
          label="Source"
          options={sourceOptionsWithPlaceholder}
          value={form.source}
          onChange={(v) => update("source", v)}
          error={errors.source}
        />
      </div>

      {form.status === "Call Scheduled" && (
        <DatePicker
          label="Call Scheduled Date"
          value={form.callScheduledDate}
          onChange={(v) => update("callScheduledDate", v)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker
          label="Follow-Up Date"
          value={form.followUpDate}
          onChange={(v) => update("followUpDate", v)}
        />
        <DatePicker
          label="Last Contacted"
          value={form.lastContactedDate}
          onChange={(v) => update("lastContactedDate", v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="State"
          options={[{ value: "", label: "Select state..." }, ...STATE_OPTIONS]}
          value={form.state}
          onChange={(v) => update("state", v)}
        />
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
            {initialData ? "Save Changes" : "Add Lead"}
          </Button>
        </div>
      </div>
    </form>
  );
}
