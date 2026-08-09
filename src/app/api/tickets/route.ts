import { NextResponse } from "next/server";
import { createSupportTicketFromInput } from "@/lib/gmail/create";
import {
  getCreatedTicket,
  listCreatedTickets,
} from "@/lib/gmail/store";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_SUBJECT_CHARS,
  requireTrimmedString,
  sanitizeUserText,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (id) {
    const ticket = getCreatedTicket(id);
    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found", category: "not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ticket });
  }
  return NextResponse.json({
    ok: true,
    tickets: listCreatedTickets(),
  });
}

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
      customerName?: string;
      customerEmail?: string;
      subject?: string;
      description?: string;
      message?: string;
      priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      runAgent?: boolean;
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

    const subjectCheck = requireTrimmedString(
      parsed.subject,
      "subject",
      MAX_SUBJECT_CHARS,
    );
    const descriptionRaw = parsed.description ?? parsed.message;
    const descriptionCheck = requireTrimmedString(
      descriptionRaw,
      "description",
      MAX_DESCRIPTION_CHARS,
    );
    const emailCheck = requireTrimmedString(
      parsed.customerEmail,
      "customerEmail",
      254,
    );

    if (!subjectCheck.ok || !descriptionCheck.ok || !emailCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: !emailCheck.ok
            ? emailCheck.error
            : !subjectCheck.ok
              ? subjectCheck.error
              : descriptionCheck.error,
          category: "validation",
        },
        { status: 400 },
      );
    }

    const result = await createSupportTicketFromInput({
      customerName: sanitizeUserText(parsed.customerName?.trim() || ""),
      customerEmail: sanitizeUserText(emailCheck.value),
      subject: sanitizeUserText(subjectCheck.value),
      description: sanitizeUserText(descriptionCheck.value),
      priority: parsed.priority,
      runAgent: parsed.runAgent !== false,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "ticket create failed",
        category: "internal",
      },
      { status: 500 },
    );
  }
}
