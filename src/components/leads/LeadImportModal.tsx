/*
 * CSV import modal for bulk lead creation.
 * Enforces a fixed template: Name, Business Name, Phone, Email,
 * Website, Status, Source, Industry, Notes, Follow-Up Date.
 * Parses client-side, shows preview, then POSTs to /api/leads/import.
 */
"use client";

import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { normalizeState } from "@/lib/lead-utils";

interface LeadImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  source: string;
  industry: string;
  state: string;
  notes: string;
  followUpDate: string;
  lastContactedDate: string;
  callScheduledDate: string;
  createdAt: string;
}

const EXPECTED_HEADERS = [
  "Name",
  "Business Name",
  "Phone",
  "Email",
  "Website",
  "Status",
  "Source",
  "Industry",
  "State",
  "Notes",
  "Follow-Up Date",
  "Last Contacted",
  "Call Scheduled Date",
  "Date Added",
];

const HEADER_TO_FIELD: Record<string, keyof ParsedRow> = {
  "Name": "name",
  "Business Name": "businessName",
  "Phone": "phone",
  "Email": "email",
  "Website": "website",
  "Status": "status",
  "Source": "source",
  "Industry": "industry",
  "State": "state",
  "Notes": "notes",
  "Follow-Up Date": "followUpDate",
  "Last Contacted": "lastContactedDate",
  "Call Scheduled Date": "callScheduledDate",
  "Date Added": "createdAt",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function mapRows(headers: string[], rows: string[][]): ParsedRow[] {
  return rows.map((row) => {
    const obj: ParsedRow = {
      name: "", businessName: "", phone: "", email: "",
      website: "", status: "", source: "", industry: "",
      state: "", notes: "", followUpDate: "", lastContactedDate: "",
      callScheduledDate: "", createdAt: "",
    };
    headers.forEach((header, i) => {
      const field = HEADER_TO_FIELD[header];
      if (field && i < row.length) {
        obj[field] = row[i];
      }
    });
    obj.state = normalizeState(obj.state);
    return obj;
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateRow(row: ParsedRow): string | null {
  return null;
}

export default function LeadImportModal({ open, onClose, onImported }: LeadImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setHeaderError(null);
    setImporting(false);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { headers, rows: rawRows } = parseCSV(text);

      const missing = EXPECTED_HEADERS.filter(
        (h) => !headers.some((hdr) => hdr.toLowerCase() === h.toLowerCase())
      );
      if (missing.length > 0) {
        setHeaderError(`Missing columns: ${missing.join(", ")}`);
        setRows([]);
        return;
      }

      setHeaderError(null);
      const normalizedHeaders = headers.map((h) => {
        const match = EXPECTED_HEADERS.find((eh) => eh.toLowerCase() === h.toLowerCase());
        return match || h;
      });
      const mapped = mapRows(normalizedHeaders, rawRows).filter((r) =>
        r.name.trim() || r.businessName.trim() || r.phone.trim() || r.email.trim() || r.source.trim()
      );
      setRows(mapped);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: rows }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep("result");
        onImported();
      } else {
        setResult({ imported: 0, skipped: rows.length, errors: [data.error, ...(data.errors || [])] });
        setStep("result");
      }
    } catch {
      setResult({ imported: 0, skipped: rows.length, errors: ["Network error"] });
      setStep("result");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = EXPECTED_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Leads" className="max-w-3xl">
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Upload a CSV file with these exact column headers:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EXPECTED_HEADERS.map((h) => (
              <Badge key={h} variant="neutral">{h}</Badge>
            ))}
          </div>
          <button
            onClick={downloadTemplate}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            Download blank template
          </button>

          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Click to choose a CSV file
            </label>
          </div>

          {headerError && (
            <p className="text-sm text-danger">{headerError}</p>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {rows.length} lead{rows.length !== 1 ? "s" : ""} ready to import
            </p>
            <div className="flex items-center gap-2">
              {rows.some((r) => validateRow(r)) && (
                <Badge variant="warning">
                  {rows.filter((r) => validateRow(r)).length} with issues
                </Badge>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-secondary sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">#</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">Business</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">Phone</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">Source</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary">
                {rows.map((row, i) => {
                  const error = validateRow(row);
                  return (
                    <tr key={i} className={error ? "bg-danger/5" : ""}>
                      <td className="px-3 py-2 text-text-tertiary">{i + 1}</td>
                      <td className="px-3 py-2 text-text-primary font-medium">{row.name || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.businessName || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.phone || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.source || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.status || "New"}</td>
                      <td className="px-3 py-2">
                        {error && <span className="text-danger">{error}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} loading={importing}>
                Import {rows.filter((r) => !validateRow(r)).length} Leads
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          {result.imported > 0 ? (
            <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
              <p className="text-sm font-medium text-success">
                Successfully imported {result.imported} lead{result.imported !== 1 ? "s" : ""}
              </p>
              {result.skipped > 0 && (
                <p className="text-xs text-text-tertiary mt-1">
                  {result.skipped} skipped due to errors
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 text-center">
              <p className="text-sm font-medium text-danger">Import failed</p>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="max-h-32 overflow-auto text-xs text-text-secondary space-y-1">
              {result.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
