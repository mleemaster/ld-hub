/*
 * Client list view: table on desktop, card list on mobile.
 * Columns: business name, phone, plan, status, website, revenue, next billing.
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
import { getProjectStatusBadgeVariant } from "@/lib/client-utils";
import type { Client } from "@/lib/client-types";
import { cn, parseLocalDate, formatCurrency } from "@/lib/utils";

interface ClientTableProps {
  clients: Client[];
  onRowClick: (client: Client) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}

function SelectAllCheckbox({ clients, selectedIds, onToggleSelectAll }: {
  clients: Client[];
  selectedIds: Set<string>;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const allIds = clients.map((c) => c._id);
  const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = clients.length > 0 && selectedCount === clients.length;
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
  if (!dateStr) return "\u2014";
  const d = parseLocalDate(dateStr);
  if (!d) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PhoneActions({ phone }: { phone?: string }) {
  if (!phone) return <span className="text-text-secondary">{"\u2014"}</span>;

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

export default function ClientTable({ clients, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: ClientTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border bg-surface-secondary overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <SelectAllCheckbox clients={clients} selectedIds={selectedIds} onToggleSelectAll={onToggleSelectAll} />
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Next Billing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client._id}
                onClick={() => onRowClick(client)}
                className={cn(
                  "cursor-pointer",
                  selectedIds.has(client._id) && "bg-accent/5"
                )}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client._id)}
                    onChange={() => onToggleSelect(client._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border text-accent cursor-pointer"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <span className="font-medium">{client.businessName}</span>
                    <span className="block text-xs text-text-tertiary">{client.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <PhoneActions phone={client.phone} />
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary text-xs">{client.planTier}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getProjectStatusBadgeVariant(client.projectStatus)}>
                    {client.projectStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.websiteUrl ? (
                    <a
                      href={client.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent hover:underline text-xs truncate block max-w-[160px]"
                    >
                      {client.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-text-tertiary">{"\u2014"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary">
                    {client.monthlyRevenue ? formatCurrency(client.monthlyRevenue) : "\u2014"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary">{formatDate(client.nextBillingDate)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {clients.map((client) => (
          <div
            key={client._id}
            onClick={() => onRowClick(client)}
            className={cn(
              "rounded-2xl border border-border bg-surface-secondary p-4 cursor-pointer active:bg-surface-tertiary transition-colors",
              selectedIds.has(client._id) && "bg-accent/5 border-accent/30"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(client._id)}
                  onChange={() => onToggleSelect(client._id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-border text-accent cursor-pointer"
                />
                <div>
                  <span className="font-medium text-text-primary text-sm">{client.businessName}</span>
                  <span className="block text-xs text-text-tertiary">{client.name}</span>
                </div>
              </div>
              <Badge variant={getProjectStatusBadgeVariant(client.projectStatus)}>
                {client.projectStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-text-tertiary mt-2">
              <PhoneActions phone={client.phone} />
              <span>
                {client.planTier}
                {client.monthlyRevenue ? ` \u00b7 ${formatCurrency(client.monthlyRevenue)}` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
