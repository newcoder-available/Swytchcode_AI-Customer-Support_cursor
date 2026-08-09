import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOWED_CANONICAL_IDS,
  OPERATION_ALLOWLIST,
  type AllowedOperation,
} from "@/lib/swytchcode/allowlist";
import { parseJsonStdout, runSwytchcodeCli } from "@/lib/swytchcode/cli";
import { detectSwytchcode } from "@/lib/swytchcode/detect";

type ToolingCache = {
  at: number;
  methods: ToolingEntry[];
  ok: boolean;
  error?: string;
};

let toolingCache: ToolingCache | null = null;
const TOOLING_CACHE_MS = 60_000;

export type ToolingEntry = {
  canonical_id: string;
  integration?: string;
};

export type HealthReport = {
  ok: boolean;
  checkedAt: string;
  cli: ReturnType<typeof detectSwytchcode>;
  execMode: "dry-run" | "live" | "simulation";
  tooling: {
    ok: boolean;
    methods: ToolingEntry[];
    error?: string;
  };
  allowlist: Array<{
    operation: AllowedOperation;
    canonicalId: string;
    enabled: boolean;
  }>;
  doctor?: {
    ok: boolean;
    summary: string;
  };
  notes: string[];
};

export function getExecMode(): "dry-run" | "live" | "simulation" {
  const mode = process.env.SWYTCHCODE_MODE?.trim().toLowerCase();
  if (mode === "live") return "live";
  if (mode === "simulation" || mode === "simulate") return "simulation";
  return "dry-run";
}

/**
 * Prefer reading local tooling.json (fast). Fall back to CLI with a short TTL cache.
 * Calling `swytchcode list tooling` on every exec made the inbox hang for 20–40s.
 */
export function listEnabledTooling(options?: { force?: boolean }): {
  ok: boolean;
  methods: ToolingEntry[];
  error?: string;
} {
  const now = Date.now();
  if (
    !options?.force &&
    toolingCache &&
    now - toolingCache.at < TOOLING_CACHE_MS
  ) {
    return {
      ok: toolingCache.ok,
      methods: toolingCache.methods,
      error: toolingCache.error,
    };
  }

  const fromFile = readToolingFromDisk();
  if (fromFile.ok && fromFile.methods.length > 0) {
    toolingCache = { at: now, ...fromFile };
    return fromFile;
  }

  const result = runSwytchcodeCli(["list", "tooling", "--json"], {
    timeoutMs: 8_000,
  });
  if (!result.ok) {
    const failed = {
      ok: false as const,
      methods: [] as ToolingEntry[],
      error: result.error || fromFile.error || "failed to list tooling",
    };
    toolingCache = { at: now, ...failed };
    return failed;
  }

  const parsed = parseJsonStdout<{ methods?: ToolingEntry[] } | ToolingEntry[]>(
    result.stdout,
  );
  if (!parsed.ok) {
    const failed = {
      ok: false as const,
      methods: [] as ToolingEntry[],
      error: parsed.error,
    };
    toolingCache = { at: now, ...failed };
    return failed;
  }

  const methods = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data.methods ?? [];
  const ok = { ok: true as const, methods };
  toolingCache = { at: now, ...ok };
  return ok;
}

function readToolingFromDisk(): {
  ok: boolean;
  methods: ToolingEntry[];
  error?: string;
} {
  try {
    const path = join(process.cwd(), ".swytchcode", "tooling.json");
    if (!existsSync(path)) {
      return { ok: false, methods: [], error: "tooling.json missing" };
    }
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      tools?: Record<string, { integration?: string }>;
    };
    const methods: ToolingEntry[] = Object.entries(raw.tools || {}).map(
      ([canonical_id, meta]) => ({
        canonical_id,
        integration: meta?.integration,
      }),
    );
    return { ok: true, methods };
  } catch (err) {
    return {
      ok: false,
      methods: [],
      error: err instanceof Error ? err.message : "tooling.json read failed",
    };
  }
}

export function assertToolEnabled(canonicalId: string): {
  ok: boolean;
  error?: string;
} {
  if (!ALLOWED_CANONICAL_IDS.has(canonicalId)) {
    return { ok: false, error: `canonical_id not in app allowlist: ${canonicalId}` };
  }
  const tooling = listEnabledTooling();
  if (!tooling.ok) {
    return { ok: false, error: tooling.error || "tooling check failed" };
  }
  const enabled = tooling.methods.some((m) => m.canonical_id === canonicalId);
  if (!enabled) {
    return {
      ok: false,
      error: `tool "${canonicalId}" is not in tooling.json. Run: swytchcode add method ${canonicalId}`,
    };
  }
  return { ok: true };
}

export function getHealthReport(): HealthReport {
  const cli = detectSwytchcode();
  const execMode = getExecMode();
  const notes: string[] = [];

  if (!cli.available) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      cli,
      execMode,
      tooling: { ok: false, methods: [], error: "cli unavailable" },
      allowlist: (Object.keys(OPERATION_ALLOWLIST) as AllowedOperation[]).map(
        (operation) => ({
          operation,
          canonicalId: OPERATION_ALLOWLIST[operation],
          enabled: false,
        }),
      ),
      notes: [cli.error || "Install swytchcode globally to continue."],
    };
  }

  const tooling = listEnabledTooling();
  const enabledIds = new Set(tooling.methods.map((m) => m.canonical_id));
  const allowlist = (Object.keys(OPERATION_ALLOWLIST) as AllowedOperation[]).map(
    (operation) => {
      const canonicalId = OPERATION_ALLOWLIST[operation];
      return {
        operation,
        canonicalId,
        enabled: enabledIds.has(canonicalId),
      };
    },
  );

  const missing = allowlist.filter((a) => !a.enabled);
  if (missing.length) {
    notes.push(
      `Missing from tooling: ${missing.map((m) => m.canonicalId).join(", ")}`,
    );
  }

  if (execMode === "simulation") {
    notes.push(
      "SWYTCHCODE_MODE=simulation: in-app deterministic fallback only — not a real Swytchcode call.",
    );
  } else if (execMode === "dry-run") {
    notes.push(
      "SWYTCHCODE_MODE=dry-run: real Swytchcode kernel with --dry-run (no live provider HTTP). Falls back to labeled simulation if CLI/tooling is unavailable.",
    );
  } else {
    notes.push(
      "SWYTCHCODE_MODE=live: real provider calls via Swytchcode. Falls back to labeled simulation if CLI/tooling is unavailable.",
    );
  }

  let doctor: HealthReport["doctor"];
  const doctorResult = runSwytchcodeCli(["doctor"], { timeoutMs: 15_000 });
  if (doctorResult.ok || doctorResult.stdout || doctorResult.stderr) {
    const summary = (doctorResult.stdout || doctorResult.stderr).slice(0, 500);
    doctor = {
      ok: doctorResult.ok || summary.includes("All checks passed"),
      summary,
    };
  }

  const ok =
    cli.available &&
    tooling.ok &&
    allowlist.every((a) => a.enabled);

  return {
    ok,
    checkedAt: new Date().toISOString(),
    cli,
    execMode,
    tooling,
    allowlist,
    doctor,
    notes,
  };
}
