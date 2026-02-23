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
import { PIPELINE_STATUSES } from "@/lib/lead-constants";
import { getStatusBadgeVariant, isNeedingAttention } from "@/lib/lead-utils";
import type { LeadStatus } from "@/lib/lead-constants";
import type { Lead } from "@/lib/lead-types";
import { cn, parseLocalDate } from "@/lib/utils";

interface KanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onEditClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (!d) return "";
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

/* ── Card ── */

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  onEdit?: () => void;
  isOverlay?: boolean;
}

function KanbanCard({ lead, onClick, onEdit, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead._id,
  });

  const attention = isNeedingAttention(lead);
  const hot = !!lead.isHot;

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
        hot
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
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Edit"
            className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-accent transition-all cursor-pointer shrink-0 ml-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
        )}
      </div>
      {lead.businessName && (
        <p className="text-xs text-text-tertiary truncate mt-0.5">{lead.businessName}</p>
      )}
      <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
        <span>{lead.source}</span>
        {lead.followUpDate && (
          <span className={cn(isOverdue(lead.followUpDate) && "text-warning font-medium")}>
            {formatDate(lead.followUpDate)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Column ── */

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onEditClick: (lead: Lead) => void;
}

function KanbanColumn({ status, leads, onLeadClick, onEditClick }: KanbanColumnProps) {
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
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Board ── */

export default function KanbanBoard({ leads, onLeadClick, onEditClick, onStatusChange }: KanbanBoardProps) {
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
        {PIPELINE_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter((l) => l.status === status)}
            onLeadClick={onLeadClick}
            onEditClick={onEditClick}
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
