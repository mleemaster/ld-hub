/*
 * Outreach queue for "New" leads awaiting first contact.
 * FIFO: oldest first. Features inline one-click outreach panel
 * that expands below each row, with template selector, message preview,
 * and "Copy & Open iMessage" button. Auto-advances to next lead after contact.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import type { Lead } from "@/lib/lead-types";
import { cn, parseLocalDate } from "@/lib/utils";
import { fillTemplate } from "@/components/leads/SendMessageModal";

interface Template {
  _id: string;
  name: string;
  type: string;
  content: string;
  active: boolean;
}

interface OutreachQueueProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onMarkContacted: (lead: Lead, templateId?: string, templateName?: string) => void;
  onSendMessage: (lead: Lead) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  filtersActive?: boolean;
}

function SelectAllCheckbox({ leads, selectedIds, onToggleSelectAll }: {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const allIds = leads.map((l) => l._id);
  const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = leads.length > 0 && selectedCount === leads.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={() => onToggleSelectAll(allIds)}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 rounded border-border text-accent cursor-pointer"
    />
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PhoneActions({ phone }: { phone?: string }) {
  if (!phone) return <span className="text-text-secondary">—</span>;

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-text-secondary">{phone}</span>
      <a
        href={`tel:${phone}`}
        onClick={(e) => e.stopPropagation()}
        title="Call"
        className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
      </a>
      <a
        href={`sms:${phone}`}
        onClick={(e) => e.stopPropagation()}
        title="Text"
        className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      </a>
    </span>
  );
}

/* ── Inline outreach panel ── */

function InlineOutreachPanel({
  lead,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCopyAndSend,
  status,
}: {
  lead: Lead;
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onCopyAndSend: () => void;
  status: "idle" | "sent";
}) {
  const tpl = templates.find((t) => t._id === selectedTemplateId);
  const message = tpl ? fillTemplate(tpl.content, lead) : "";

  const templateOptions = [
    { value: "", label: "Select a template..." },
    ...templates.map((t) => ({ value: t._id, label: t.name })),
  ];

  return (
    <div className="bg-surface border border-border-secondary rounded-xl p-4 mt-2 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select
            options={templateOptions}
            value={selectedTemplateId}
            onChange={onSelectTemplate}
          />
        </div>
        <span className="text-xs text-text-tertiary">
          {lead.businessName || lead.name}
        </span>
      </div>

      {message && (
        <div className="rounded-lg bg-surface-secondary border border-border p-3 text-sm text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto">
          {message}
        </div>
      )}

      {status === "sent" ? (
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Copied & marked contacted
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onCopyAndSend}
            disabled={!message || !lead.phone}
          >
            Copy & Open iMessage
          </Button>
          <span className="text-xs text-text-tertiary">
            Copies message, opens iMessage, auto-marks contacted
          </span>
        </div>
      )}
    </div>
  );
}

