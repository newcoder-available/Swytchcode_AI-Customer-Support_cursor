import { NextResponse } from "next/server";
import { runSupportAgent } from "@/lib/agent/answer";
import { gmailExec, readGmailPayload } from "@/lib/gmail/client";
import {
  buildReplyRfc822,
  encodeRawRfc822,
} from "@/lib/gmail/parse";
import {
  getCreatedTicket,
  markMessageProcessed,
  saveCreatedTicket,
} from "@/lib/gmail/store";
import {
  MAX_DESCRIPTION_CHARS,
  sanitizeUserText,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

function supportUserId() {
  return process.env.GMAIL_USER_ID?.trim() || "me";
}

function supportInboxEmail() {
  return (
    process.env.SUPPORT_INBOX_EMAIL?.trim().toLowerCase() ||
    "me@gmail.com"
  );
}

/**
 * Send an AI (or manual) customer update on an existing ticket thread.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "ticket id required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = (body || {}) as {
    message?: string;
    useAi?: boolean;
  };

  const ticket = getCreatedTicket(id);
  if (!ticket) {
    return NextResponse.json(
      { ok: false, error: "Ticket not found" },
      { status: 404 },
    );
  }

  if (id.startsWith("local-")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This ticket has no live Gmail thread. Create a new ticket while Gmail is connected.",
      },
      { status: 422 },
    );
  }

  try {
    let updateText = sanitizeUserText(
      (parsed.message || "").trim().slice(0, MAX_DESCRIPTION_CHARS),
    );
    let agentMeta: {
      confidence: number;
      intent: string;
      sources: Array<{ sourceId: string; title: string; score: number }>;
    } | null = null;

    const useAi = parsed.useAi !== false || !updateText;
    if (useAi) {
      const agent = await runSupportAgent({
        message: updateText
          ? `${ticket.subject}\n\nCustomer update request: ${updateText}\n\nOriginal issue: ${ticket.description}`
          : `${ticket.subject}\n\n${ticket.description}`,
        customerEmail: ticket.customerEmail,
        autoExecute: false,
      });
      updateText = agent.answer
        .replace(/\n\n(?:Swytchcode|SIMULATION)[\s\S]*$/i, "")
        .trim();
      agentMeta = {
        confidence: agent.confidence,
        intent: agent.intent,
        sources: agent.sources.map((s) => ({
          sourceId: s.sourceId,
          title: s.title,
          score: s.score,
        })),
      };
    }

    if (!updateText) {
      return NextResponse.json(
        { ok: false, error: "Update message is empty" },
        { status: 400 },
      );
    }

    const bodyText = [
      updateText,
      "",
      `Ticket email on file: ${ticket.customerEmail}`,
      "",
      "— ResolveAI",
    ].join("\n");

    const rfc822 = buildReplyRfc822({
      to: ticket.customerEmail,
      from: supportInboxEmail(),
      subject: `[ResolveAI] Update: ${ticket.subject}`,
      body: bodyText,
    });

    const send = await gmailExec("gmail.messages.send", {
      params: { userId: supportUserId() },
      body: {
        raw: encodeRawRfc822(rfc822),
        threadId: ticket.threadId || ticket.id,
      },
    });

    if (!send.ok) {
      return NextResponse.json(
        { ok: false, error: send.error || "Update email could not be sent." },
        { status: 422 },
      );
    }

    const parsedSend = readGmailPayload(send);
    if (parsedSend.httpError) {
      return NextResponse.json(
        { ok: false, error: parsedSend.httpError },
        { status: 422 },
      );
    }

    const messageId = String(parsedSend.data.id || "");
    if (messageId) markMessageProcessed(messageId);

    const updated = saveCreatedTicket({
      ...ticket,
      status: "AI_RESPONDED",
      updatedAt: new Date().toISOString(),
      aiConfidence: agentMeta?.confidence ?? ticket.aiConfidence,
      agentAnswer: updateText,
      knowledgeSources: agentMeta?.sources ?? ticket.knowledgeSources,
      activity: [
        ...ticket.activity,
        useAi ? "AI update generated" : "Manual update drafted",
        `Customer update emailed to ${ticket.customerEmail}`,
      ].slice(-20),
    });

    return NextResponse.json({
      ok: true,
      ticket: updated,
      notification: {
        sent: Boolean(messageId),
        messageId: messageId || null,
        to: ticket.customerEmail,
        summary: `Update sent to ${ticket.customerEmail}`,
      },
      agent: agentMeta,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "update failed",
      },
      { status: 500 },
    );
  }
}
