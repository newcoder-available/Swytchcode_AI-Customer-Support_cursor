import { gmailExec, readGmailPayload } from "@/lib/gmail/client";
import {
  buildOutboundRfc822,
  buildReplyRfc822,
  encodeRawRfc822,
} from "@/lib/gmail/parse";
import {
  markMessageProcessed,
  saveCreatedTicket,
  type CreatedTicketRecord,
} from "@/lib/gmail/store";
import { inferPriority } from "@/lib/gmail/status";
import type { GmailTicketPriority } from "@/lib/gmail/types";
import { getExecMode } from "@/lib/swytchcode/health";
import { runSupportAgent } from "@/lib/agent/answer";

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function autoReplyThreshold() {
  return Number(process.env.GMAIL_AUTO_REPLY_CONFIDENCE ?? "0.85");
}

function clarifyThreshold() {
  return Number(process.env.GMAIL_CLARIFY_CONFIDENCE ?? "0.6");
}

async function sendGmailToCustomer(input: {
  to: string;
  from: string;
  subject: string;
  body: string;
  threadId?: string;
  asReply?: boolean;
}): Promise<{
  ok: boolean;
  dryRun?: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}> {
  const rfc822 = input.asReply
    ? buildReplyRfc822({
        to: input.to,
        from: input.from,
        subject: input.subject,
        body: input.body,
      })
    : buildOutboundRfc822({
        to: input.to,
        from: input.from,
        subject: input.subject,
        body: input.body,
      });

  const body: Record<string, string> = {
    raw: encodeRawRfc822(rfc822),
  };
  if (input.threadId && !input.threadId.startsWith("local-")) {
    body.threadId = input.threadId;
  }

  const send = await gmailExec("gmail.messages.send", {
    params: { userId: supportUserId() },
    body,
  });

  if (!send.ok) {
    return { ok: false, error: send.error || "Gmail send failed" };
  }

  const parsed = readGmailPayload(send);
  if (parsed.httpError) {
    return {
      ok: false,
      error:
        parsed.statusCode === 401
          ? "Gmail connection unavailable — reconnect with `swytchcode auth connect Gmail`."
          : parsed.httpError,
    };
  }

  if ("url" in parsed.data || "method" in parsed.data) {
    return { ok: true, dryRun: true };
  }

  const messageId = String(parsed.data.id || "");
  const threadId = String(parsed.data.threadId || input.threadId || messageId);
  if (!messageId) {
    return {
      ok: false,
      error: "Gmail send returned no message id",
    };
  }
  markMessageProcessed(messageId);
  return { ok: true, messageId, threadId };
}

export type CreateTicketInput = {
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority?: GmailTicketPriority;
  runAgent?: boolean;
};

export type CreateTicketResult = {
  ok: boolean;
  error?: string;
  mode?: string;
  ticket?: CreatedTicketRecord;
  notification?: {
    sent: boolean;
    messageId: string | null;
    to: string;
    summary: string;
  };
  agent?: {
    intent: string;
    confidence: number;
    answer: string;
    escalated: boolean;
    sources: Array<{ sourceId: string; title: string; score: number }>;
  };
};

/**
 * User input → Gmail thread ticket → notify customerEmail → runSupportAgent
 * → optional AI follow-up on the same thread.
 */
