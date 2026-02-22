/*
 * Modal form for creating/editing message templates.
 * Fields: name, type, content, active toggle.
 */
"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { TEMPLATE_TYPES } from "@/lib/openclaw-constants";

interface Template {
  _id: string;
  name: string;
  type: string;
  content: string;
  active: boolean;
}

interface TemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; type: string; content: string; active: boolean }) => Promise<void>;
  template?: Template | null;
}

const TYPE_OPTIONS = TEMPLATE_TYPES.map((t) => ({
  value: t,
  label: t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
}));

export default function TemplateForm({
  open,
  onClose,
  onSave,
  template,
}: TemplateFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(TEMPLATE_TYPES[0]);
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(template?.name || "");
      setType(template?.type || TEMPLATE_TYPES[0]);
      setContent(template?.content || "");
      setActive(template?.active ?? true);
    }
  }, [open, template]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, content: content.trim(), active });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? "Edit Template" : "New Template"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="template-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Initial outreach — plumbers"
        />

        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
        />

        <Textarea
          id="template-content"
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Hi {name}, I noticed {business_name} doesn't have a website yet..."
          rows={6}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-primary">Active</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!name.trim() || !content.trim()}
          >
            {template ? "Save" : "Create Template"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
