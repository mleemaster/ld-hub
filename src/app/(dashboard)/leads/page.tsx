/*
 * Leads / CRM page.
 * Two top-level tabs: Pipeline (kanban/list) and Outreach Queue.
 * Pipeline: contacted leads in kanban board or list table.
 * Queue: "New" leads awaiting first contact, FIFO order.
 * Slide-over detail panel for viewing/editing leads and activity timeline.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import LeadForm, { type LeadFormData } from "@/components/leads/LeadForm";
import LeadTable from "@/components/leads/LeadTable";
import LeadDetailPanel from "@/components/leads/LeadDetailPanel";
import KanbanBoard from "@/components/leads/KanbanBoard";
import OutreachQueue from "@/components/leads/OutreachQueue";
import SendMessageModal from "@/components/leads/SendMessageModal";
import MarkContactedModal from "@/components/leads/MarkContactedModal";
import LeadImportModal from "@/components/leads/LeadImportModal";
import ClientForm from "@/components/clients/ClientForm";
import type { ClientFormData } from "@/lib/client-types";
import { PLAN_TIER_OPTIONS } from "@/lib/client-utils";
import type { Lead } from "@/lib/lead-types";
import DatePicker from "@/components/ui/DatePicker";
import {
  PIPELINE_STATUS_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
  STATE_FILTER_OPTIONS,
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  searchLeads,
  isNeedingAttention,
} from "@/lib/lead-utils";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", source: "", industry: "" });
  const [activeTab, setActiveTab] = useState<"pipeline" | "queue">("pipeline");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [industryFilterOptions, setIndustryFilterOptions] = useState([{ value: "", label: "All Industries" }]);
  const [messagingLead, setMessagingLead] = useState<Lead | null>(null);
  const [markingContactedLead, setMarkingContactedLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [paymentLinkLead, setPaymentLinkLead] = useState<Lead | null>(null);
  const [paymentLinkPlan, setPaymentLinkPlan] = useState("");
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [paymentLinkResult, setPaymentLinkResult] = useState<string | null>(null);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [templateFilterOptions, setTemplateFilterOptions] = useState<{ value: string; label: string; name: string }[]>([]);
  const [queueStateFilter, setQueueStateFilter] = useState("");
  const [queueSourceFilter, setQueueSourceFilter] = useState("");
  const [queueIndustryFilter, setQueueIndustryFilter] = useState("");
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<
    { matchField: string; matchValue: string; leads: { _id: string; name: string; email?: string; phone?: string; businessName?: string; status: string; source: string }[] }[]
  >([]);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.source) params.set("source", filters.source);
      if (filters.industry) params.set("industry", filters.industry);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        setSelectedLead((prev) => {
          if (!prev) return null;
          const fresh = data.find((l: Lead) => l._id === prev._id);
          return fresh || null;
        });
      }
    } catch {
      // Silent fail — user sees empty state
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => { setSelectedIds(new Set()); setConfirmingBulkDelete(false); }, [activeTab, search]);

  useEffect(() => {
    fetch("/api/industries")
      .then((r) => r.json())
      .then((data: string[]) => {
        setIndustryFilterOptions([
          { value: "", label: "All Industries" },
          ...data.map((i) => ({ value: i, label: i })),
        ]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/openclaw/templates")
      .then((r) => r.json())
      .then((data: { _id: string; name: string; active: boolean }[]) => {
        const active = (Array.isArray(data) ? data : []).filter((t) => t.active);
        setTemplateFilterOptions(
          active.map((t) => ({ value: t._id, label: t.name, name: t.name }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    }
    if (showToolsMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolsMenu]);

  // Split leads by tab
  const allFiltered = searchLeads(leads, search);
  const queueLeads = [...allFiltered]
    .filter((l) => l.status === "New")
    .filter((l) => !queueStateFilter || l.state === queueStateFilter)
    .filter((l) => !queueSourceFilter || l.source === queueSourceFilter)
    .filter((l) => !queueIndustryFilter || l.industry === queueIndustryFilter)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const pipelineLeads = [...allFiltered]
    .filter((l) => l.status !== "New")
    .sort((a, b) => {
      const aHot = a.isHot ? 1 : 0;
      const bHot = b.isHot ? 1 : 0;
      if (bHot !== aHot) return bHot - aHot;
      const aAttention = isNeedingAttention(a) ? 1 : 0;
      const bAttention = isNeedingAttention(b) ? 1 : 0;
      if (bAttention !== aAttention) return bAttention - aAttention;
      const aDate = a.lastContactedDate ? new Date(a.lastContactedDate).getTime() : 0;
      const bDate = b.lastContactedDate ? new Date(b.lastContactedDate).getTime() : 0;
      return bDate - aDate;
    });

  // Counts from unfiltered data for tab badges
  const totalQueue = leads.filter((l) => l.status === "New").length;
  const totalPipeline = leads.filter((l) => l.status !== "New").length;

  async function handleAddLead(data: LeadFormData) {
    setSubmitting(true);
    setAddLeadError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddLeadError(null);
        fetchLeads();
      } else if (res.status === 409) {
        const { error } = await res.json();
        setAddLeadError(error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateLead(data: LeadFormData) {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedLead(updated);
        fetchLeads();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLead() {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    const clearHot = newStatus !== "Warm" && newStatus !== "Call Scheduled";
    const prev = leads.map((l) => ({ ...l }));
    setLeads((current) =>
      current.map((l) => (l._id === leadId ? { ...l, status: newStatus, ...(clearHot && { isHot: false }) } : l))
    );
    setSelectedLead((current) =>
      current && current._id === leadId ? { ...current, status: newStatus, ...(clearHot && { isHot: false }) } : current
    );

    const body: Record<string, unknown> = { status: newStatus };
    if (clearHot) body.isHot = false;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setLeads(prev);
        setSelectedLead((current) => {
          if (!current) return null;
          const reverted = prev.find((l) => l._id === current._id);
          return reverted || current;
        });
      }
    } catch {
      setLeads(prev);
    }
  }

  async function handleToggleHot(leadId: string, isHot: boolean) {
    const prev = leads.map((l) => ({ ...l }));
    setLeads((current) =>
      current.map((l) => (l._id === leadId ? { ...l, isHot } : l))
    );
    setSelectedLead((current) =>
      current && current._id === leadId ? { ...current, isHot } : current
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHot }),
      });
      if (!res.ok) {
        setLeads(prev);
        setSelectedLead((current) => {
          if (!current) return null;
          const reverted = prev.find((l) => l._id === current._id);
          return reverted || current;
        });
      }
    } catch {
      setLeads(prev);
    }
  }

  async function handleMarkContacted(leadId: string, templateId?: string, templateName?: string) {
    const now = new Date().toISOString();
    const prev = leads.map((l) => ({ ...l }));

    setLeads((current) =>
      current.map((l) =>
        l._id === leadId
          ? { ...l, status: "No Response", lastContactedDate: now, outreachTemplateId: templateId, outreachTemplateName: templateName }
          : l
      )
    );

    const body: Record<string, unknown> = { status: "No Response", lastContactedDate: now };
    if (templateId) body.outreachTemplateId = templateId;
    if (templateName) body.outreachTemplateName = templateName;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setLeads(prev);
      } else {
        fetchLeads();
      }
    } catch {
      setLeads(prev);
    }
  }

  async function handleTemplateChange(leadId: string, templateId: string, templateName: string) {
    const prev = leads.map((l) => ({ ...l }));
    setLeads((current) =>
      current.map((l) =>
        l._id === leadId
          ? { ...l, outreachTemplateId: templateId || undefined, outreachTemplateName: templateName || undefined }
          : l
      )
    );
    setSelectedLead((current) =>
      current && current._id === leadId
        ? { ...current, outreachTemplateId: templateId || undefined, outreachTemplateName: templateName || undefined }
        : current
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachTemplateId: templateId || null, outreachTemplateName: templateName || null }),
      });
      if (!res.ok) {
        setLeads(prev);
        setSelectedLead((current) => {
          if (!current) return null;
          const reverted = prev.find((l) => l._id === current._id);
          return reverted || current;
        });
      }
    } catch {
      setLeads(prev);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setLeads((current) => current.filter((l) => !selectedIds.has(l._id)));
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);

    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) fetchLeads();
      else fetchLeads();
    } catch {
      fetchLeads();
    }
  }

  async function handleBulkUpdate(update: Record<string, string>) {
    const ids = [...selectedIds];
    const prev = leads.map((l) => ({ ...l }));
    setLeads((current) =>
      current.map((l) => (selectedIds.has(l._id) ? { ...l, ...update } : l))
    );
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, update }),
      });
      if (!res.ok) {
        setLeads(prev);
      }
      fetchLeads();
    } catch {
      setLeads(prev);
      fetchLeads();
    }
  }

  async function handleConvertToClient(data: ClientFormData & { leadId?: string }) {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (data.monthlyRevenue) payload.monthlyRevenue = parseFloat(data.monthlyRevenue);
      if (data.ppcManagementFee) payload.ppcManagementFee = parseFloat(data.ppcManagementFee);
      if (data.ppcAdSpend) payload.ppcAdSpend = parseFloat(data.ppcAdSpend);
      if (convertingLead?.intakeForm) payload.intakeForm = convertingLead.intakeForm;

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok && convertingLead) {
        await fetch(`/api/leads/${convertingLead._id}`, { method: "DELETE" });
        fetchLeads();
        setConvertingLead(null);
        setSelectedLead(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGeneratePaymentLink() {
    if (!paymentLinkLead || !paymentLinkPlan) return;
    setPaymentLinkLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: paymentLinkPlan,
          email: paymentLinkLead.email || undefined,
          leadId: paymentLinkLead._id,
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        setPaymentLinkResult(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Clipboard may not be available
        }
      }
    } finally {
      setPaymentLinkLoading(false);
    }
  }

  function closePaymentLinkModal() {
    setPaymentLinkLead(null);
    setPaymentLinkPlan("");
    setPaymentLinkResult(null);
  }

  async function handleCheckDuplicates() {
    setDuplicatesLoading(true);
    setShowDuplicatesModal(true);
    try {
      const res = await fetch("/api/leads/duplicates");
      if (res.ok) {
        const data = await res.json();
        setDuplicateGroups(data.duplicates);
      }
    } finally {
      setDuplicatesLoading(false);
    }
  }

  async function handleDeleteDuplicate(id: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDuplicateGroups((prev) =>
          prev
            .map((group) => ({
              ...group,
              leads: group.leads.filter((l) => l._id !== id),
            }))
            .filter((group) => group.leads.length >= 2)
        );
      }
    } catch {
      // Silent fail
    }
  }

  function closeDuplicatesModal() {
    setShowDuplicatesModal(false);
    setDuplicateGroups([]);
    fetchLeads();
  }

  const currentLeads = activeTab === "queue" ? queueLeads : pipelineLeads;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Leads</h1>
        <div className="flex items-center gap-2">
          {/* Pipeline / Queue tabs */}
          <div className="flex items-center rounded-xl border border-border bg-surface-secondary p-1">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "pipeline"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Pipeline
              {!loading && (
                <Badge
                  variant={activeTab === "pipeline" ? "neutral" : "neutral"}
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    activeTab === "pipeline" && "bg-white/20 text-white"
                  )}
                >
                  {totalPipeline}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "queue"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Queue
              {!loading && (
                <Badge
                  variant="neutral"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    activeTab === "queue" && "bg-white/20 text-white"
                  )}
                >
                  {totalQueue}
                </Badge>
              )}
            </button>
          </div>

          {/* Board/List toggle — pipeline only */}
          {activeTab === "pipeline" && (
            <div className="flex items-center rounded-xl border border-border bg-surface-secondary p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
                  viewMode === "kanban"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
                  viewMode === "table"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                List
              </button>
            </div>
          )}

          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setShowToolsMenu((v) => !v)}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer",
                showToolsMenu
                  ? "bg-accent text-white border-accent"
                  : "bg-surface-secondary border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
              )}
              title="Tools"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.024 1.194-.14 1.743" />
              </svg>
            </button>
            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-surface shadow-xl z-50 p-1">
                <button
                  onClick={() => { setShowToolsMenu(false); handleCheckDuplicates(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                  </svg>
                  Check Duplicates
                </button>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>Import</Button>
          <Button onClick={() => setShowAddModal(true)}>Add Lead</Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters — pipeline only */}
      {activeTab === "pipeline" && (
        <div className="grid grid-cols-3 gap-3">
          <Select
            options={PIPELINE_STATUS_FILTER_OPTIONS}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <Select
            options={SOURCE_FILTER_OPTIONS}
            value={filters.source}
            onChange={(v) => setFilters((f) => ({ ...f, source: v }))}
          />
          <Select
            options={industryFilterOptions}
            value={filters.industry}
            onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
          />
        </div>
      )}

      {/* Filters — queue only */}
      {activeTab === "queue" && (
        <div className="grid grid-cols-3 gap-3">
          <Select
            options={STATE_FILTER_OPTIONS}
            value={queueStateFilter}
            onChange={setQueueStateFilter}
          />
          <Select
            options={SOURCE_FILTER_OPTIONS}
            value={queueSourceFilter}
            onChange={setQueueSourceFilter}
          />
          <Select
            options={industryFilterOptions}
            value={queueIndustryFilter}
            onChange={setQueueIndustryFilter}
          />
        </div>
      )}

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {!confirmingBulkDelete ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmingBulkDelete(true)}>
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-danger font-medium">Are you sure?</span>
                  <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                    Yes, Delete {selectedIds.size}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingBulkDelete(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select
              options={[{ value: "", label: "Set Status..." }, ...STATUS_OPTIONS]}
              value=""
              onChange={(v) => {
                if (v) handleBulkUpdate({ status: v });
              }}
            />
            <Select
              options={[{ value: "", label: "Set Source..." }, ...SOURCE_OPTIONS]}
              value=""
              onChange={(v) => {
                if (v) handleBulkUpdate({ source: v });
              }}
            />
            <Select
              options={[{ value: "", label: "Set Industry..." }, ...industryFilterOptions.slice(1)]}
              value=""
              onChange={(v) => {
                if (v) handleBulkUpdate({ industry: v });
              }}
            />
            <Select
              options={[{ value: "", label: "Set Template..." }, ...templateFilterOptions]}
              value=""
              onChange={(v) => {
                if (v) {
                  const tpl = templateFilterOptions.find((t) => t.value === v);
                  handleBulkUpdate({ outreachTemplateId: v, outreachTemplateName: tpl?.name || "" });
                }
              }}
            />
            <DatePicker
              value=""
              onChange={(val) => {
                if (val) handleBulkUpdate({ lastContactedDate: val });
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : activeTab === "queue" ? (
        <OutreachQueue
          leads={queueLeads}
          onLeadClick={(lead) => { setOpenInEditMode(false); setSelectedLead(lead); }}
          onMarkContacted={(lead) => setMarkingContactedLead(lead)}
          onSendMessage={(lead) => setMessagingLead(lead)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          filtersActive={!!search || !!queueStateFilter}
        />
      ) : currentLeads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
          <div className="p-12 text-center">
            <p className="text-text-tertiary text-sm">
              {search || filters.status || filters.source || filters.industry
                ? "No leads match your filters"
                : "No leads in the pipeline yet"}
            </p>
            <p className="text-text-tertiary text-xs mt-1">
              {search || filters.status || filters.source || filters.industry
                ? "Try adjusting your search or filters"
                : "Leads move here from the outreach queue after first contact"}
            </p>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          leads={pipelineLeads}
          onLeadClick={(lead) => { setOpenInEditMode(false); setSelectedLead(lead); }}
          onEditClick={(lead) => { setOpenInEditMode(true); setSelectedLead(lead); }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <LeadTable
          leads={pipelineLeads}
          onRowClick={(lead) => { setOpenInEditMode(false); setSelectedLead(lead); }}
          onEditClick={(lead) => { setOpenInEditMode(true); setSelectedLead(lead); }}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {/* Add Lead Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddLeadError(null); }}
        title="Add Lead"
        className="max-w-2xl"
      >
        {addLeadError && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger font-medium">{addLeadError}</p>
          </div>
        )}
        <LeadForm
          onSubmit={handleAddLead}
          onCancel={() => { setShowAddModal(false); setAddLeadError(null); }}
          loading={submitting}
        />
      </Modal>

      {/* Import Modal */}
      <LeadImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={fetchLeads}
      />

      {/* Send iMessage Modal */}
      {messagingLead && (
        <SendMessageModal
          open={!!messagingLead}
          onClose={() => setMessagingLead(null)}
          lead={messagingLead}
          onSent={(templateId, templateName) => handleMarkContacted(messagingLead._id, templateId, templateName)}
        />
      )}

      {/* Mark Contacted Modal */}
      {markingContactedLead && (
        <MarkContactedModal
          open={!!markingContactedLead}
          onClose={() => setMarkingContactedLead(null)}
          leadName={markingContactedLead.businessName || markingContactedLead.name}
          onConfirm={(templateId, templateName) => {
            handleMarkContacted(markingContactedLead._id, templateId, templateName);
            setMarkingContactedLead(null);
          }}
        />
      )}

      {/* Lead Detail Slide-Over */}
      <SlideOver
        open={!!selectedLead}
        onClose={() => { setSelectedLead(null); setOpenInEditMode(false); }}
        title={selectedLead?.name}
      >
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onStatusChange={handleStatusChange}
            onToggleHot={handleToggleHot}
            onTemplateChange={handleTemplateChange}
            onUpdate={handleUpdateLead}
            onDelete={handleDeleteLead}
            onConvertToClient={() => setConvertingLead(selectedLead)}
            onSendPaymentLink={() => setPaymentLinkLead(selectedLead)}
            submitting={submitting}
            initialEditing={openInEditMode}
          />
        )}
      </SlideOver>

      {/* Convert to Client Modal */}
      <Modal
        open={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        title="Convert to Client"
        className="max-w-2xl"
      >
        {convertingLead && (
          <ClientForm
            leadData={{
              name: convertingLead.name,
              businessName: convertingLead.businessName || "",
              phone: convertingLead.phone || "",
              email: convertingLead.email || "",
              industry: convertingLead.industry || "",
              leadId: convertingLead._id,
            }}
            onSubmit={handleConvertToClient}
            onCancel={() => setConvertingLead(null)}
            loading={submitting}
          />
        )}
      </Modal>

      {/* Duplicates Modal */}
      <Modal
        open={showDuplicatesModal}
        onClose={closeDuplicatesModal}
        title="Duplicate Leads"
        className="max-w-2xl"
      >
        {duplicatesLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary mt-3">Scanning for duplicates...</p>
          </div>
        ) : duplicateGroups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-text-secondary">No duplicates found.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-text-secondary">
              Found {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? "s" : ""}
            </p>
            {duplicateGroups.map((group, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-secondary p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={group.matchField === "email" ? "info" : "warning"}>
                    {group.matchField}
                  </Badge>
                  <span className="text-sm text-text-primary font-medium">{group.matchValue}</span>
                </div>
                <div className="space-y-2">
                  {group.leads.map((lead) => (
                    <div
                      key={lead._id}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
                        <p className="text-xs text-text-tertiary truncate">
                          {[lead.email, lead.phone, lead.businessName].filter(Boolean).join(" · ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="neutral">{lead.status}</Badge>
                          <span className="text-xs text-text-tertiary">{lead.source}</span>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteDuplicate(lead._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={closeDuplicatesModal}>Close</Button>
        </div>
      </Modal>

      {/* Payment Link Modal */}
      <Modal
        open={!!paymentLinkLead}
        onClose={closePaymentLinkModal}
        title="Send Payment Link"
      >
        {paymentLinkLead && !paymentLinkResult && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Generate a Stripe payment link for <span className="font-medium text-text-primary">{paymentLinkLead.name}</span>
            </p>
            <Select
              label="Plan Tier"
              options={[{ value: "", label: "Select plan..." }, ...PLAN_TIER_OPTIONS]}
              value={paymentLinkPlan}
              onChange={setPaymentLinkPlan}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closePaymentLinkModal}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePaymentLink}
                loading={paymentLinkLoading}
                disabled={!paymentLinkPlan}
              >
                Generate Link
              </Button>
            </div>
          </div>
        )}
        {paymentLinkResult && (
          <div className="space-y-4">
            <p className="text-sm text-success font-medium">Payment link created and copied to clipboard.</p>
            <div className="p-3 bg-surface-secondary rounded-xl border border-border">
              <p className="text-xs text-text-tertiary mb-1">Payment Link</p>
              <p className="text-sm text-text-primary break-all select-all">{paymentLinkResult}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(paymentLinkResult);
                }}
              >
                Copy Again
              </Button>
              <Button onClick={closePaymentLinkModal}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
