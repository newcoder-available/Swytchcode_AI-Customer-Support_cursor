import { NextResponse } from "next/server";
import { runSupportAgent } from "@/lib/agent/answer";
import {
  MAX_MESSAGE_CHARS,
  requireTrimmedString,
  sanitizeUserText,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body", category: "validation" },
      { status: 400 },
    );
  }

  try {
    const parsed = body as {
      message?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      customerEmail?: string;
      autoExecute?: boolean;
    };

    const messageCheck = requireTrimmedString(
      parsed.message,
      "message",
      MAX_MESSAGE_CHARS,
    );
    if (!messageCheck.ok) {
      return NextResponse.json(
        { error: messageCheck.error, category: "validation" },
        { status: 400 },
      );
    }

    const result = await runSupportAgent({
      message: sanitizeUserText(messageCheck.value),
      history: parsed.history,
      customerEmail: parsed.customerEmail,
      autoExecute: parsed.autoExecute,
    });

    // Primary contract: structured agent fields at the top level.
    return NextResponse.json({
      intent: result.intent,
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      action_required: result.action_required,
      action: result.action,
      execution: result.execution,
      escalated: result.escalated,
      message: result.message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "chat failed",
        category: "internal",
      },
      { status: 500 },
    );
  }
}
