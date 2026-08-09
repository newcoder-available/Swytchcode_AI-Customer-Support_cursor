import { NextResponse } from "next/server";
import { processTicketThread } from "@/lib/gmail/process";
import { upsertTicketState } from "@/lib/gmail/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params;
    if (!threadId?.trim()) {
      return NextResponse.json(
        { ok: false, error: "threadId is required" },
        { status: 400 },
      );
    }

    let markResolved = false;
    let escalate = false;
    try {
      const body = (await request.json()) as {
        markResolved?: boolean;
        escalate?: boolean;
      };
      markResolved = Boolean(body.markResolved);
      escalate = Boolean(body.escalate);
    } catch {
      // empty body ok
    }

    if (markResolved) {
      upsertTicketState(threadId.trim(), {
        status: "RESOLVED",
        resolution: "Marked resolved by agent",
      });
      return NextResponse.json({ ok: true, status: "RESOLVED" });
    }

    if (escalate) {
      upsertTicketState(threadId.trim(), {
        status: "ESCALATED",
        escalated: true,
      });
      return NextResponse.json({ ok: true, status: "ESCALATED" });
    }

    const result = await processTicketThread(threadId.trim());
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "process failed",
      },
      { status: 500 },
    );
  }
}
