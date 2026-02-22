/*
 * Duplicate scanning endpoint for existing leads.
 * GET: Scan all leads, group by normalized phone and lowercase email,
 * and return groups with 2+ entries as duplicates.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

interface DuplicateGroup {
  matchField: "email" | "phone";
  matchValue: string;
  leads: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    businessName?: string;
    status: string;
    source: string;
  }[];
}

export async function GET() {
  try {
    await connectDB();

    const leads = await Lead.find(
      {},
      { _id: 1, name: 1, email: 1, phone: 1, businessName: 1, status: 1, source: 1 }
    ).lean();

    const duplicates: DuplicateGroup[] = [];

    const emailGroups = new Map<string, typeof leads>();
    const phoneGroups = new Map<string, typeof leads>();

    for (const lead of leads) {
      if (lead.email) {
        const key = lead.email.toLowerCase().trim();
        const group = emailGroups.get(key) || [];
        group.push(lead);
        emailGroups.set(key, group);
      }

      if (lead.phone) {
        const normalized = normalizePhone(lead.phone);
        if (normalized.length >= 7) {
          const group = phoneGroups.get(normalized) || [];
          group.push(lead);
          phoneGroups.set(normalized, group);
        }
      }
    }

    for (const [email, group] of emailGroups) {
      if (group.length >= 2) {
        duplicates.push({
          matchField: "email",
          matchValue: email,
          leads: group.map((l) => ({
            _id: String(l._id),
            name: l.name,
            email: l.email,
            phone: l.phone,
            businessName: l.businessName,
            status: l.status,
            source: l.source,
          })),
        });
      }
    }

    for (const [phone, group] of phoneGroups) {
      if (group.length >= 2) {
        duplicates.push({
          matchField: "phone",
          matchValue: phone,
          leads: group.map((l) => ({
            _id: String(l._id),
            name: l.name,
            email: l.email,
            phone: l.phone,
            businessName: l.businessName,
            status: l.status,
            source: l.source,
          })),
        });
      }
    }

    return NextResponse.json({ duplicates });
  } catch {
    return NextResponse.json({ error: "Failed to scan for duplicates" }, { status: 500 });
  }
}
