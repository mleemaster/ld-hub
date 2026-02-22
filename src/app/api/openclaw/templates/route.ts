/*
 * Message template collection API routes.
 * GET: List all templates.
 * POST: Create a new template.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MessageTemplate } from "@/models/MessageTemplate";

export async function GET() {
  try {
    await connectDB();
    const templates = await MessageTemplate.find().sort({ type: 1 });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const template = await MessageTemplate.create(body);
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
