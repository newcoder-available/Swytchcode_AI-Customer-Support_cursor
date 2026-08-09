/** Shared request guards for API routes. */

export const MAX_MESSAGE_CHARS = 4_000;
export const MAX_SUBJECT_CHARS = 200;
export const MAX_DESCRIPTION_CHARS = 4_000;
export const MAX_ID_CHARS = 128;

export function requireTrimmedString(
  value: unknown,
  field: string,
  maxChars: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${field} is required` };
  }
  if (trimmed.length > maxChars) {
    return {
      ok: false,
      error: `${field} exceeds maximum length of ${maxChars} characters`,
    };
  }
  return { ok: true, value: trimmed };
}

/** Strip control chars except common whitespace; keep printable Unicode. */
export function sanitizeUserText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
