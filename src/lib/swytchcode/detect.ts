import { runSwytchcodeCli } from "@/lib/swytchcode/cli";

export type SwytchcodeAvailability = {
  available: boolean;
  version: string | null;
  binHint: string | null;
  error?: string;
};

export function detectSwytchcode(): SwytchcodeAvailability {
  const result = runSwytchcodeCli(["-v"], { timeoutMs: 8_000 });
  if (!result.ok) {
    const missing =
      result.error?.includes("ENOENT") ||
      result.error?.toLowerCase().includes("not found") ||
      result.error?.toLowerCase().includes("failed to spawn");
    return {
      available: false,
      version: null,
      binHint: null,
      error: missing
        ? "swytchcode CLI not found. Install with: npm install -g swytchcode"
        : result.error || "swytchcode detection failed",
    };
  }

  const text = result.stdout || result.stderr;
  const match =
    text.match(/swytchcode version\s+([^\s]+)/i) ||
    text.match(/(\d+\.\d+\.\d+)/);
  const version = match?.[1] ?? (text.slice(0, 40) || null);
  return {
    available: true,
    version,
    binHint: "swytchcode",
  };
}
