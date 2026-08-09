import { NextResponse } from "next/server";
import { runRefundAction } from "@/lib/swytchcode/actions";
import {
  MAX_ID_CHARS,
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
      { ok: false, error: "invalid JSON body", category: "validation" },
      { status: 400 },
    );
  }

  try {
    const parsed = body as {
      action?: "refund";
      chargeId?: string;
      amountCents?: number;
      reason?: string;
      canonical_id?: unknown;
      command?: unknown;
    };

    if (parsed.canonical_id != null || parsed.command != null) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "canonical_id/command overrides are not allowed; operations are server-allowlisted",
          category: "allowlist",
        },
        { status: 400 },
      );
    }

    if ((parsed.action ?? "refund") !== "refund") {
      return NextResponse.json(
        { ok: false, error: "unsupported action", category: "allowlist" },
        { status: 400 },
      );
    }

    const chargeCheck = requireTrimmedString(
      parsed.chargeId,
      "chargeId",
      MAX_ID_CHARS,
    );
    if (!chargeCheck.ok) {
      return NextResponse.json(
        { ok: false, error: chargeCheck.error, category: "validation" },
        { status: 400 },
      );
    }

    const result = await runRefundAction({
      chargeId: sanitizeUserText(chargeCheck.value),
      amountCents: parsed.amountCents,
      reason: parsed.reason,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "action failed",
        category: "internal",
      },
      { status: 500 },
    );
  }
}
