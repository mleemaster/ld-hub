/*
 * Individual message template API routes.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MessageTemplate } from "@/models/MessageTemplate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const template = await MessageTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const template = await MessageTemplate.findByIdAndUpdate(id, body, { new: true });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const template = await MessageTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Template deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
