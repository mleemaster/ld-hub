/*
 * iMessage send API route.
 * Accepts { phone, message, leadId?, leadName? } and invokes the `imsg`
 * CLI tool to deliver an iMessage. Uses execFile with an args array
 * to prevent command injection. Logs a "message_sent" OpenClawActivity
 * on success so it shows up in the OpenClaw activity feed.
 */
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { connectDB } from "@/lib/db";
import { OpenClawActivity } from "@/models/OpenClawActivity";

export async function POST(request: NextRequest) {
  try {
    const { phone, message, leadId, leadName } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    return await new Promise<NextResponse>((resolve) => {
      execFile("/opt/homebrew/bin/imsg", ["send", "--to", phone, "--text", message], async (error, stdout, stderr) => {
        if (error) {
          resolve(
            NextResponse.json(
              { error: stderr?.trim() || error.message },
              { status: 500 }
            )
          );
          return;
        }

        try {
          await connectDB();
          await OpenClawActivity.create({
            type: "message_sent",
            details: `iMessage sent to ${leadName || phone}`,
            ...(leadId ? { relatedLeadId: leadId } : {}),
          });
        } catch {
          // Activity logging should never block the response
        }

        resolve(NextResponse.json({ success: true, output: stdout?.trim() }));
      });
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
