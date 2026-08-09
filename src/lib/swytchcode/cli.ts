import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type CliResult = {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  error?: string;
  timedOut?: boolean;
};

const IS_WINDOWS = process.platform === "win32";
const WIN_META_CHARS = /([()\][%!^"`<>&|;, *?])/g;

function escapeCmdMeta(s: string): string {
  return s.replace(WIN_META_CHARS, "^$1");
}

function escapeCmdArgument(arg: string): string {
  let a = String(arg);
  a = a.replace(/(\\*)"/g, '$1$1\\"');
  a = a.replace(/(\\*)$/, "$1$1");
  a = `"${a}"`;
  a = escapeCmdMeta(a);
  a = escapeCmdMeta(a);
  return a;
}

/** Same safe Windows .cmd strategy as @swytchcode/runtime (no shell:true). */
function buildInvocation(
  bin: string,
  args: string[],
): {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
} {
  const isWinCmd = IS_WINDOWS && bin.toLowerCase().endsWith(".cmd");
  if (!isWinCmd) {
    return { command: bin, args, windowsVerbatimArguments: false };
  }
  const comspec = process.env.ComSpec || process.env.COMSPEC || "cmd.exe";
  const line = [escapeCmdMeta(bin), ...args.map(escapeCmdArgument)].join(" ");
  return {
    command: comspec,
    args: ["/d", "/s", "/c", `"${line}"`],
    windowsVerbatimArguments: true,
  };
}

function resolveSwytchcodeBin(startDir: string): string {
  const explicit = process.env.SWYTCHCODE_BIN?.trim();
  if (explicit) return explicit;

  const binName = IS_WINDOWS ? "swytchcode.cmd" : "swytchcode";
  let dir = startDir;
  while (true) {
    const candidate = join(dir, "node_modules", ".bin", binName);
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  const fallbacks: string[] = [];
  if (IS_WINDOWS) {
    if (process.env.APPDATA) {
      fallbacks.push(join(process.env.APPDATA, "npm", "swytchcode.cmd"));
    }
    if (process.env.LOCALAPPDATA) {
      fallbacks.push(
        join(
          process.env.LOCALAPPDATA,
          "Programs",
          "swytchcode",
          "bin",
          "swytchcode.exe",
        ),
      );
    }
  } else {
    fallbacks.push(
      join(process.env.HOME ?? "", ".local", "bin", "swytchcode"),
      "/usr/local/bin/swytchcode",
    );
  }

  for (const candidate of fallbacks) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return "swytchcode";
}

/**
 * Run a fixed Swytchcode CLI argv list. Never interpolates user input into a shell.
 */
export function runSwytchcodeCli(
  args: readonly string[],
  options?: {
    timeoutMs?: number;
    input?: string;
    env?: Record<string, string>;
    cwd?: string;
  },
): CliResult {
  const cwd = options?.cwd ?? process.cwd();
  const timeoutMs = options?.timeoutMs ?? 20_000;

  try {
    const bin = resolveSwytchcodeBin(cwd);
    const inv = buildInvocation(bin, [...args]);
    const result = spawnSync(inv.command, inv.args, {
      cwd,
      env: { ...process.env, ...options?.env },
      input: options?.input,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      windowsVerbatimArguments: inv.windowsVerbatimArguments,
      shell: false,
    });

    if (result.error) {
      const err = result.error as NodeJS.ErrnoException;
      const timedOut = err.code === "ETIMEDOUT";
      return {
        ok: false,
        status: result.status,
        stdout: (result.stdout ?? "").trim(),
        stderr: (result.stderr ?? "").trim(),
        timedOut,
        error: timedOut
          ? `swytchcode timed out after ${timeoutMs}ms`
          : err.message,
      };
    }

    const stdout = (result.stdout ?? "").trim();
    const stderr = (result.stderr ?? "").trim();
    return {
      ok: result.status === 0,
      status: result.status,
      stdout,
      stderr,
      error: result.status === 0 ? undefined : stderr || `exit ${result.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      stdout: "",
      stderr: "",
      error: err instanceof Error ? err.message : "failed to invoke swytchcode",
    };
  }
}

export function parseJsonStdout<T>(stdout: string):
  | { ok: true; data: T }
  | { ok: false; error: string } {
  if (!stdout) {
    return { ok: false, error: "empty stdout" };
  }
  try {
    return { ok: true, data: JSON.parse(stdout) as T };
  } catch {
    return { ok: false, error: "invalid JSON from swytchcode" };
  }
}
