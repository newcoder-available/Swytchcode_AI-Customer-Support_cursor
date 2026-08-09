/**
 * Operation allowlist — maps app operations to real canonical IDs discovered
 * via `swytchcode list` / `swytchcode info` and enabled with `swytchcode add method`.
 */
export const OPERATION_ALLOWLIST = {
  "ticket.create": "intercom.ticket.create",
  "ticket.get": "intercom.ticket.get",
  refund: "stripe.charge.refund",
  "gmail.profile": "gmail.user.profile.get",
  "gmail.messages.list": "gmail.user.messages.get",
  "gmail.messages.get": "gmail.user.messages.get1",
  "gmail.threads.list": "gmail.user.threads.get",
  "gmail.threads.get": "gmail.user.threads.get1",
  "gmail.messages.send": "gmail.user.send.create1",
  "gmail.labels.list": "gmail.user.labels.get",
  "gmail.threads.modify": "gmail.user.modify.create1",
} as const;

export type AllowedOperation = keyof typeof OPERATION_ALLOWLIST;

export function isAllowedOperation(value: string): value is AllowedOperation {
  return Object.prototype.hasOwnProperty.call(OPERATION_ALLOWLIST, value);
}

export function canonicalIdFor(operation: AllowedOperation): string {
  return OPERATION_ALLOWLIST[operation];
}

export const ALLOWED_CANONICAL_IDS = new Set<string>(
  Object.values(OPERATION_ALLOWLIST),
);
