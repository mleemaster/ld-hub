/*
 * Outreach queue view for "New" leads awaiting first contact.
 * FIFO table: oldest leads first. Desktop table + mobile cards.
 * Each row has a "Mark as Contacted" quick action.
 */
"use client";

import { useRef, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import type { Lead } from "@/lib/lead-types";
import { cn, parseLocalDate } from "@/lib/utils";

interface OutreachQueueProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onMarkContacted: (leadId: string) => void;
  onSendMessage: (lead: Lead) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
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

export default function OutreachQueue({ leads, onLeadClick, onMarkContacted, onSendMessage, selectedIds, onToggleSelect, onToggleSelectAll }: OutreachQueueProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-text-tertiary text-sm">No leads in the queue</p>
          <p className="text-text-tertiary text-xs mt-1">
            New leads from OpenClaw will appear here
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
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead._id}
                onClick={() => onLeadClick(lead)}
                className={cn(
                  "cursor-pointer",
                  selectedIds.has(lead._id) && "bg-accent/5"
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
                <TableCell>
                  <span className="font-medium">
                    {lead.businessName || lead.name || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <PhoneActions phone={lead.phone} />
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary">{lead.industry || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary">{lead.state || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary">{lead.source}</span>
                </TableCell>
                <TableCell>
                  <span className="text-text-tertiary">{formatDate(lead.createdAt)}</span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {lead.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendMessage(lead);
                        }}
                        title="Send iMessage"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface-secondary hover:bg-surface-tertiary text-text-secondary hover:text-accent transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                      </button>
                    )}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkContacted(lead._id);
                      }}
                    >
                      Mark Contacted
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          <div
            key={lead._id}
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
                {lead.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendMessage(lead);
                    }}
                    title="Send iMessage"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface-secondary hover:bg-surface-tertiary text-text-secondary hover:text-accent transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                )}
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkContacted(lead._id);
                  }}
                >
                  Contact
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-tertiary mt-1">
              <PhoneActions phone={lead.phone} />
              <span>{lead.state && `${lead.state} · `}{lead.source} &middot; {formatDate(lead.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
