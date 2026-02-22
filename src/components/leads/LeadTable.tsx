/*
 * Lead list view: table on desktop, card list on mobile.
 * Columns optimized for actionability: name, phone, status,
 * follow-up, last contacted, notes preview, created date.
 */
"use client";

import { useRef, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { getStatusBadgeVariant, isNeedingAttention } from "@/lib/lead-utils";
import type { LeadStatus } from "@/lib/lead-constants";
import type { Lead } from "@/lib/lead-types";
import { cn, parseLocalDate } from "@/lib/utils";

interface LeadTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  onEditClick: (lead: Lead) => void;
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

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= today;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + "...";
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

function EditButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title="Edit"
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-colors cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
      </svg>
    </button>
  );
}

export default function LeadTable({ leads, onRowClick, onEditClick, selectedIds, onToggleSelect, onToggleSelectAll }: LeadTableProps) {
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-Up</TableHead>
              <TableHead>Last Contacted</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const attention = isNeedingAttention(lead);
              return (
                <TableRow
                  key={lead._id}
                  onClick={() => onRowClick(lead)}
                  className={cn(
                    "cursor-pointer",
                    attention && "border-l-2 border-l-warning",
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
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.businessName && (
                        <span className="block text-xs text-text-tertiary">
                          {lead.businessName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PhoneActions phone={lead.phone} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(lead.status as LeadStatus)}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-text-secondary",
                        isOverdue(lead.followUpDate) && "text-warning font-medium"
                      )}
                    >
                      {formatDate(lead.followUpDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-secondary">
                      {formatDate(lead.lastContactedDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-secondary">{lead.state || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-tertiary text-xs max-w-[200px] block truncate">
                      {lead.notes ? truncate(lead.notes, 50) : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-tertiary">
                      {formatDate(lead.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <EditButton onClick={(e) => { e.stopPropagation(); onEditClick(lead); }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => {
          const attention = isNeedingAttention(lead);
          return (
            <div
              key={lead._id}
              onClick={() => onRowClick(lead)}
              className={cn(
                "rounded-2xl border border-border bg-surface-secondary p-4 cursor-pointer active:bg-surface-tertiary transition-colors",
                attention && "border-l-2 border-l-warning",
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
                  <span className="font-medium text-text-primary text-sm">{lead.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <EditButton onClick={(e) => { e.stopPropagation(); onEditClick(lead); }} />
                  <Badge
                    variant={getStatusBadgeVariant(lead.status as LeadStatus)}
                  >
                    {lead.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                <PhoneActions phone={lead.phone} />
                <span>
                  {lead.state && <span>{lead.state} &middot; </span>}
                  <span
                    className={cn(
                      isOverdue(lead.followUpDate) && "text-warning font-medium"
                    )}
                  >
                    {lead.followUpDate ? `Follow-up: ${formatDate(lead.followUpDate)}` : ""}
                  </span>
                </span>
              </div>
              {lead.notes && (
                <p className="text-xs text-text-tertiary mt-1 truncate">
                  {truncate(lead.notes, 50)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
