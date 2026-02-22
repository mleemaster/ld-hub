/*
 * Individual expense API routes.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
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
    const expense = await Expense.findByIdAndUpdate(id, body, { new: true });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Expense deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
