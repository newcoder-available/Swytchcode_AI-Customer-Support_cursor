import { gmailExec, unwrapData } from "@/lib/gmail/client";
import {
  buildReplyRfc822,
  encodeRawRfc822,
  extractBodyText,
  headerValue,
  parseEmailAddress,
} from "@/lib/gmail/parse";
import { getTicketState, upsertTicketState } from "@/lib/gmail/store";
import {
  classifyMessageRole,
  deriveTicketStatus,
  inferPriority,
} from "@/lib/gmail/status";
import type {
  GmailConnectionState,
  GmailSupportTicket,
  GmailThreadMessage,
} from "@/lib/gmail/types";
import { getExecMode } from "@/lib/swytchcode/health";

function supportUserId() {
  return process.env.GMAIL_USER_ID?.trim() || "me";
}

function supportInboxEmail() {
  return (
    process.env.SUPPORT_INBOX_EMAIL?.trim().toLowerCase() ||
    process.env.GMAIL_SUPPORT_EMAIL?.trim().toLowerCase() ||
    ""
  );
}

function supportQuery(): string {
  const label = process.env.SUPPORT_LABEL?.trim();
  const prefix = process.env.SUPPORT_SUBJECT_PREFIX?.trim();
  const inbox = supportInboxEmail();
  const parts: string[] = ["in:inbox"];
  if (label) parts.push(`label:${label}`);
  if (prefix) parts.push(`subject:(${prefix})`);
  if (inbox) parts.push(`(to:${inbox} OR deliveredto:${inbox})`);
  // Fallback broad inbox if no filters configured
  if (!label && !prefix && !inbox) {
    return "in:inbox -category:promotions -category:social newer_than:30d";
  }
  return parts.join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function mapMessage(
  raw: Record<string, unknown>,
  supportEmail: string,
): GmailThreadMessage {
  const payload = asRecord(raw.payload);
  const headers = (payload.headers as Array<{ name?: string; value?: string }>) || [];
  const from = headerValue(headers, "From");
  const to = headerValue(headers, "To");
  const subject = headerValue(headers, "Subject");
  const date = headerValue(headers, "Date");
  const bodyText = extractBodyText(payload as never) || String(raw.snippet || "");
  return {
    id: String(raw.id || ""),
    threadId: String(raw.threadId || ""),
    from,
    to,
    subject,
    date,
    internalDate: String(raw.internalDate || ""),
    snippet: String(raw.snippet || ""),
    bodyText,
    role: classifyMessageRole(from, supportEmail),
    labelIds: Array.isArray(raw.labelIds)
      ? raw.labelIds.map(String)
      : [],
  };
}

export async function getGmailConnection(): Promise<GmailConnectionState> {
  const mode = getExecMode();
  const configuredEmail = supportInboxEmail() || null;

  if (mode === "simulation") {
    return {
      connected: false,
      emailAddress: configuredEmail,
      mode: "demo",
      error:
        "GMAIL DEMO MODE — SWYTCHCODE_MODE=simulation. Not live Gmail data.",
    };
  }

  // Dry-run without live OAuth: return instantly so the UI never hangs.
  // Real mailbox listing only happens in live mode.
  if (mode === "dry-run") {
    return {
      connected: false,
      emailAddress: configuredEmail,
      mode: "dry-run",
      error:
        "Swytchcode dry-run mode. Connect Gmail (`swytchcode auth connect Gmail`) and set SWYTCHCODE_MODE=live to load real tickets.",
    };
  }

  const result = await gmailExec("gmail.profile", {
    params: { userId: supportUserId() },
  });

  if (!result.ok) {
    return {
      connected: false,
      emailAddress: configuredEmail,
      mode: "live",
      error: result.error || "Gmail connection unavailable",
    };
  }

  const data = asRecord(unwrapData(result));
  const email =
    String(data.emailAddress || configuredEmail || "") || null;

  // Dry-run preview shape (should not appear in live, but guard anyway)
  if ("url" in data || "method" in data) {
    return {
      connected: false,
      emailAddress: email,
      mode: "dry-run",
      error:
        "Received dry-run preview instead of Gmail profile. Set SWYTCHCODE_MODE=live after connecting Gmail.",
    };
  }

  return {
    connected: Boolean(email),
    emailAddress: email,
    mode: "live",
  };
}

function ticketFromListSnippet(
  thread: Record<string, unknown>,
): GmailSupportTicket | null {
  const threadId = String(thread.id || "");
  if (!threadId) return null;
  const snippet = String(thread.snippet || "");
  const state = getTicketState(threadId);
  const nowIso = new Date().toISOString();
  return {
    id: threadId,
    source: "gmail",
    customerEmail: "loading…",
    customerName: "Opening thread…",
    subject: snippet.slice(0, 80) || "(Gmail thread)",
    status: state?.status || "NEW",
    priority: state?.priority || "NORMAL",
    createdAt: state?.updatedAt || nowIso,
    updatedAt: state?.updatedAt || nowIso,
    messageCount: 0,
    lastMessageAt: state?.updatedAt || nowIso,
    lastMessageFrom: "customer",
    aiConfidence: state?.aiConfidence ?? null,
    resolution: state?.resolution ?? null,
    snippet,
    unread: true,
    labels: [],
    lastProcessedMessageId: state?.lastProcessedMessageId ?? null,
    messages: [],
    knowledgeSources: state?.knowledgeSources ?? [],
    activity: state?.activity ?? [],
    mode: "live",
  };
}

export async function listSupportTickets(): Promise<{
  ok: boolean;
  mode: GmailConnectionState["mode"];
  tickets: GmailSupportTicket[];
  error?: string;
  connection: GmailConnectionState;
}> {
  const connection = await getGmailConnection();
  if (connection.mode === "dry-run" || connection.mode === "demo") {
    return {
      ok: true,
      mode: connection.mode,
      tickets: [],
      error: connection.error,
      connection,
    };
  }

  if (!connection.connected) {
    return {
      ok: false,
      mode: connection.mode,
      tickets: [],
      error: connection.error || "Gmail connection unavailable",
      connection,
    };
  }

  const list = await gmailExec("gmail.threads.list", {
    params: {
      userId: supportUserId(),
      q: supportQuery(),
      maxResults: 25,
    },
  });

  if (!list.ok) {
    return {
      ok: false,
      mode: connection.mode,
      tickets: [],
      error: list.error || "Failed to list Gmail threads",
      connection,
    };
  }

  const payload = asRecord(unwrapData(list));

  if ("url" in payload || "method" in payload) {
    return {
      ok: true,
      mode: "dry-run",
      tickets: [],
      error:
        "Swytchcode dry-run prepared Gmail list request. Connect Gmail OAuth and set SWYTCHCODE_MODE=live to load real tickets.",
      connection: { ...connection, mode: "dry-run" },
    };
  }

  const threads = Array.isArray(payload.threads) ? payload.threads : [];
  const supportEmail =
    connection.emailAddress || supportInboxEmail() || "me";

  const tickets = threads
    .slice(0, 25)
    .map((t) => ticketFromListSnippet(asRecord(t)))
    .filter((t): t is GmailSupportTicket => Boolean(t));

  tickets.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return {
    ok: true,
    mode: connection.mode,
    tickets,
    connection: { ...connection, emailAddress: supportEmail },
  };
}

export async function getTicketThread(threadId: string): Promise<{
  ok: boolean;
  ticket?: GmailSupportTicket;
  error?: string;
  mode?: GmailConnectionState["mode"];
}> {
  const connection = await getGmailConnection();
  const supportEmail =
    connection.emailAddress || supportInboxEmail() || "me";

  const result = await gmailExec("gmail.threads.get", {
    params: {
      userId: supportUserId(),
      id: threadId,
      format: "full",
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error || "Thread retrieval failed" };
  }

  const payload = asRecord(unwrapData(result));
  if ("url" in payload || "method" in payload) {
    return {
      ok: false,
      mode: "dry-run",
      error:
        "Dry-run only — cannot load live thread body. Set SWYTCHCODE_MODE=live after `swytchcode auth connect Gmail`.",
    };
  }

  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = rawMessages.map((m) =>
    mapMessage(asRecord(m), supportEmail),
  );

  if (!messages.length) {
    return { ok: false, error: "Thread has no messages" };
  }

  const firstCustomer =
    messages.find((m) => m.role === "customer") || messages[0];
  const customer = parseEmailAddress(firstCustomer.from);
  const last = messages[messages.length - 1];
  const state = getTicketState(threadId);
  const status = deriveTicketStatus({
    threadId,
    messages,
    supportEmail,
  });
  const subject = firstCustomer.subject || "(no subject)";
  const createdMs = Number(messages[0].internalDate || Date.now());
  const updatedMs = Number(last.internalDate || Date.now());

  const ticket: GmailSupportTicket = {
    id: threadId,
    source: "gmail",
    customerEmail: customer.email,
    customerName: customer.name,
    subject,
    status,
    priority:
      state?.priority ||
      inferPriority(subject, firstCustomer.bodyText || firstCustomer.snippet),
    createdAt: new Date(createdMs).toISOString(),
    updatedAt: new Date(updatedMs).toISOString(),
    messageCount: messages.length,
    lastMessageAt: new Date(updatedMs).toISOString(),
    lastMessageFrom: last.role,
    aiConfidence: state?.aiConfidence ?? null,
    resolution: state?.resolution ?? null,
    snippet: last.snippet || firstCustomer.snippet,
    unread: messages.some((m) => m.labelIds.includes("UNREAD")),
    labels: Array.from(new Set(messages.flatMap((m) => m.labelIds))),
    lastProcessedMessageId: state?.lastProcessedMessageId ?? null,
    messages,
    knowledgeSources: state?.knowledgeSources ?? [],
    activity: state?.activity ?? [],
    mode: connection.mode,
  };

  return { ok: true, ticket, mode: connection.mode };
}

export async function replyToTicket(input: {
  threadId: string;
  body: string;
  asAgent?: boolean;
}): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
  dryRun?: boolean;
  summary?: string;
}> {
  const thread = await getTicketThread(input.threadId);
  if (!thread.ok || !thread.ticket?.messages?.length) {
    return { ok: false, error: thread.error || "Cannot reply without thread" };
  }

  const connection = await getGmailConnection();
  const supportEmail =
    connection.emailAddress || supportInboxEmail() || "me@example.com";
  const messages = thread.ticket.messages;
  const lastCustomer =
    [...messages].reverse().find((m) => m.role === "customer") || messages[0];
  const customer = parseEmailAddress(lastCustomer.from);
  const messageIdHeader = headerValue(
    // Reconstruct from last customer message is best-effort; full headers may be in get
    [],
    "Message-ID",
  );

  // Prefer Message-ID from latest customer for threading when available via re-fetch
  const latestRaw = await gmailExec("gmail.messages.get", {
    params: {
      userId: supportUserId(),
      id: lastCustomer.id,
      format: "metadata",
      metadataHeaders: ["Message-ID", "References", "Subject", "From"],
    },
  });
  let inReplyTo = messageIdHeader;
  let references = "";
  if (latestRaw.ok) {
    const raw = asRecord(unwrapData(latestRaw));
    if (!("url" in raw)) {
      const payload = asRecord(raw.payload);
      const headers =
        (payload.headers as Array<{ name?: string; value?: string }>) || [];
      inReplyTo = headerValue(headers, "Message-ID") || inReplyTo;
      references = headerValue(headers, "References");
      if (inReplyTo) {
        references = references ? `${references} ${inReplyTo}` : inReplyTo;
      }
    }
  }

  const rfc822 = buildReplyRfc822({
    to: customer.email,
    from: supportEmail,
    subject: thread.ticket.subject,
    body: input.body,
    inReplyTo: inReplyTo || undefined,
    references: references || undefined,
  });

  const send = await gmailExec("gmail.messages.send", {
    params: { userId: supportUserId() },
    body: {
      raw: encodeRawRfc822(rfc822),
      threadId: input.threadId,
    },
  });

  if (!send.ok) {
    return { ok: false, error: send.error || "Reply could not be sent." };
  }

  const data = asRecord(unwrapData(send));
  if ("url" in data || "method" in data) {
    return {
      ok: true,
      dryRun: true,
      summary:
        "Swytchcode dry-run prepared Gmail send/reply request (not delivered).",
    };
  }

  const messageId = String(data.id || "");
  upsertTicketState(input.threadId, {
    status: "AI_RESPONDED",
    lastAiMessageId: messageId || null,
    lastProcessedMessageId: lastCustomer.id,
    waitingForCustomer: false,
    activity: [
      ...(getTicketState(input.threadId)?.activity ?? []),
      "Gmail reply sent",
    ].slice(-12),
  });
  return {
    ok: true,
    messageId,
    summary: "Gmail reply sent via Swytchcode",
  };
}
