import type { ExecArgs } from "@swytchcode/runtime";
import { execAllowed } from "@/lib/swytchcode/exec";
import { getExecMode } from "@/lib/swytchcode/health";
import type { AllowedOperation } from "@/lib/swytchcode/allowlist";

/**
 * Gmail OAuth is managed by Swytchcode (`swytchcode auth connect Gmail`).
 * For dry-run without connected auth, pass a non-secret placeholder so the
 * kernel can preview the request. Never put real tokens in the frontend.
 */
function gmailAuthHeader(): string | { error: string } {
  const mode = getExecMode();
  const fromEnv =
    process.env.GMAIL_ACCESS_TOKEN?.trim() ||
    process.env.GOOGLE_ACCESS_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("Bearer ") ? fromEnv : `Bearer ${fromEnv}`;
  }
  // Swytchcode runtime may inject OAuth from `swytchcode auth` credentials.
  // Still provide Authorization key as required by the method contract.
  if (mode === "dry-run" || mode === "simulation") {
    return "Bearer gmail_oauth_dry_run_placeholder";
  }
  // Live mode: still pass a bearer placeholder key name; connected OAuth
  // credentials from Swytchcode auth are preferred by the kernel when present.
  return "Bearer gmail_oauth_runtime";
}

export async function gmailExec(operation: AllowedOperation, args: ExecArgs) {
  const auth = gmailAuthHeader();
  if (typeof auth !== "string") {
    return {
      ok: false as const,
      mode: getExecMode(),
      channel: "swytchcode" as const,
      category: "auth" as const,
      retryable: false,
      error: auth.error,
    };
  }
  return execAllowed(operation, {
    ...args,
    Authorization: auth,
  });
}

export function unwrapData(result: { ok: boolean; data?: unknown }) {
  if (!result.ok) return null;
  const data = result.data;
  if (data && typeof data === "object" && "result" in data) {
    return (data as { result: unknown }).result;
  }
  return data ?? null;
}
