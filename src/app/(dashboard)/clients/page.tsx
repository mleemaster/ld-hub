/*
 * Clients page.
 * Full CRUD for paying customers with filtering by plan tier,
 * project status, and PPC client status. Slide-over detail panel
 * with collapsible intake form. Bulk actions toolbar.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import ClientForm from "@/components/clients/ClientForm";
import ClientTable from "@/components/clients/ClientTable";
import ClientDetailPanel from "@/components/clients/ClientDetailPanel";
import type { Client, ClientFormData } from "@/lib/client-types";
import {
  PLAN_TIER_FILTER_OPTIONS,
  PROJECT_STATUS_FILTER_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PPC_FILTER_OPTIONS,
  searchClients,
} from "@/lib/client-utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ planTier: "", projectStatus: "", ppcClient: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.planTier) params.set("planTier", filters.planTier);
      if (filters.projectStatus) params.set("projectStatus", filters.projectStatus);
      if (filters.ppcClient) params.set("ppcClient", filters.ppcClient);

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        setSelectedClient((prev) => {
          if (!prev) return null;
          const fresh = data.find((c: Client) => c._id === prev._id);
          return fresh || null;
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);
  }, [search]);

  const filtered = searchClients(clients, search);

  async function handleAddClient(data: ClientFormData & { leadId?: string }) {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (data.monthlyRevenue) payload.monthlyRevenue = parseFloat(data.monthlyRevenue);
      if (data.setupFeeAmount) payload.setupFeeAmount = parseFloat(data.setupFeeAmount);
      if (data.ppcManagementFee) payload.ppcManagementFee = parseFloat(data.ppcManagementFee);
      if (data.ppcAdSpend) payload.ppcAdSpend = parseFloat(data.ppcAdSpend);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchClients();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateClient(data: ClientFormData) {
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (data.monthlyRevenue) payload.monthlyRevenue = parseFloat(data.monthlyRevenue);
      else payload.monthlyRevenue = null;
      if (data.setupFeeAmount) payload.setupFeeAmount = parseFloat(data.setupFeeAmount);
      else payload.setupFeeAmount = null;
      if (data.ppcManagementFee) payload.ppcManagementFee = parseFloat(data.ppcManagementFee);
      else payload.ppcManagementFee = null;
      if (data.ppcAdSpend) payload.ppcAdSpend = parseFloat(data.ppcAdSpend);
      else payload.ppcAdSpend = null;

      const res = await fetch(`/api/clients/${selectedClient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedClient(updated);
        fetchClients();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedClient(null);
        fetchClients();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(clientId: string, newStatus: string) {
    const prev = clients.map((c) => ({ ...c }));
    setClients((current) =>
      current.map((c) => (c._id === clientId ? { ...c, projectStatus: newStatus } : c))
    );
    setSelectedClient((current) =>
      current && current._id === clientId ? { ...current, projectStatus: newStatus } : current
    );

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStatus: newStatus }),
      });
      if (!res.ok) {
        setClients(prev);
        setSelectedClient((current) => {
          if (!current) return null;
          const reverted = prev.find((c) => c._id === current._id);
          return reverted || current;
        });
      }
    } catch {
      setClients(prev);
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
    setClients((current) => current.filter((c) => !selectedIds.has(c._id)));
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/clients/${id}`, { method: "DELETE" })
        )
      );
    } finally {
      fetchClients();
    }
  }

  async function handleBulkStatusUpdate(status: string) {
    const ids = [...selectedIds];
    const prev = clients.map((c) => ({ ...c }));
    setClients((current) =>
      current.map((c) => (selectedIds.has(c._id) ? { ...c, projectStatus: status } : c))
    );
    setSelectedIds(new Set());

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/clients/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectStatus: status }),
          })
        )
      );
    } catch {
      setClients(prev);
    } finally {
      fetchClients();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Clients</h1>
        <Button onClick={() => setShowAddModal(true)}>Add Client</Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div className="grid grid-cols-3 gap-3">
        <Select
          options={PLAN_TIER_FILTER_OPTIONS}
          value={filters.planTier}
          onChange={(v) => setFilters((f) => ({ ...f, planTier: v }))}
        />
        <Select
          options={PROJECT_STATUS_FILTER_OPTIONS}
          value={filters.projectStatus}
          onChange={(v) => setFilters((f) => ({ ...f, projectStatus: v }))}
        />
        <Select
          options={PPC_FILTER_OPTIONS}
          value={filters.ppcClient}
          onChange={(v) => setFilters((f) => ({ ...f, ppcClient: v }))}
        />
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {selectedIds.size} client{selectedIds.size !== 1 ? "s" : ""} selected
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select
              options={[{ value: "", label: "Set Status..." }, ...PROJECT_STATUS_OPTIONS]}
              value=""
              onChange={(v) => {
                if (v) handleBulkStatusUpdate(v);
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-secondary overflow-hidden">
          <div className="p-12 text-center">
            <p className="text-text-tertiary text-sm">
              {search || filters.planTier || filters.projectStatus || filters.ppcClient
                ? "No clients match your filters"
                : "No clients yet"}
            </p>
            <p className="text-text-tertiary text-xs mt-1">
              {search || filters.planTier || filters.projectStatus || filters.ppcClient
                ? "Try adjusting your search or filters"
                : "Clients appear when leads convert via Stripe payment or are added manually"}
            </p>
          </div>
        </div>
      ) : (
        <ClientTable
          clients={filtered}
          onRowClick={(client) => setSelectedClient(client)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {/* Add Client Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Client"
        className="max-w-2xl"
      >
        <ClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowAddModal(false)}
          loading={submitting}
        />
      </Modal>

      {/* Client Detail Slide-Over */}
      <SlideOver
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.businessName || selectedClient?.name}
      >
        {selectedClient && (
          <ClientDetailPanel
            client={selectedClient}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdateClient}
            onDelete={handleDeleteClient}
            submitting={submitting}
          />
        )}
      </SlideOver>
    </div>
  );
}
