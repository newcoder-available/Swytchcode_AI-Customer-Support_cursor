import { runSupportAgent } from "@/lib/agent/answer";
import {
  getTicketThread,
  replyToTicket,
} from "@/lib/gmail/service";
import {
  isMessageProcessed,
  markMessageProcessed,
  upsertTicketState,
  getTicketState,
} from "@/lib/gmail/store";

function autoReplyThreshold() {
  return Number(process.env.GMAIL_AUTO_REPLY_CONFIDENCE ?? "0.85");
}

function clarifyThreshold() {
  return Number(process.env.GMAIL_CLARIFY_CONFIDENCE ?? "0.6");
}

/**
 * Process the latest unprocessed customer message on a thread.
 * Idempotent via processed message IDs.
 */
export async function processTicketThread(threadId: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  status?: string;
  action?: string;
  error?: string;
  confidence?: number;
}> {
  const loaded = await getTicketThread(threadId);
  if (!loaded.ok || !loaded.ticket?.messages?.length) {
    return { ok: false, error: loaded.error || "Thread unavailable" };
  }

  const messages = loaded.ticket.messages;
  const lastCustomer = [...messages].reverse().find((m) => m.role === "customer");
  if (!lastCustomer) {
    return { ok: true, skipped: true, status: loaded.ticket.status };
  }

  if (isMessageProcessed(lastCustomer.id)) {
    return {
      ok: true,
      skipped: true,
      status: loaded.ticket.status,
      action: "already-processed",
    };
  }

  upsertTicketState(threadId, {
    status: "AI_ANALYZING",
    activity: [
      ...(getTicketState(threadId)?.activity ?? []),
      "Customer message received",
      "AI analyzing",
    ].slice(-12),
  });

  const agent = await runSupportAgent({
    message: lastCustomer.bodyText || lastCustomer.snippet,
    customerEmail: loaded.ticket.customerEmail,
    autoExecute: false,
  });

  const confidence = agent.confidence;
  const sources = agent.sources.map((s) => ({
    sourceId: s.sourceId,
    title: s.title,
    score: s.score,
  }));

  const activity = [
    "Customer message received",
    "Knowledge searched",
    `${sources.length} relevant sources found`,
    `Confidence ${Math.round(confidence * 100)}%`,
  ];

  // Critical / escalate path
  if (
    agent.escalated ||
    agent.intent === "ESCALATION" ||
    confidence < clarifyThreshold()
  ) {
    const body =
      confidence < clarifyThreshold() && !agent.escalated
        ? `Thanks for writing in about "${loaded.ticket.subject}".\n\nI wasn't confident enough to give a safe fix yet. I've escalated this to our technical team, who will follow up shortly.\n\n— ResolveAI`
        : `Thanks for writing in about "${loaded.ticket.subject}".\n\nI've escalated this to our technical team based on the details you shared. They'll follow up shortly.\n\n— ResolveAI`;

    const send = await replyToTicket({ threadId, body });
    if (!send.ok) {
      return {
        ok: false,
        error: send.error || "Reply could not be sent.",
        confidence,
      };
    }
    if (send.dryRun) {
      upsertTicketState(threadId, {
        status: "ESCALATED",
        escalated: true,
        aiConfidence: confidence,
        knowledgeSources: sources,
        lastProcessedMessageId: lastCustomer.id,
        activity: [...activity, "Escalation prepared (dry-run)"].slice(-12),
      });
      markMessageProcessed(lastCustomer.id);
      return {
        ok: true,
        status: "ESCALATED",
        action: "escalate-dry-run",
        confidence,
      };
    }

    markMessageProcessed(lastCustomer.id);
    upsertTicketState(threadId, {
      status: "ESCALATED",
      escalated: true,
      aiConfidence: confidence,
      knowledgeSources: sources,
      lastProcessedMessageId: lastCustomer.id,
      activity: [...activity, "Response generated", "Gmail reply sent", "Escalated"].slice(
        -12,
      ),
    });
    return { ok: true, status: "ESCALATED", action: "escalate", confidence };
  }

  // Ask for clarification
  if (confidence < autoReplyThreshold()) {
    const body = `Thanks for contacting support about "${loaded.ticket.subject}".\n\nTo help further, could you share:\n1) Exact error text/code\n2) What you've already tried\n3) When it started\n\nOnce I have that, I can continue troubleshooting.\n\n— ResolveAI`;
    const send = await replyToTicket({ threadId, body });
    if (!send.ok) {
      return { ok: false, error: send.error || "Reply could not be sent.", confidence };
    }
    markMessageProcessed(lastCustomer.id);
    upsertTicketState(threadId, {
      status: send.dryRun ? "WAITING_FOR_CUSTOMER" : "WAITING_FOR_CUSTOMER",
      waitingForCustomer: true,
      aiConfidence: confidence,
      knowledgeSources: sources,
      lastProcessedMessageId: lastCustomer.id,
      activity: [
        ...activity,
        "Asked customer for clarification",
        send.dryRun ? "Gmail reply prepared (dry-run)" : "Gmail reply sent",
      ].slice(-12),
    });
    return {
      ok: true,
      status: "WAITING_FOR_CUSTOMER",
      action: send.dryRun ? "clarify-dry-run" : "clarify",
      confidence,
    };
  }

  // High confidence — auto reply with grounded answer
  const grounded = agent.answer
    .replace(/\n\n(?:Swytchcode|SIMULATION)[\s\S]*$/i, "")
    .trim();
  const body = `${grounded}\n\n— ResolveAI`;
  const send = await replyToTicket({ threadId, body });
  if (!send.ok) {
    return { ok: false, error: send.error || "Reply could not be sent.", confidence };
  }

  markMessageProcessed(lastCustomer.id);
  upsertTicketState(threadId, {
    status: "AI_RESPONDED",
    waitingForCustomer: false,
    escalated: false,
    aiConfidence: confidence,
    knowledgeSources: sources,
    lastProcessedMessageId: lastCustomer.id,
    activity: [
      ...activity,
      "Response generated",
      send.dryRun ? "Gmail reply prepared (dry-run)" : "Gmail reply sent",
    ].slice(-12),
  });

  return {
    ok: true,
    status: "AI_RESPONDED",
    action: send.dryRun ? "reply-dry-run" : "reply",
    confidence,
  };
}
