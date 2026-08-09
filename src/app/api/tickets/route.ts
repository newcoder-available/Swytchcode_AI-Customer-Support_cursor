import { NextResponse } from "next/server";
import { createTicket, getTicket } from "@/lib/swytchcode/actions";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_ID_CHARS,
  MAX_SUBJECT_CHARS,
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
      action?: "create" | "get";
      ticketId?: string;
      subject?: string;
      description?: string;
      customerEmail?: string;
      priority?: "low" | "normal" | "high";
      /** Ignored — operations are allowlisted server-side only. */
      canonical_id?: unknown;
      command?: unknown;
    };

    // Reject attempts to override the Swytchcode canonical ID from the client.
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

    if (parsed.action === "get") {
      const idCheck = requireTrimmedString(
        parsed.ticketId,
        "ticketId",
        MAX_ID_CHARS,
      );
      if (!idCheck.ok) {
        return NextResponse.json(
          { ok: false, error: idCheck.error, category: "validation" },
          { status: 400 },
        );
      }
      const result = await getTicket(sanitizeUserText(idCheck.value));
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }

    if (parsed.action === "create" || !parsed.action) {
      const subjectCheck = requireTrimmedString(
        parsed.subject,
        "subject",
        MAX_SUBJECT_CHARS,
      );
      const descriptionCheck = requireTrimmedString(
        parsed.description,
        "description",
        MAX_DESCRIPTION_CHARS,
      );
      if (!subjectCheck.ok || !descriptionCheck.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: !subjectCheck.ok
              ? subjectCheck.error
              : descriptionCheck.error,
            category: "validation",
          },
          { status: 400 },
        );
      }
      const result = await createTicket({
        subject: sanitizeUserText(subjectCheck.value),
        description: sanitizeUserText(descriptionCheck.value),
        customerEmail: parsed.customerEmail?.trim() || "demo@resolve.ai",
        priority: parsed.priority,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }

    return NextResponse.json(
      { ok: false, error: "unknown action", category: "validation" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "ticket action failed",
        category: "internal",
      },
      { status: 500 },
    );
  }
}
