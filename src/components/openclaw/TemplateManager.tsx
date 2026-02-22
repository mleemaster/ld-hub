/*
 * Template manager for OpenClaw message templates.
 * Lists templates with type badges, active toggles, and full CRUD.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import TemplateForm from "@/components/openclaw/TemplateForm";

interface Template {
  _id: string;
  name: string;
  type: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function typeBadgeColor(type: string): string {
  switch (type) {
    case "initial_contact":
      return "bg-accent/10 text-accent";
    case "follow_up_1":
      return "bg-warning/10 text-warning";
    case "follow_up_2":
      return "bg-warning/15 text-warning";
    case "follow_up_3":
      return "bg-danger/10 text-danger";
    default:
      return "bg-surface-tertiary text-text-secondary";
  }
}

function formatType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleCreate(data: {
    name: string;
    type: string;
    content: string;
    active: boolean;
  }) {
    await fetch("/api/openclaw/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchTemplates();
  }

  async function handleEdit(data: {
    name: string;
    type: string;
    content: string;
    active: boolean;
  }) {
    if (!editingTemplate) return;
    await fetch(`/api/openclaw/templates/${editingTemplate._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingTemplate(null);
    await fetchTemplates();
  }

  async function handleToggleActive(template: Template) {
    await fetch(`/api/openclaw/templates/${template._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !template.active }),
    });
    await fetchTemplates();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/openclaw/templates/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await fetchTemplates();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">
          Message Templates
        </h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          New Template
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-text-tertiary">Loading...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-text-tertiary">No templates created yet</p>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template._id}
              className="flex items-start gap-3 py-3 px-3 rounded-xl bg-surface border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="text-sm font-medium text-text-primary hover:text-accent transition-colors cursor-pointer text-left"
                  >
                    {template.name}
                  </button>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeColor(template.type)}`}
                  >
                    {formatType(template.type)}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary line-clamp-2">
                  {template.content}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(template)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                    template.active ? "bg-success" : "bg-surface-tertiary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      template.active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {deletingId === template._id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="px-2 py-1 rounded-lg bg-danger text-white text-xs cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 rounded-lg bg-surface-tertiary text-text-secondary text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(template._id)}
                    className="p-1.5 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-danger transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
      />

      <TemplateForm
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSave={handleEdit}
        template={editingTemplate}
      />
    </div>
  );
}
