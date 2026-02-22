/*
 * Duplicate validation API endpoint.
 * GET: Check if a lead/client already exists by phone, email, or business name.
 * Auth: Bearer token checked against VALIDATE_API_KEY env var.
 * Searches both Lead and Client collections.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client } from "@/models/Client";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanBusinessName(name: string): string {
  return name
    .replace(/\b(LLC|Inc|Corp|Co|Ltd|Company|Services|Svcs)\.?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Match {
  id: string;
  type: "lead" | "client";
  businessName?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  matchedOn: string;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== process.env.VALIDATE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!phone && !email && !name) {
    return NextResponse.json(
      { error: "At least one query parameter required: phone, email, or name" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const matches: Match[] = [];
    const seenIds = new Set<string>();

    function addMatch(doc: Record<string, unknown>, type: "lead" | "client", matchedOn: string) {
      const id = String(doc._id);
      if (seenIds.has(id)) return;
      seenIds.add(id);
      matches.push({
        id,
        type,
        businessName: doc.businessName as string | undefined,
        name: doc.name as string | undefined,
        phone: doc.phone as string | undefined,
        email: doc.email as string | undefined,
        status: doc.status as string | undefined,
        matchedOn,
      });
    }

    const queries: Promise<void>[] = [];

    if (phone) {
      const digits = normalizePhone(phone);
      if (digits.length >= 7) {
        const phoneRegex = new RegExp(digits.split("").join("\\D*"));

        queries.push(
          Lead.find({ phone: { $regex: phoneRegex } }).lean().then((docs) => {
            for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "lead", "phone");
          })
        );
        queries.push(
          Client.find({ phone: { $regex: phoneRegex } }).lean().then((docs) => {
            for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "client", "phone");
          })
        );
      }
    }

    if (email) {
      const escaped = escapeRegex(email.trim());
      const emailRegex = new RegExp(`^${escaped}$`, "i");

      queries.push(
        Lead.find({ email: { $regex: emailRegex } }).lean().then((docs) => {
          for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "lead", "email");
        })
      );
      queries.push(
        Client.find({ email: { $regex: emailRegex } }).lean().then((docs) => {
          for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "client", "email");
        })
      );
    }

    if (name) {
      const cleaned = cleanBusinessName(name);
      if (cleaned.length >= 2) {
        const escaped = escapeRegex(cleaned);
        const nameRegex = new RegExp(escaped, "i");

        queries.push(
          Lead.find({ businessName: { $regex: nameRegex } }).lean().then((docs) => {
            for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "lead", "name");
          })
        );
        queries.push(
          Client.find({ businessName: { $regex: nameRegex } }).lean().then((docs) => {
            for (const doc of docs) addMatch(doc as unknown as Record<string, unknown>, "client", "name");
          })
        );
      }
    }

    await Promise.all(queries);

    return NextResponse.json({
      exists: matches.length > 0,
      matches,
    });
  } catch {
    return NextResponse.json({ error: "Validation check failed" }, { status: 500 });
  }
}
