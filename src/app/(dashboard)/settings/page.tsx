/*
 * Settings page.
 * Manages dynamic lead sources: add, rename, delete with reassignment.
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

  useEffect(() => {
    fetchSources();
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
    </div>
  );
}
