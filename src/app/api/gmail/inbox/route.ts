import { NextResponse } from "next/server";
import { listSupportTickets } from "@/lib/gmail/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listed = await listSupportTickets();
    return NextResponse.json({
      ok: listed.ok,
      mode: listed.mode,
      connection: listed.connection,
      tickets: listed.tickets,
      error: listed.error,
      pollIntervalMs: Number(process.env.GMAIL_POLL_INTERVAL_MS ?? "15000"),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "inbox failed",
        tickets: [],
        connection: {
          connected: false,
          emailAddress: null,
          mode: "demo",
          error: "Gmail connection unavailable",
        },
      },
      { status: 500 },
    );
  }
}
