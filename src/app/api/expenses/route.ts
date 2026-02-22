/*
 * Expense collection API routes.
 * GET: List expenses with optional type/category filters.
 * POST: Create a new expense.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");

    const filter: Record<string, string> = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    const expenses = await Expense.find(filter).sort({ date: -1 });
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const expense = await Expense.create(body);
    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
