import { NextResponse } from "next/server";
import { replyToTicket } from "@/lib/gmail/service";
import { MAX_DESCRIPTION_CHARS, requireTrimmedString, sanitizeUserText } from "@/lib/validation";

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = body as { body?: string };
    const check = requireTrimmedString(parsed.body, "body", MAX_DESCRIPTION_CHARS);
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.error },
        { status: 400 },
      );
    }

    const result = await replyToTicket({
      threadId: threadId.trim(),
      body: sanitizeUserText(check.value),
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "reply failed",
      },
      { status: 500 },
    );
  }
}
