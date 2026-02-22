/*
 * Modal form for creating/editing OpenClaw tasks.
 * Includes quick-action buttons that pre-fill prompt templates.
 */
"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (prompt: string) => Promise<void>;
  initialPrompt?: string;
  isEditing?: boolean;
}

const QUICK_ACTIONS = [
  {
    label: "Scrape leads",
    template: "Scrape [count] [industry] leads in [location]",
  },
  {
    label: "Send outreach",
    template: "Send initial outreach to all new leads",
  },
  {
    label: "Follow up",
    template:
      "Send follow-up messages to leads contacted more than 3 days ago",
  },
];

export default function TaskForm({
  open,
  onClose,
  onSave,
  initialPrompt = "",
  isEditing = false,
}: TaskFormProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setPrompt(initialPrompt);
  }, [open, initialPrompt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSaving(true);
    try {
      await onSave(prompt.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Task" : "New Task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => setPrompt(action.template)}
              className="px-3 py-1.5 rounded-lg bg-surface-tertiary text-xs text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors cursor-pointer"
            >
              {action.label}
            </button>
          ))}
        </div>

        <Textarea
          id="task-prompt"
          label="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Scrape 50 plumber leads in Austin, TX"
          rows={4}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!prompt.trim()}>
            {isEditing ? "Save" : "Add Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
