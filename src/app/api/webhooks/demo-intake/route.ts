/*
 * Demo intake webhook — receives leads from the LeeMaster Design
 * website's revenue analysis tool. Authenticated via shared secret.
 * The middleware already allows /api/webhooks/* through without session auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client } from "@/models/Client";
import { Activity } from "@/models/Activity";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function POST(request: NextRequest) {
  const webhookKey = request.headers.get("x-webhook-key");
  if (!webhookKey || webhookKey !== process.env.LD_HUB_WEBHOOK_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();

    const { name, businessName, phone, industry, city, source, analysisData } = body;

    if (!name && !businessName) {
      return NextResponse.json({ error: "name or businessName is required" }, { status: 400 });
    }

    // Duplicate detection by phone (same logic as POST /api/leads)
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized.length >= 7) {
        const phoneRegex = new RegExp(normalized.split("").join("\\D*"));
        const [existingLead, existingClient] = await Promise.all([
          Lead.findOne({ phone: { $regex: phoneRegex } }),
          Client.findOne({ phone: { $regex: phoneRegex } }),
        ]);
        if (existingLead) {
          return NextResponse.json(
            { error: `Duplicate lead found: ${existingLead.name}`, existingId: existingLead._id },
            { status: 409 }
          );
        }
        if (existingClient) {
          return NextResponse.json(
            { error: `Existing client found: ${existingClient.name}`, existingId: existingClient._id },
            { status: 409 }
          );
        }
      }
    }

    const lead = await Lead.create({
      name: name || businessName,
      businessName: businessName || name,
      phone,
      industry,
      city,
      status: "New",
      source: source || "Website",
      sourceDetail: "Revenue Analysis Tool",
      analysisData: analysisData
        ? {
            ...analysisData,
            analyzedAt: new Date(),
          }
        : undefined,
    });

    try {
      await Activity.create({
        type: "lead_created",
        description: `New lead from revenue analysis tool: ${lead.name}`,
        relatedEntityType: "lead",
        relatedEntityId: lead._id,
      });
    } catch {
      // Activity logging should never block
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("[Demo Intake Webhook] Error:", err);
    return NextResponse.json({ error: "Failed to process intake" }, { status: 500 });
  }
}
