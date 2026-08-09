import type { AgentIntent } from "@/lib/types";

export type Classification = {
  intent: AgentIntent;
  ticketId?: string;
  chargeId?: string;
  email?: string;
};

const TICKET_ID_RE =
  /\b(?:tck[-\s]?)?(\d{4,})\b|\b(tck[-\s]?\d+)\b/i;
const CHARGE_ID_RE = /\b(ch_[a-zA-Z0-9_]+)\b/;
const EMAIL_RE = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p));
}

/**
 * Rule-based intent classifier. Deterministic for hackathon reliability.
 * Priority: explicit ticket/escalation intents beat knowledge matching.
 */
export function classifyIntent(message: string): Classification {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  const chargeMatch = raw.match(CHARGE_ID_RE);
  const emailMatch = raw.match(EMAIL_RE);
  const ticketMatch = raw.match(TICKET_ID_RE);
  const ticketId = ticketMatch
    ? (ticketMatch[2] || ticketMatch[1] || "").replace(/\s+/g, "").toUpperCase()
    : undefined;

  if (
    hasAny(lower, [
      "when should i escalate",
      "when to escalate",
      "escalation rules",
      "escalation policy",
    ])
  ) {
    return {
      intent: "KNOWLEDGE_QUERY",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    hasAny(lower, [
      "talk to a human",
      "speak to an agent",
      "speak to a human",
      "human agent",
      "escalate",
      "escalation",
      "hand off",
      "handoff",
    ])
  ) {
    return {
      intent: "ESCALATION",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    hasAny(lower, [
      "create a ticket",
      "open a ticket",
      "file a ticket",
      "submit a ticket",
      "new ticket",
      "make a ticket",
    ]) ||
    (/ticket/.test(lower) && hasAny(lower, ["create", "open", "file", "submit"]))
  ) {
    return {
      intent: "TICKET_CREATE",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    ticketId &&
    hasAny(lower, ["status", "lookup", "check", "where is", "update on"])
  ) {
    return {
      intent: "TICKET_STATUS",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    /ticket/.test(lower) &&
    hasAny(lower, ["status", "lookup", "check"])
  ) {
    return {
      intent: "TICKET_STATUS",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    hasAny(lower, [
      "troubleshoot",
      "not working",
      "isn't working",
      "isnt working",
      "broken",
      "stuck",
      "failing",
      "failure",
      "error",
      "can't",
      "cannot",
      "unable",
      "issue with",
      "problem with",
      "pending for",
      "keeps failing",
    ])
  ) {
    return {
      intent: "TROUBLESHOOTING",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  if (
    hasAny(lower, [
      "how do i",
      "how to",
      "what is",
      "what's",
      "whats",
      "where's",
      "where is",
      "explain",
      "policy",
      "invoice",
      "refund",
      "password",
      "invite",
      "2fa",
      "webhook",
      "billing",
      "download",
      "reset",
      "sync",
      "login",
      "account",
      "ticket",
      "firmware",
      "wifi",
      "wi-fi",
      "network",
      "ethernet",
      "restart",
      "reboot",
      "install",
      "pairing",
      "maintenance",
      "checklist",
      "led",
      "faq",
      "error code",
      "e-net",
      "e-sens",
      "novaedge",
      "hub",
      "probe",
      "escalate",
    ])
  ) {
    return {
      intent: "KNOWLEDGE_QUERY",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  // Longer free-text questions still treated as knowledge queries;
  // low retrieval confidence will escalate instead of hallucinating.
  const tokens = lower.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length >= 4) {
    return {
      intent: "KNOWLEDGE_QUERY",
      ticketId,
      chargeId: chargeMatch?.[1],
      email: emailMatch?.[1],
    };
  }

  return {
    intent: "UNKNOWN",
    ticketId,
    chargeId: chargeMatch?.[1],
    email: emailMatch?.[1],
  };
}
