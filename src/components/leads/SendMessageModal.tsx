/*
 * Modal for sending an iMessage to a lead using an OpenClaw template.
 * Flow: pick template → preview with lead data interpolated → edit → send.
 * Calls POST /api/imessage/send to invoke the imsg CLI server-side.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { Lead } from "@/lib/lead-types";

interface Template {
  _id: string;
  name: string;
  type: string;
  content: string;
  active: boolean;
}

interface SendMessageModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onSent: () => void;
}

const PLACEHOLDER_MAP: Record<string, keyof Lead> = {
  "{name}": "name",
  "{business_name}": "businessName",
  "{state}": "state",
  "{source}": "source",
  "{industry}": "industry",
  "{email}": "email",
  "{phone}": "phone",
  "{website}": "website",
};

function fillTemplate(content: string, lead: Lead): string {
  let filled = content;
  for (const [placeholder, field] of Object.entries(PLACEHOLDER_MAP)) {
    filled = filled.replaceAll(placeholder, (lead[field] as string) || "");
  }
  return filled;
}

export default function SendMessageModal({ open, onClose, lead, onSent }: SendMessageModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      // Silent fail — user can still type manually
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplateId("");
      setMessage("");
      setResult(null);
    }
  }, [open, fetchTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t._id === selectedTemplateId);
    if (tpl) {
      setMessage(fillTemplate(tpl.content, lead));
    }
  }, [selectedTemplateId, templates, lead]);

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/imessage/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: lead.phone,
          message,
          leadId: lead._id,
          leadName: lead.businessName || lead.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ type: "success", text: "Message sent!" });
        onSent();
      } else {
        setResult({ type: "error", text: data.error || "Failed to send message" });
      }
    } catch {
      setResult({ type: "error", text: "Network error — could not send message" });
    } finally {
      setSending(false);
    }
  }

  const templateOptions = [
    { value: "", label: loadingTemplates ? "Loading templates..." : "Select a template..." },
    ...templates.map((t) => ({ value: t._id, label: t.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Send iMessage" className="max-w-lg">
      <div className="space-y-4">
        {/* Recipient */}
        <div className="rounded-xl bg-surface-secondary border border-border px-4 py-3">
          <p className="text-xs text-text-tertiary mb-0.5">To</p>
          <p className="text-sm font-medium text-text-primary">
            {lead.businessName || lead.name}
            <span className="ml-2 text-text-secondary font-normal">{lead.phone}</span>
          </p>
        </div>

        {/* Template picker */}
        <Select
          label="Template"
          options={templateOptions}
          value={selectedTemplateId}
          onChange={setSelectedTemplateId}
          disabled={loadingTemplates}
        />

        {/* Editable message */}
        <Textarea
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Select a template or type your message..."
        />

        {/* Result feedback */}
        {result && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              result.type === "success"
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger"
            }`}
          >
            {result.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            {result?.type === "success" ? "Done" : "Cancel"}
          </Button>
          {result?.type !== "success" && (
            <Button
              onClick={handleSend}
              loading={sending}
              disabled={!message.trim() || !lead.phone}
            >
              Send
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