export async function createSupportTicketFromInput(
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  const customerEmail = input.customerEmail.trim().toLowerCase();
  const customerName = input.customerName.trim() || customerEmail.split("@")[0];
  const subject = input.subject.trim();
  const description = input.description.trim();
  const mode = getExecMode();

  if (!customerEmail || !isValidEmail(customerEmail)) {
    return { ok: false, error: "A valid customer email is required." };
  }
  if (!subject) return { ok: false, error: "Subject is required." };
  if (!description) return { ok: false, error: "Description is required." };

  const from = supportInboxEmail() || "me@gmail.com";
  const priority = input.priority || inferPriority(subject, description);
  const now = new Date().toISOString();

  const notifyBody = [
    `Hi ${customerName},`,
    "",
    "Thanks for contacting ResolveAI support. Your ticket has been created.",
    "",
    `Customer email: ${customerEmail}`,
    `Subject: ${subject}`,
    "",
    "Your request:",
    description,
    "",
    "Our AI agent is reviewing this now. Replies stay on this email thread.",
    "",
    "— ResolveAI",
  ].join("\n");

  const notify = await sendGmailToCustomer({
    to: customerEmail,
    from,
    subject: `[ResolveAI] Ticket created: ${subject}`,
    body: notifyBody,
  });

  if (!notify.ok) {
    return {
      ok: false,
      mode,
      error: notify.error || "Notification email could not be sent.",
    };
  }

  const dryRun = Boolean(notify.dryRun);
  const messageId = notify.messageId || null;
  const threadId = notify.threadId || `local-${Date.now()}`;

  const activity = [
    "Ticket created from user input",
    `Customer email recorded: ${customerEmail}`,
    dryRun
      ? "Notification email prepared (dry-run / not delivered)"
      : `Notification email sent to ${customerEmail}`,
  ];

  let agentBlock: CreateTicketResult["agent"];
  let status: CreatedTicketRecord["status"] = "NEW";
  let aiConfidence: number | null = null;
  let agentAnswer: string | null = null;
  const knowledgeSources: CreatedTicketRecord["knowledgeSources"] = [];

  if (input.runAgent !== false) {
    activity.push("AI agent analyzing");
    const agent = await runSupportAgent({
      message: `${subject}\n\n${description}`,
      customerEmail,
      autoExecute: false,
    });
    aiConfidence = agent.confidence;
    agentAnswer = agent.answer;
    agentBlock = {
      intent: agent.intent,
      confidence: agent.confidence,
      answer: agent.answer,
      escalated: agent.escalated,
      sources: agent.sources.map((s) => ({
        sourceId: s.sourceId,
        title: s.title,
        score: s.score,
      })),
    };
    knowledgeSources.push(...agentBlock.sources);
    activity.push(
      "Knowledge searched",
      `${agent.sources.length} relevant sources found`,
      `Confidence ${Math.round(agent.confidence * 100)}%`,
      "Response generated",
    );

    if (!dryRun) {
      const thresholdAuto = autoReplyThreshold();
      const thresholdClarify = clarifyThreshold();
      let replyBody = "";

      if (
        agent.escalated ||
        agent.intent === "ESCALATION" ||
        agent.confidence < thresholdClarify
      ) {
        status = "ESCALATED";
        replyBody = `Thanks for your ticket about "${subject}".\n\nI've escalated this to our technical team. They'll follow up on this thread.\n\nTicket email on file: ${customerEmail}\n\n— ResolveAI`;
      } else if (agent.confidence < thresholdAuto) {
        status = "WAITING_FOR_CUSTOMER";
        replyBody = `Thanks for your ticket about "${subject}".\n\nTo help further, could you share:\n1) Exact error text/code\n2) What you've already tried\n3) When it started\n\nTicket email on file: ${customerEmail}\n\n— ResolveAI`;
      } else {
        status = "AI_RESPONDED";
        const grounded = agent.answer
          .replace(/\n\n(?:Swytchcode|SIMULATION)[\s\S]*$/i, "")
          .trim();
        replyBody = `${grounded}\n\nTicket email on file: ${customerEmail}\n\n— ResolveAI`;
      }

      const reply = await sendGmailToCustomer({
        to: customerEmail,
        from,
        subject: `[ResolveAI] Ticket created: ${subject}`,
        body: replyBody,
        threadId,
        asReply: true,
      });
      if (reply.ok && !reply.dryRun) {
        activity.push("Gmail agent reply sent");
      } else if (reply.ok && reply.dryRun) {
        activity.push("Gmail agent reply prepared (dry-run)");
      } else if (!reply.ok) {
        activity.push(`Agent reply failed: ${reply.error || "unknown"}`);
      }
    } else {
      status = "AI_ANALYZING";
      activity.push("Live Gmail delivery required for agent thread reply");
    }
  }

  const ticket: CreatedTicketRecord = {
    id: threadId,
    source: "gmail",
    customerEmail,
    customerName,
    subject,
    description,
    status,
    priority,
    createdAt: now,
    updatedAt: new Date().toISOString(),
    notificationSent: !dryRun && Boolean(messageId),
    notificationMessageId: messageId,
    threadId,
    aiConfidence,
    agentAnswer,
    activity: activity.slice(-16),
    knowledgeSources,
  };

  saveCreatedTicket(ticket);

  return {
    ok: true,
    mode: dryRun ? "dry-run" : mode,
    ticket,
    notification: {
      sent: ticket.notificationSent,
      messageId,
      to: customerEmail,
      summary: dryRun
        ? `Notification prepared for ${customerEmail} (not delivered in dry-run).`
        : `Notification sent to ${customerEmail}`,
    },
    agent: agentBlock,
  };
}
