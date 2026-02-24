/*
 * Modal for selecting a template when marking a lead as contacted.
 * Fetches active templates from /api/openclaw/templates.
 * Passes selected template ID + name back to the parent via onConfirm.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

interface Template {
  _id: string;
  name: string;
  type: string;
  content: string;
  active: boolean;
}

interface MarkContactedModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (templateId?: string, templateName?: string) => void;
  leadName: string;
}

export default function MarkContactedModal({ open, onClose, onConfirm, leadName }: MarkContactedModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/openclaw/templates");
      if (res.ok) {
        const data = await res.json();
        const active = (Array.isArray(data) ? data : []).filter(
          (t: Template) => t.active
        );
        setTemplates(active);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplateId("");
    }
  }, [open, fetchTemplates]);

  function handleConfirm() {
    const tpl = templates.find((t) => t._id === selectedTemplateId);
    onConfirm(tpl?._id, tpl?.name);
  }

  const templateOptions = [
    { value: "", label: loadingTemplates ? "Loading templates..." : "No template" },
    ...templates.map((t) => ({ value: t._id, label: t.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Mark as Contacted">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Mark <span className="font-medium text-text-primary">{leadName}</span> as contacted.
          Optionally select the template used for outreach.
        </p>

        <Select
          label="Template Used"
          options={templateOptions}
          value={selectedTemplateId}
          onChange={setSelectedTemplateId}
          disabled={loadingTemplates}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Mark Contacted
          </Button>
        </div>
      </div>
    </Modal>
  );
}
