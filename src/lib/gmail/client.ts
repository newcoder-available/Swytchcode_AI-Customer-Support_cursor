import type { ExecArgs } from "@swytchcode/runtime";
import { execAllowed } from "@/lib/swytchcode/exec";
import { getExecMode } from "@/lib/swytchcode/health";
import type { AllowedOperation } from "@/lib/swytchcode/allowlist";

/**
 * Gmail OAuth is managed by Swytchcode (`swytchcode auth connect Gmail`).
 * Never put real tokens in the frontend.
 *
 * Live mode: do NOT pass a fake Authorization header — that overrides the
 * connected OAuth account and causes 401 Invalid Credentials.
 * Dry-run / simulation: pass a non-secret placeholder so the kernel can
 * preview the request shape.
 */
function gmailAuthHeader(): string | undefined | { error: string } {
  const mode = getExecMode();
  const fromEnv =
    process.env.GMAIL_ACCESS_TOKEN?.trim() ||
    process.env.GOOGLE_ACCESS_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("Bearer ") ? fromEnv : `Bearer ${fromEnv}`;
  }
  if (mode === "dry-run" || mode === "simulation") {
    return "Bearer gmail_oauth_dry_run_placeholder";
  }
  // Live: rely on `swytchcode auth connect Gmail` injected credentials.
  return undefined;
}

export async function gmailExec(operation: AllowedOperation, args: ExecArgs) {
  const auth = gmailAuthHeader();
  if (auth && typeof auth !== "string") {
    return {
      ok: false as const,
      mode: getExecMode(),
      channel: "swytchcode" as const,
      category: "auth" as const,
      retryable: false,
      error: auth.error,
    };
  }

  const payload: ExecArgs = { ...args };
  if (auth) {
    payload.Authorization = auth;
  }

  return execAllowed(operation, payload);
}

export function unwrapData(result: { ok: boolean; data?: unknown }) {
  if (!result.ok) return null;
  const data = result.data;
  if (data && typeof data === "object" && "result" in data) {
    return (data as { result: unknown }).result;
  }
  return data ?? null;
}

/** Normalize Gmail send/list payloads and detect provider auth failures. */
export function readGmailPayload(result: { ok: boolean; data?: unknown }): {
  data: Record<string, unknown>;
  httpError?: string;
  statusCode?: number;
} {
  const raw = unwrapData(result);
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const statusCode =
    typeof root.status_code === "number" ? root.status_code : undefined;
  const nestedData =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const errObj =
    nestedData.error && typeof nestedData.error === "object"
      ? (nestedData.error as Record<string, unknown>)
      : null;

  if (statusCode && statusCode >= 400) {
    return {
      data: nestedData,
      statusCode,
      httpError:
        String(errObj?.message || `Gmail HTTP ${statusCode}`) ||
        "Gmail request failed",
    };
  }
  if (errObj?.message) {
    return {
      data: nestedData,
      statusCode: typeof errObj.code === "number" ? errObj.code : statusCode,
      httpError: String(errObj.message),
    };
  }

  // Some responses nest the message under data
  if (nestedData.id || nestedData.threadId || nestedData.threads) {
    return { data: nestedData };
  }
  return { data: root };
}
