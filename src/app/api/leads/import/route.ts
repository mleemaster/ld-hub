/*
 * Bulk lead import API route.
 * POST: Accepts an array of lead objects, validates, and inserts.
 * Logs a single activity entry for the import batch.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead, LEAD_STATUSES, LEAD_SOURCES } from "@/models/Lead";
import { LeadSource } from "@/models/LeadSource";
import { Activity } from "@/models/Activity";

function resolveEnum<T extends string>(value: string, allowed: readonly T[]): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = allowed.find((v) => v.toLowerCase() === trimmed.toLowerCase());
  return match ?? null;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { leads: rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    const customSources = await LeadSource.find().lean();
    const allSourceNames = [...new Set([...LEAD_SOURCES, ...customSources.map((s) => s.name)])];

    function resolveSource(value: string): string | null {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return allSourceNames.find((s) => s.toLowerCase() === trimmed.toLowerCase()) ?? null;
    }

    const newSourceNames = new Set<string>();

    const validLeads = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const resolvedStatus = row.status?.trim()
        ? resolveEnum(row.status, LEAD_STATUSES)
        : null;
      let resolvedSource = row.source?.trim()
        ? resolveSource(row.source)
        : null;

      if (!resolvedSource && row.source?.trim()) {
        const name = row.source.trim();
        resolvedSource = name;
        newSourceNames.add(name);
      }

      validLeads.push({
        name: row.name?.trim() || row.businessName?.trim() || "Unknown",
        businessName: row.businessName?.trim() || undefined,
        phone: row.phone?.trim() || undefined,
        email: row.email?.trim() || undefined,
        website: row.website?.trim() || undefined,
        status: resolvedStatus || "New",
        source: resolvedSource || "Other",
        industry: row.industry?.trim() || undefined,
        state: row.state?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
        followUpDate: row.followUpDate || undefined,
        lastContactedDate: row.lastContactedDate || undefined,
        callScheduledDate: row.callScheduledDate || undefined,
        createdAt: row.createdAt || undefined,
      });
    }

    if (validLeads.length === 0) {
      return NextResponse.json({ error: "No valid leads to import", errors }, { status: 400 });
    }

    for (const sourceName of newSourceNames) {
      try {
        await LeadSource.create({ name: sourceName });
      } catch {
        // Ignore duplicates
      }
    }

    const inserted = await Lead.insertMany(validLeads);

    try {
      await Activity.create({
        type: "lead_created",
        description: `Imported ${inserted.length} leads from CSV`,
      });
    } catch {
      // Activity logging should never block import
    }

    return NextResponse.json({
      imported: inserted.length,
      skipped: rows.length - validLeads.length,
      errors,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
