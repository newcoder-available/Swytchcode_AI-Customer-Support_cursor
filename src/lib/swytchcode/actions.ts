import type { ExecArgs } from "@swytchcode/runtime";
import { execAllowed, type SafeExecResult } from "@/lib/swytchcode/exec";
import { getExecMode } from "@/lib/swytchcode/health";
import type { ActionResult, TicketRecord } from "@/lib/types";

function stripeAuthHeader(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return undefined;
  return key.startsWith("Bearer ") ? key : `Bearer ${key}`;
}

function intercomAuthHeader(): string | undefined {
  const key = process.env.INTERCOM_ACCESS_TOKEN?.trim();
  if (!key) return undefined;
  return key.startsWith("Bearer ") ? key : `Bearer ${key}`;
}

/**
 * In dry-run mode Swytchcode still requires a credential placeholder for some
 * providers (e.g. Stripe). Never send real secrets to the browser — only use
 * server env. For dry-run without keys, use a non-secret placeholder so the
 * kernel can render the request preview.
 */
function authForProvider(
  provider: "stripe" | "intercom",
  mode: "dry-run" | "live" | "simulation",
): string | { error: string } {
  if (provider === "stripe") {
    const live = stripeAuthHeader();
    if (live) return live;
    if (mode === "dry-run" || mode === "simulation") {
      return "Bearer sk_test_dry_run_placeholder";
    }
    return {
      error:
        "STRIPE_SECRET_KEY is required for live refunds. Set it in .env.local (server-only).",
    };
  }

  const live = intercomAuthHeader();
  if (live) return live;
  if (mode === "dry-run" || mode === "simulation") {
    return "Bearer intercom_dry_run_placeholder";
  }
  return {
    error:
      "INTERCOM_ACCESS_TOKEN is required for live tickets. Set it in .env.local (server-only).",
  };
}

function toActionResult(
  operation: string,
  result: SafeExecResult,
  summaryOk: string,
): ActionResult {
  if (!result.ok) {
    return {
      ok: false,
      action: operation,
      mode: result.mode,
      channel: result.channel,
      summary: result.error,
      error: `${result.category}${result.retryable ? " (retryable)" : ""}`,
      data: {
        category: result.category,
        retryable: result.retryable,
        canonicalId: result.canonicalId,
        channel: result.channel,
      },
    };
  }

  return {
    ok: true,
    action: operation,
    mode: result.mode,
    channel: result.channel,
    summary: result.summary || summaryOk,
    data: {
      canonicalId: result.canonicalId,
      execMode: result.mode,
      channel: result.channel,
      result: result.data as Record<string, unknown>,
    },
  };
}

function ticketFromIntercomPayload(
  data: unknown,
  fallback: Partial<TicketRecord>,
): TicketRecord | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  // Simulation payload nests ticket under .ticket
  if (obj.simulated === true && obj.ticket && typeof obj.ticket === "object") {
    const t = obj.ticket as Record<string, unknown>;
    const id = String(t.ticket_id ?? t.id ?? "TCK-DEMO-1001");
    const statusRaw = String(t.status ?? "open").toLowerCase();
    const status: TicketRecord["status"] = statusRaw.includes("resolv")
      ? "resolved"
      : statusRaw.includes("pend")
        ? "pending"
        : "open";
    return {
      id,
      subject: String(t.subject ?? fallback.subject ?? "Demo ticket"),
      description: String(t.description ?? fallback.description ?? ""),
      status,
      priority: fallback.priority ?? "high",
      customerEmail: fallback.customerEmail ?? "demo@resolve.ai",
      createdAt: String(t.created_at ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      source: "demo",
    };
  }

  // dry-run returns { method, url, headers, body }
  if ("url" in obj && "method" in obj) {
    const body = obj.body as Record<string, unknown> | undefined;
    const attrs = body?.ticket_attributes as Record<string, unknown> | undefined;
    return {
      id: "DRY-RUN-TICKET",
      subject: String(attrs?._default_title_ ?? fallback.subject ?? "Ticket"),
      description: String(
        attrs?._default_description_ ?? fallback.description ?? "",
      ),
      status: "open",
      priority: fallback.priority ?? "normal",
      customerEmail: fallback.customerEmail ?? "demo@resolve.ai",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "swytchcode",
    };
  }

  const id = String(obj.ticket_id ?? obj.id ?? "");
  if (!id) return undefined;
  const state = obj.ticket_state as { category?: string } | string | undefined;
  const statusRaw =
    typeof state === "string"
      ? state
      : state?.category?.toLowerCase() ?? (obj.open === false ? "resolved" : "open");
  const status: TicketRecord["status"] = statusRaw.includes("resolv")
    ? "resolved"
    : statusRaw.includes("pend")
      ? "pending"
      : "open";

  return {
    id,
    subject: String(
      (obj.ticket_attributes as Record<string, unknown> | undefined)
        ?._default_title_ ?? fallback.subject ?? "Support ticket",
    ),
    description: String(
      (obj.ticket_attributes as Record<string, unknown> | undefined)
        ?._default_description_ ?? fallback.description ?? "",
    ),
    status,
    priority: fallback.priority ?? "normal",
    customerEmail: fallback.customerEmail ?? "demo@resolve.ai",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "swytchcode",
  };
}

