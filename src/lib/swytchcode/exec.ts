import { exec, isSwytchcodeError, type ExecArgs } from "@swytchcode/runtime";
import {
  canonicalIdFor,
  isAllowedOperation,
  type AllowedOperation,
} from "@/lib/swytchcode/allowlist";
import { detectSwytchcode } from "@/lib/swytchcode/detect";
import { assertToolEnabled, getExecMode } from "@/lib/swytchcode/health";
import { simulateAllowed } from "@/lib/swytchcode/simulate";
import type { ExecMode, ExecutionChannel } from "@/lib/types";

export type ExecCategory =
  | "auth"
  | "permission_denied"
  | "policy_denied"
  | "policy_error"
  | "validation"
  | "not_found"
  | "network"
  | "rate_limit"
  | "internal"
  | "timeout"
  | "invalid_json"
  | "unavailable"
  | "allowlist"
  | "unknown";

export type SafeExecResult =
  | {
      ok: true;
      operation: AllowedOperation;
      canonicalId: string;
      mode: ExecMode;
      channel: ExecutionChannel;
      data: unknown;
      summary?: string;
    }
  | {
      ok: false;
      operation?: AllowedOperation;
      canonicalId?: string;
      mode: ExecMode;
      channel: ExecutionChannel;
      category: ExecCategory;
      retryable: boolean;
      error: string;
    };

const DEFAULT_TIMEOUT_MS = Number(process.env.SWYTCHCODE_TIMEOUT_MS ?? "25000");

function mapCategory(raw?: string): ExecCategory {
  switch (raw) {
    case "auth":
    case "permission_denied":
    case "policy_denied":
    case "policy_error":
    case "validation":
    case "not_found":
    case "network":
    case "rate_limit":
    case "internal":
      return raw;
    default:
      return "unknown";
  }
}

function asSimulation(
  operation: AllowedOperation,
  args: ExecArgs,
  reason: string,
): SafeExecResult {
  const sim = simulateAllowed(operation, args, reason);
  return {
    ok: true,
    operation: sim.operation,
    canonicalId: sim.canonicalId,
    mode: "simulation",
    channel: "simulation",
    data: sim.data,
    summary: sim.summary,
  };
}

/**
 * Execute an allowlisted operation.
 * Prefer real Swytchcode (dry-run or live). If unavailable, return a clearly
 * labeled in-app simulation — never pretend simulation is Swytchcode.
 */
export async function execAllowed(
  operation: string,
  args: ExecArgs,
): Promise<SafeExecResult> {
  const mode = getExecMode();

  if (!isAllowedOperation(operation)) {
    return {
      ok: false,
      mode,
      channel: mode === "simulation" ? "simulation" : "swytchcode",
      category: "allowlist",
      retryable: false,
      error: `Operation "${operation}" is not allowlisted`,
    };
  }

  const canonicalId = canonicalIdFor(operation);

  if (mode === "simulation") {
    return asSimulation(
      operation,
      args,
      "SWYTCHCODE_MODE=simulation",
    );
  }

  const cli = detectSwytchcode();
  if (!cli.available) {
    return asSimulation(
      operation,
      args,
      cli.error || "swytchcode CLI unavailable",
    );
  }

  const enabled = assertToolEnabled(canonicalId);
  if (!enabled.ok) {
    return asSimulation(
      operation,
      args,
      enabled.error || "tool not in tooling.json",
    );
  }

  try {
    const data = await exec(canonicalId, args, {
      cwd: process.cwd(),
      timeoutMs: DEFAULT_TIMEOUT_MS,
      dryRun: mode === "dry-run",
    });

    return {
      ok: true,
      operation,
      canonicalId,
      mode,
      channel: "swytchcode",
      data,
      summary:
        mode === "dry-run"
          ? `Swytchcode dry-run prepared request for ${canonicalId}`
          : `Swytchcode live execution of ${canonicalId}`,
    };
  } catch (err) {
    if (isSwytchcodeError(err)) {
      const message = err.message || "swytchcode exec failed";
      const timedOut = message.toLowerCase().includes("timed out");
      const category = timedOut
        ? "timeout"
        : message.toLowerCase().includes("invalid json")
          ? "invalid_json"
          : mapCategory(err.details?.category);

      // Demo reliability: fall back to labeled simulation on infra failures.
      if (
        category === "unavailable" ||
        category === "not_found" ||
        category === "timeout" ||
        category === "internal"
      ) {
        return asSimulation(operation, args, message);
      }

      return {
        ok: false,
        operation,
        canonicalId,
        mode,
        channel: "swytchcode",
        category,
        retryable: Boolean(err.details?.retryable) || timedOut,
        error: message,
      };
    }

    return asSimulation(
      operation,
      args,
      err instanceof Error ? err.message : "unknown execution error",
    );
  }
}