export default function OutreachQueue({ leads, onLeadClick, onMarkContacted, onSendMessage, selectedIds, onToggleSelect, onToggleSelectAll, filtersActive }: OutreachQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [panelStatus, setPanelStatus] = useState<"idle" | "sent">("idle");
  const expandedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        const res = await fetch("/api/openclaw/templates");
        if (res.ok && !cancelled) {
          const data = await res.json();
          const active = (Array.isArray(data) ? data : []).filter((t: Template) => t.active);
          setTemplates(active);
          const initial = active.find((t: Template) => t.type === "initial_contact");
          if (initial) setSelectedTemplateId(initial._id);
          else if (active.length > 0) setSelectedTemplateId(active[0]._id);
        }
      } catch {
        // Silent fail
      }
    }
    loadTemplates();
    return () => { cancelled = true; };
  }, []);

  function handleToggleExpand(leadId: string) {
    if (expandedId === leadId) {
      setExpandedId(null);
    } else {
      setExpandedId(leadId);
      setPanelStatus("idle");
    }
  }

  async function handleCopyAndSend(lead: Lead) {
    const tpl = templates.find((t) => t._id === selectedTemplateId);
    if (!tpl) return;

    const message = fillTemplate(tpl.content, lead);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback ignored
    }

    // Open iMessage
    if (lead.phone) {
      window.open(`sms:${lead.phone}`, "_self");
    }

    // Mark contacted (this handles status change, contactAttempts, nextFollowUpDate via API)
    onMarkContacted(lead, tpl._id, tpl.name);
    setPanelStatus("sent");

    // Auto-advance to next lead after a brief moment
    setTimeout(() => {
      const currentIndex = leads.findIndex((l) => l._id === lead._id);
      const nextLead = leads[currentIndex + 1];
      if (nextLead) {
        setExpandedId(nextLead._id);
        setPanelStatus("idle");
        // Scroll to next lead
        setTimeout(() => {
          expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        setExpandedId(null);
      }
    }, 1200);
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-text-tertiary text-sm">
            {filtersActive ? "No leads match your filters" : "No leads in the queue"}
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            {filtersActive ? "Try adjusting your search or filters" : "New leads will appear here"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border bg-surface-secondary overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <SelectAllCheckbox leads={leads} selectedIds={selectedIds} onToggleSelectAll={onToggleSelectAll} />
              </TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead._id}
                className={cn(
                  "cursor-pointer",
                  selectedIds.has(lead._id) && "bg-accent/5",
                  expandedId === lead._id && "bg-accent/5"
                )}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead._id)}
                    onChange={() => onToggleSelect(lead._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border text-accent cursor-pointer"
                  />
                </TableCell>
                <TableCell onClick={() => onLeadClick(lead)}>
                  <span className="font-medium">
                    {lead.businessName || lead.name || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <PhoneActions phone={lead.phone} />
                </TableCell>
                <TableCell onClick={() => onLeadClick(lead)}>
                  <span className="text-text-secondary">{lead.industry || "—"}</span>
                </TableCell>
                <TableCell onClick={() => onLeadClick(lead)}>
                  <span className="text-text-secondary">{lead.state || "—"}</span>
                </TableCell>
                <TableCell onClick={() => onLeadClick(lead)}>
                  <span className="text-text-secondary">{lead.source}</span>
                </TableCell>
                <TableCell onClick={() => onLeadClick(lead)}>
                  <span className="text-text-tertiary">{formatDate(lead.createdAt)}</span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkContacted(lead);
                      }}
                    >
                      Mark Contacted
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(lead._id);
                      }}
                    >
                      {expandedId === lead._id ? "Close" : "Outreach"}
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendMessage(lead);
                      }}
                      title="Full message editor"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface-secondary hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                      </svg>
                    </button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Inline outreach panel — rendered outside table for proper layout */}
        {expandedId && (() => {
          const lead = leads.find((l) => l._id === expandedId);
          if (!lead) return null;
          return (
            <div ref={expandedRef} className="px-4 pb-4">
              <InlineOutreachPanel
                lead={lead}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
                onCopyAndSend={() => handleCopyAndSend(lead)}
                status={panelStatus}
              />
            </div>
          );
        })()}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          <div key={lead._id}>
            <div
              onClick={() => onLeadClick(lead)}
              className={cn(
                "rounded-2xl border border-border bg-surface-secondary p-4 cursor-pointer active:bg-surface-tertiary transition-colors",
                selectedIds.has(lead._id) && "bg-accent/5 border-accent/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead._id)}
                    onChange={() => onToggleSelect(lead._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border text-accent cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-text-primary text-sm">
                      {lead.businessName || lead.name}
                    </span>
                    {lead.businessName && (
                      <span className="block text-xs text-text-tertiary">{lead.name}</span>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkContacted(lead);
                    }}
                  >
                    Mark Contacted
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(lead._id);
                    }}
                  >
                    {expandedId === lead._id ? "Close" : "Outreach"}
                  </Button>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-tertiary mt-1">
                <PhoneActions phone={lead.phone} />
                <span>{lead.state && `${lead.state} · `}{lead.source} &middot; {formatDate(lead.createdAt)}</span>
              </div>
            </div>
            {expandedId === lead._id && (
              <div ref={expandedRef} className="px-2">
                <InlineOutreachPanel
                  lead={lead}
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={setSelectedTemplateId}
                  onCopyAndSend={() => handleCopyAndSend(lead)}
                  status={panelStatus}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
