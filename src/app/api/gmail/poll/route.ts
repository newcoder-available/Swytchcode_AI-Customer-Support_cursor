import { NextResponse } from "next/server";
import { listSupportTickets } from "@/lib/gmail/service";
import { processTicketThread } from "@/lib/gmail/process";
import { getTicketState } from "@/lib/gmail/store";
import { getExecMode } from "@/lib/swytchcode/health";

export const dynamic = "force-dynamic";

/**
 * Poll support inbox and process threads with new customer activity.
 * Interval polling — not webhooks.
 */
export async function POST() {
  try {
    const mode = getExecMode();
    if (mode !== "live") {
      return NextResponse.json({
        ok: true,
        mode: mode === "simulation" ? "demo" : "dry-run",
        ticketCount: 0,
        processed: [],
        skipped: true,
        reason:
          "Polling is idle until SWYTCHCODE_MODE=live and Gmail OAuth is connected.",
        pollIntervalMs: Number(process.env.GMAIL_POLL_INTERVAL_MS ?? "15000"),
      });
    }

    const listed = await listSupportTickets();
    if (!listed.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: listed.error || "Gmail connection unavailable",
          processed: [],
        },
        { status: 422 },
      );
    }

    const processed: Array<Record<string, unknown>> = [];
    for (const ticket of listed.tickets) {
      const last = ticket.messages?.[ticket.messages.length - 1];
      const state = getTicketState(ticket.id);
      const needsWork =
        ticket.status === "NEW" ||
        ticket.status === "CUSTOMER_REPLIED" ||
        (last?.role === "customer" &&
          last.id !== state?.lastProcessedMessageId);

      if (!needsWork) continue;
      const result = await processTicketThread(ticket.id);
      processed.push({ threadId: ticket.id, ...result });
    }

    return NextResponse.json({
      ok: true,
      mode: listed.mode,
      ticketCount: listed.tickets.length,
      processed,
      pollIntervalMs: Number(process.env.GMAIL_POLL_INTERVAL_MS ?? "15000"),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "poll failed",
        processed: [],
      },
      { status: 500 },
    );
  }
}
