/*
 * API routes for client collection operations.
 * GET: List clients with optional plan/status/ppc filters.
 * POST: Create a new client record.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const planTier = searchParams.get("planTier");
    const projectStatus = searchParams.get("projectStatus");
    const ppcClient = searchParams.get("ppcClient");

    const filter: Record<string, string | boolean> = {};
    if (planTier) filter.planTier = planTier;
    if (projectStatus) filter.projectStatus = projectStatus;
    if (ppcClient) filter.ppcClient = ppcClient === "true";

    const clients = await Client.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(clients);
  } catch {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const client = await Client.create(body);
    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
