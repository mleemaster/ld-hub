/*
 * Settings page.
 * Manages dynamic lead sources and Stripe payment links / coupons.
 */
"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";

interface Source {
  _id?: string;
  name: string;
  isDefault?: boolean;
}

interface PaymentLinkItem {
  id: string;
  url: string;
  active: boolean;
  planTier: string | null;
  leadId: string | null;
  leadName: string | null;
}

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
}

interface CouponItem {
  id: string;
  name: string | null;
  leadName: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  valid: boolean;
  created: number;
  promoCodes: PromoCode[];
}

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteSource, setDeleteSource] = useState<Source | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [showArchivedLinks, setShowArchivedLinks] = useState(false);
  const [showArchivedCoupons, setShowArchivedCoupons] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);

  async function fetchSources() {
    try {
      const res = await fetch("/api/lead-sources?detailed=true");
      if (res.ok) {
        setSources(await res.json());
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaymentLinks() {
    try {
      const res = await fetch("/api/stripe/payment-links");
      if (res.ok) setPaymentLinks(await res.json());
    } catch {
      // Silent fail
    }
  }

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/stripe/coupons");
      if (res.ok) setCoupons(await res.json());
    } catch {
      // Silent fail
    }
  }

  async function handleDeactivateLink(id: string) {
    setDeactivatingId(id);
    try {
      const res = await fetch("/api/stripe/payment-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await fetchPaymentLinks();
    } catch {
      // Silent fail
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleDeleteCoupon(id: string) {
    setDeletingCouponId(id);
    try {
      const res = await fetch("/api/stripe/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await fetchCoupons();
    } catch {
      // Silent fail
    } finally {
      setDeletingCouponId(null);
    }
  }

  useEffect(() => {
    fetchSources();
    Promise.all([fetchPaymentLinks(), fetchCoupons()]).finally(() =>
      setStripeLoading(false)
    );
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAddError("");
    try {
      const res = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        fetchSources();
      } else {
        const { error } = await res.json();
        setAddError(error);
      }
    } catch {
      setAddError("Failed to create source");
    }
  }

  async function handleRename() {
    if (!editingId || !editName.trim()) return;
    setEditError("");
    try {
      const res = await fetch(`/api/lead-sources/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditName("");
        fetchSources();
      } else {
        const { error } = await res.json();
        setEditError(error);
      }
    } catch {
      setEditError("Failed to rename source");
    }
  }

  async function handleDelete() {
    if (!deleteSource?._id || !reassignTo) return;
    try {
      const res = await fetch(`/api/lead-sources/${deleteSource._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignTo }),
      });
      if (res.ok) {
        setDeleteSource(null);
        setReassignTo("");
        fetchSources();
      }
    } catch {
      // Silent fail
    }
  }

  const reassignOptions = sources
    .filter((s) => s.name !== deleteSource?.name)
    .map((s) => ({ value: s.name, label: s.name }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>

      {/* Lead Sources Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Lead Sources</h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage the sources available when creating or editing leads.
          </p>
        </div>

        {/* Add new source */}
        <div className="flex gap-2 max-w-md">
          <Input
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
            placeholder="New source name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
            }}
          />
          <Button onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
        </div>
        {addError && (
          <p className="text-sm text-danger">{addError}</p>
        )}

        {/* Sources table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.name}>
                    <TableCell>
                      {editingId === source._id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); handleRename(); }
                              if (e.key === "Escape") { setEditingId(null); setEditError(""); }
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleRename}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditError(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{source.name}</span>
                      )}
                      {editingId === source._id && editError && (
                        <p className="text-xs text-danger mt-1">{editError}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${source.isDefault ? "bg-accent/10 text-accent" : "bg-surface-secondary text-text-secondary"}`}>
                        {source.isDefault ? "Default" : "Custom"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {!source.isDefault && source._id && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(source._id!);
                              setEditName(source.name);
                              setEditError("");
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setDeleteSource(source);
                              setReassignTo("");
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteSource}
        onClose={() => { setDeleteSource(null); setReassignTo(""); }}
        title="Delete Source"
      >
        {deleteSource && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Deleting <span className="font-medium text-text-primary">&ldquo;{deleteSource.name}&rdquo;</span> will
              reassign all leads using this source to the one you select below.
            </p>
            <Select
              label="Reassign leads to"
              options={[{ value: "", label: "Select source..." }, ...reassignOptions]}
              value={reassignTo}
              onChange={setReassignTo}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setDeleteSource(null); setReassignTo(""); }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={!reassignTo}>
                Delete &amp; Reassign
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Stripe Manager Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Payment Links & Coupons</h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage active Stripe payment links and coupon codes.
          </p>
        </div>

        {stripeLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Payment Links */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Payment Links</h3>
              {(() => {
                const activeLinks = paymentLinks.filter((l) => l.active);
                const archivedLinks = paymentLinks.filter((l) => !l.active);

                return (
                  <>
                    {activeLinks.length === 0 ? (
                      <p className="text-sm text-text-tertiary py-4">No active payment links.</p>
                    ) : (
                      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Plan</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Link</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeLinks.map((link) => (
                              <TableRow key={link.id}>
                                <TableCell>
                                  <span className="font-medium">{link.planTier || "—"}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-text-secondary">{link.leadName || "—"}</span>
                                </TableCell>
                                <TableCell>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline text-xs font-mono truncate block max-w-[200px]"
                                  >
                                    {link.url.replace("https://", "")}
                                  </a>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    loading={deactivatingId === link.id}
                                    onClick={() => handleDeactivateLink(link.id)}
                                  >
                                    Deactivate
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {archivedLinks.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowArchivedLinks(!showArchivedLinks)}
                          className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${showArchivedLinks ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                          Archived ({archivedLinks.length})
                        </button>
                        {showArchivedLinks && (
                          <div className="rounded-2xl border border-border bg-surface overflow-hidden mt-2 opacity-60">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plan</TableHead>
                                  <TableHead>Client</TableHead>
                                  <TableHead>Link</TableHead>
                                  <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {archivedLinks.map((link) => (
                                  <TableRow key={link.id}>
                                    <TableCell>
                                      <span className="font-medium">{link.planTier || "—"}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-text-tertiary">{link.leadName || "—"}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs font-mono text-text-tertiary truncate block max-w-[200px]">
                                        {link.url.replace("https://", "")}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                                        Inactive
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Coupons */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Coupons</h3>
              {(() => {
                const activeCoupons = coupons.filter((c) => c.valid);
                const archivedCoupons = coupons.filter((c) => !c.valid);

                return (
                  <>
                    {activeCoupons.length === 0 ? (
                      <p className="text-sm text-text-tertiary py-4">No active coupons.</p>
                    ) : (
                      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Discount</TableHead>
                              <TableHead>Promo Code</TableHead>
                              <TableHead>Redeemed</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeCoupons.map((coupon) => (
                              <TableRow key={coupon.id}>
                                <TableCell>
                                  <span className="font-medium">{coupon.name || coupon.id}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-text-secondary">{coupon.leadName || "—"}</span>
                                </TableCell>
                                <TableCell>
                                  {coupon.percentOff
                                    ? `${coupon.percentOff}% off`
                                    : coupon.amountOff
                                      ? `$${coupon.amountOff} off`
                                      : "—"}
                                </TableCell>
                                <TableCell>
                                  {coupon.promoCodes.length > 0 ? (
                                    <span className="font-mono text-xs bg-surface-secondary px-2 py-0.5 rounded">
                                      {coupon.promoCodes[0].code}
                                    </span>
                                  ) : (
                                    <span className="text-text-tertiary">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-text-secondary">
                                  {coupon.timesRedeemed}
                                  {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    loading={deletingCouponId === coupon.id}
                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                  >
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {archivedCoupons.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowArchivedCoupons(!showArchivedCoupons)}
                          className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${showArchivedCoupons ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                          Archived ({archivedCoupons.length})
                        </button>
                        {showArchivedCoupons && (
                          <div className="rounded-2xl border border-border bg-surface overflow-hidden mt-2 opacity-60">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Client</TableHead>
                                  <TableHead>Discount</TableHead>
                                  <TableHead>Promo Code</TableHead>
                                  <TableHead className="text-right">Redeemed</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {archivedCoupons.map((coupon) => (
                                  <TableRow key={coupon.id}>
                                    <TableCell>
                                      <span className="font-medium">{coupon.name || coupon.id}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-text-tertiary">{coupon.leadName || "—"}</span>
                                    </TableCell>
                                    <TableCell>
                                      {coupon.percentOff
                                        ? `${coupon.percentOff}% off`
                                        : coupon.amountOff
                                          ? `$${coupon.amountOff} off`
                                          : "—"}
                                    </TableCell>
                                    <TableCell>
                                      {coupon.promoCodes.length > 0 ? (
                                        <span className="font-mono text-xs text-text-tertiary">
                                          {coupon.promoCodes[0].code}
                                        </span>
                                      ) : (
                                        <span className="text-text-tertiary">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-text-secondary">
                                      {coupon.timesRedeemed}
                                      {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