export async function createTicket(input: {
  subject: string;
  description: string;
  customerEmail: string;
  priority?: TicketRecord["priority"];
}): Promise<ActionResult & { ticket?: TicketRecord }> {
  const mode = getExecMode();
  const auth = authForProvider("intercom", mode);
  if (typeof auth !== "string") {
    return {
      ok: false,
      action: "ticket.create",
      mode: "live",
      summary: auth.error,
      error: "auth",
    };
  }

  const ticketTypeId =
    process.env.INTERCOM_TICKET_TYPE_ID?.trim() || "1";

  const args: ExecArgs = {
    Authorization: auth,
    body: {
      ticket_type_id: ticketTypeId,
      contacts: [{ email: input.customerEmail }],
      ticket_attributes: {
        _default_title_: input.subject,
        _default_description_: input.description,
      },
      // company_id: "123",
      // conversation_to_link_id: "conv_123",
    },
  };

  // Returns: Intercom ticket object (id, ticket_id, ticket_state, ...) or dry-run request preview
  const result = await execAllowed("ticket.create", args);
  const action = toActionResult(
    "ticket.create",
    result,
    result.ok
      ? result.channel === "simulation"
        ? "SIMULATION (not Swytchcode): demo ticket created"
        : result.mode === "dry-run"
          ? "Swytchcode dry-run: Intercom ticket create request prepared"
          : "Ticket created via Swytchcode (intercom.ticket.create)"
      : "",
  );

  if (!result.ok) return action;

  const payload =
    result.data && typeof result.data === "object" && "result" in result.data
      ? (result.data as { result: unknown }).result
      : result.data;
  const ticket = ticketFromIntercomPayload(payload, input);
  return { ...action, ticket };
}

export async function getTicket(
  ticketId: string,
): Promise<ActionResult & { ticket?: TicketRecord }> {
  const mode = getExecMode();
  const auth = authForProvider("intercom", mode);
  if (typeof auth !== "string") {
    return {
      ok: false,
      action: "ticket.get",
      mode: "live",
      summary: auth.error,
      error: "auth",
    };
  }

  const id = ticketId.trim();
  if (!id) {
    return {
      ok: false,
      action: "ticket.get",
      mode,
      summary: "ticketId is required",
      error: "validation",
    };
  }

  const args: ExecArgs = {
    Authorization: auth,
    params: { ticket_id: id },
  };

  // Returns: Intercom ticket object or dry-run request preview
  const result = await execAllowed("ticket.get", args);
  const action = toActionResult(
    "ticket.get",
    result,
    result.ok
      ? result.channel === "simulation"
        ? `SIMULATION (not Swytchcode): lookup for ticket ${id}`
        : result.mode === "dry-run"
          ? `Swytchcode dry-run: lookup prepared for ticket ${id}`
          : `Ticket ${id} fetched via Swytchcode (intercom.ticket.get)`
      : "",
  );

  if (!result.ok) return action;
  const payload =
    result.data && typeof result.data === "object" && "result" in result.data
      ? result.data.result
      : result.data;
  const ticket = ticketFromIntercomPayload(payload, {
    subject: `Ticket ${id}`,
    description: "",
    customerEmail: "demo@resolve.ai",
  });
  return { ...action, ticket };
}

export async function runRefundAction(input: {
  chargeId: string;
  amountCents?: number;
  reason?: string;
}): Promise<ActionResult> {
  const mode = getExecMode();
  const auth = authForProvider("stripe", mode);
  if (typeof auth !== "string") {
    return {
      ok: false,
      action: "refund",
      mode: "live",
      summary: auth.error,
      error: "auth",
    };
  }

  const chargeId = input.chargeId.trim();
  if (!chargeId) {
    return {
      ok: false,
      action: "refund",
      mode,
      summary: "chargeId is required",
      error: "validation",
    };
  }

  const args: ExecArgs = {
    Authorization: auth,
    params: { charge: chargeId },
    // amount: input.amountCents,
    // reason: input.reason ?? "requested_by_customer",
  };

  // Returns: Stripe charge/refund object or dry-run request preview
  const result = await execAllowed("refund", args);
  return toActionResult(
    "refund",
    result,
    result.ok
      ? result.mode === "dry-run"
        ? `Swytchcode dry-run: refund request prepared for ${chargeId}`
        : `Refund executed via Swytchcode (stripe.charge.refund) for ${chargeId}`
      : "",
  );
}
