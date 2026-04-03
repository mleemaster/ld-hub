/*
 * Kanban board for the leads pipeline.
 * One column per status, drag-and-drop to change status.
 * Uses @dnd-kit for drag interactions.
 */
"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import Badge from "@/components/ui/Badge";
const KANBAN_STATUSES = ["No Response", "Rejected", "Cold", "Warm", "Call Scheduled"] as const;
import { getStatusBadgeVariant, isNeedingAttention } from "@/lib/lead-utils";
import type { LeadStatus } from "@/lib/lead-constants";
import type { Lead } from "@/lib/lead-types";
import { cn, parseLocalDate } from "@/lib/utils";
import { nowET } from "@/lib/date-utils";

interface KanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onEditClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onFollowUp: (leadId: string) => void;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (!d) return "";
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeMatch = String(dateStr).match(/T(\d{2}):(\d{2})/);
  if (!timeMatch) return datePart;
  const hour = +timeMatch[1];
  const minute = +timeMatch[2];
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${datePart} ${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (!d) return false;
  const today = nowET();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= today;
}

function getDaysInStage(stageEnteredAt?: string): number | null {
  if (!stageEnteredAt) return null;
  const d = parseLocalDate(stageEnteredAt);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function getDaysInStageColor(days: number): string {
  if (days <= 3) return "text-green-500 bg-green-500/10";
  if (days <= 7) return "text-yellow-500 bg-yellow-500/10";
  if (days <= 14) return "text-orange-500 bg-orange-500/10";
  return "text-red-500 bg-red-500/10";
}

function getFollowUpStatus(nextFollowUpDate?: string): { label: string; color: string } | null {
  if (!nextFollowUpDate) return null;
  const d = parseLocalDate(nextFollowUpDate);
  if (!d) return null;
  const today = nowET();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, color: "text-red-500" };
  if (diffDays === 0) return { label: "Due today", color: "text-orange-500" };
  return { label: `Follow-up in ${diffDays}d`, color: "text-text-tertiary" };
}

/* ── Card ── */

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  onEdit?: () => void;
  onFollowUp?: () => void;
  isOverlay?: boolean;
}

function getContactedDaysAgo(lastContactedDate?: string): number | null {
  if (!lastContactedDate) return null;
  const d = parseLocalDate(lastContactedDate);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function KanbanCard({ lead, onClick, onEdit, onFollowUp, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead._id,
  });

  const attention = isNeedingAttention(lead);
  const hot = !!lead.isHot;
  const isNoResponse = lead.status === "No Response";

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "group rounded-xl border bg-surface p-3 cursor-grab active:cursor-grabbing transition-opacity select-none",
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-lg ring-2 ring-accent/30",
        isNoResponse
          ? "opacity-80 border-l-2 border-l-gray-400 border-border"
          : hot
            ? "border-red-500/60"
            : attention
              ? "border-l-2 border-l-warning border-border"
              : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
          {hot && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
          {lead.name}
        </p>
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {onFollowUp && (
            <button
              onClick={(e) => { e.stopPropagation(); onFollowUp(); }}
              title="Mark followed up"
              className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-green-500 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Edit"
              className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-all cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {lead.businessName && (
        <p className="text-xs text-text-tertiary truncate mt-0.5">{lead.businessName}</p>
      )}
      <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span>{lead.source}</span>
          {(() => {
            const days = getDaysInStage(lead.stageEnteredAt);
            if (days === null) return null;
            return (
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getDaysInStageColor(days))}>
                {days}d
              </span>
            );
          })()}
        </div>
        {lead.status === "Call Scheduled" && lead.callScheduledDate ? (
          <span className={cn("flex items-center gap-1", isOverdue(lead.callScheduledDate) && "text-warning font-medium")}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
            </svg>
            {formatDateTime(lead.callScheduledDate)}
          </span>
        ) : null}
      </div>
      {(() => {
        const followUp = getFollowUpStatus(lead.nextFollowUpDate);
        if (!followUp) return null;
        return (
          <p className={cn("text-[10px] font-medium mt-1", followUp.color)}>
            {followUp.label}
          </p>
        );
      })()}
      {isNoResponse && (() => {
        const daysAgo = getContactedDaysAgo(lead.lastContactedDate);
        if (daysAgo === null) return null;
        return (
          <p className="text-[10px] text-text-tertiary mt-1">
            Contacted {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
          </p>
        );
      })()}
    </div>
  );
}

/* ── Column ── */

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onEditClick: (lead: Lead) => void;
  onFollowUp: (leadId: string) => void;
}

function KanbanColumn({ status, leads, onLeadClick, onEditClick, onFollowUp }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[220px] w-[220px] shrink-0 rounded-2xl border border-border bg-surface-secondary transition-all snap-start",
        isOver && "ring-2 ring-accent/50"
      )}
    >
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary truncate">{status}</span>
        <Badge variant={getStatusBadgeVariant(status as LeadStatus)} className="ml-2">
          {leads.length}
        </Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {leads.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">No leads</p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead._id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              onEdit={() => onEditClick(lead)}
              onFollowUp={() => onFollowUp(lead._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Board ── */

export default function KanbanBoard({ leads, onLeadClick, onEditClick, onStatusChange, onFollowUp }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const activeLead = activeId ? leads.find((l) => l._id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    const lead = leads.find((l) => l._id === leadId);
    if (lead && lead.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter((l) => l.status === status)}
            onLeadClick={onLeadClick}
            onEditClick={onEditClick}
            onFollowUp={onFollowUp}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <KanbanCard lead={activeLead} onClick={() => {}} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
