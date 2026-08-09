import type { AllowedOperation } from "@/lib/swytchcode/allowlist";
import { canonicalIdFor } from "@/lib/swytchcode/allowlist";
import type { ExecArgs } from "@swytchcode/runtime";

/**
 * Deterministic in-app simulation used ONLY when Swytchcode cannot run.
 * Never labeled as a real Swytchcode / provider call.
 */
export function simulateAllowed(
  operation: AllowedOperation,
  args: ExecArgs,
  reason: string,
): {
  ok: true;
  operation: AllowedOperation;
  canonicalId: string;
  mode: "simulation";
  channel: "simulation";
  data: Record<string, unknown>;
  summary: string;
} {
  const canonicalId = canonicalIdFor(operation);
  const now = "2026-08-09T12:00:00.000Z";

  if (operation === "ticket.create") {
    const body = (args.body ?? {}) as Record<string, unknown>;
    const attrs = (body.ticket_attributes ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      operation,
      canonicalId,
      mode: "simulation",
      channel: "simulation",
      summary: `SIMULATION (not Swytchcode): created demo ticket TCK-DEMO-1001 — ${reason}`,
      data: {
        simulated: true,
        channel: "simulation",
        reason,
        ticket: {
          id: "TCK-DEMO-1001",
          ticket_id: "TCK-DEMO-1001",
          subject: String(attrs._default_title_ ?? "Demo ticket"),
          description: String(attrs._default_description_ ?? ""),
          status: "open",
          priority: "high",
          created_at: now,
        },
      },
    };
  }

  if (operation === "ticket.get") {
    const ticketId = String(args.params?.ticket_id ?? "2154214521");
    return {
      ok: true,
      operation,
      canonicalId,
      mode: "simulation",
      channel: "simulation",
      summary: `SIMULATION (not Swytchcode): ticket ${ticketId} is pending — ${reason}`,
      data: {
        simulated: true,
        channel: "simulation",
        reason,
        ticket: {
          id: ticketId,
          ticket_id: ticketId,
          status: "pending",
          open: true,
          created_at: now,
        },
      },
    };
  }

  // refund
  const charge = String(args.params?.charge ?? "ch_demo_123");
  return {
    ok: true,
    operation,
    canonicalId,
    mode: "simulation",
    channel: "simulation",
    summary: `SIMULATION (not Swytchcode): refund queued for ${charge} — ${reason}`,
    data: {
      simulated: true,
      channel: "simulation",
      reason,
      refund: {
        id: "re_demo_sim_001",
        charge,
        status: "succeeded",
        amount: 2500,
        currency: "usd",
      },
    },
  };
}
