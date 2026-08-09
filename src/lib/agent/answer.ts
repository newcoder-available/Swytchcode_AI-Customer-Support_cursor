import { classifyIntent } from "@/lib/agent/classify";
import { confidenceLevel, scoreConfidence } from "@/lib/agent/confidence";
import {
  buildGroundedAnswer,
  lowConfidenceAnswer,
} from "@/lib/agent/ground";
import { retrieveArticles } from "@/lib/knowledge/retrieve";
import {
  createTicket,
  getTicket,
  runRefundAction,
} from "@/lib/swytchcode/actions";
import type {
  ActionResult,
  AgentActionName,
  AgentExecution,
  AgentResult,
  ChatRequest,
  ChatResponse,
  ConfidenceLevel,
} from "@/lib/types";

function msgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toExecution(result: ActionResult): AgentExecution {
  const channel =
    result.channel ??
    (result.mode === "simulation" ? "simulation" : "swytchcode");
  return {
    ok: result.ok,
    mode: result.mode,
    channel,
    canonicalId:
      typeof result.data?.canonicalId === "string"
        ? result.data.canonicalId
        : undefined,
    summary: result.summary,
    data: result.data,
    error: result.error,
  };
}

async function executeAction(
  action: Exclude<AgentActionName, null>,
  ctx: {
    message: string;
    subject: string;
    description: string;
    customerEmail: string;
    ticketId?: string;
    chargeId?: string;
  },
): Promise<AgentExecution> {
  if (action === "ticket.create") {
    const result = await createTicket({
      subject: ctx.subject.slice(0, 120) || "Support escalation",
      description: ctx.description,
      customerEmail: ctx.customerEmail,
      priority: "high",
    });
    return toExecution(result);
  }

  if (action === "ticket.get") {
    if (!ctx.ticketId) {
      return {
        ok: false,
        mode: "dry-run",
        channel: "swytchcode",
        summary: "Cannot look up ticket status without a ticket ID.",
        error: "validation",
      };
    }
    const result = await getTicket(ctx.ticketId);
    return toExecution(result);
  }

  if (action === "refund") {
    if (!ctx.chargeId) {
      return {
        ok: false,
        mode: "dry-run",
        channel: "swytchcode",
        summary: "Cannot run refund without a charge ID (ch_...).",
        error: "validation",
      };
    }
    const result = await runRefundAction({ chargeId: ctx.chargeId });
    return toExecution(result);
  }

  return {
    ok: false,
    mode: "dry-run",
    channel: "swytchcode",
    summary: "Unknown action",
    error: "allowlist",
  };
}

function appendExecutionNote(
  answer: string,
  action: AgentActionName,
  execution: AgentExecution,
): string {
  if (!action || !execution) return answer;
  const status = execution.ok ? "succeeded" : "failed";
  const channelLabel =
    execution.channel === "simulation"
      ? "SIMULATION (not Swytchcode)"
      : `Swytchcode (${execution.mode})`;
  return `${answer}\n\n${channelLabel} action \`${action}\` ${status}: ${execution.summary}`;
}

/**
 * ResolveAI support agent pipeline:
 * classify → retrieve → ground → confidence → escalate/action → Swytchcode
 */
export async function runSupportAgent(
  req: ChatRequest,
): Promise<ChatResponse> {
  const message = req.message.trim();
  const autoExecute = req.autoExecute !== false;
  const customerEmail =
    req.customerEmail?.trim() ||
    classifyIntent(message).email ||
    "demo@resolve.ai";

  const classification = classifyIntent(message);
  let intent = classification.intent;

  // Retrieve for knowledge / troubleshooting / unknown grounding checks.
  const retrieved = retrieveArticles(message);
  const scored = scoreConfidence(retrieved);

  let confidence = scored.confidence;
  let escalated = false;
  let action: AgentActionName = null;
  let action_required = false;
  let execution: AgentExecution = null;
  let steps: string[] = [];
  let answer = "";

  // --- Intent handlers ---
  if (intent === "TICKET_STATUS") {
    confidence = classification.ticketId ? 0.9 : 0.35;
    action = "ticket.get";
    action_required = true;
    if (!classification.ticketId) {
      answer =
        "I can look up ticket status, but I need a ticket ID (for example `2154214521`).";
      escalated = false;
      action_required = false;
      action = null;
    } else {
      answer = `Looking up ticket **${classification.ticketId}** through Swytchcode.`;
    }
  } else if (intent === "TICKET_CREATE") {
    confidence = 0.88;
    action = "ticket.create";
    action_required = true;
    answer =
      "I'll create a support ticket from your request through Swytchcode.";
  } else if (intent === "ESCALATION") {
    confidence = 0.9;
    escalated = true;
    action = "ticket.create";
    action_required = true;
    answer =
      "Escalating to a human agent and creating a support ticket through Swytchcode.";
  } else if (intent === "TROUBLESHOOTING" || intent === "KNOWLEDGE_QUERY") {
    if (scored.shouldEscalate || !retrieved.length) {
      // Low confidence → escalate; do not invent steps or hallucinate.
      confidence = Math.min(confidence, scored.confidence);
      escalated = true;
      action = "ticket.create";
      action_required = true;
      answer = lowConfidenceAnswer(
        retrieved.length === 0
          ? "no matching knowledge articles"
          : `confidence ${scored.confidence} below threshold`,
      );
      // Keep sources for transparency even when escalating.
    } else {
      const grounded = buildGroundedAnswer(intent, retrieved, {
        includeSteps: intent === "TROUBLESHOOTING",
      });
      if (!grounded.grounded) {
        escalated = true;
        action = "ticket.create";
        action_required = true;
        answer = grounded.answer;
      } else {
        answer = grounded.answer;
        steps = grounded.steps;
        confidence = scored.confidence;

        // Optional refund action when KB is about refunds and charge ID is present.
        const top = retrieved[0]?.article;
        if (
          classification.chargeId &&
          top &&
          (top.tags.includes("refund") ||
            top.id.includes("refund") ||
            message.toLowerCase().includes("refund"))
        ) {
          action = "refund";
          action_required = true;
          answer +=
            "\n\nA charge ID was detected — running the refund action through Swytchcode.";
        }
      }
    }
  } else {
    // UNKNOWN
    intent = "UNKNOWN";
    confidence = Math.min(scored.confidence, 0.25);
    escalated = true;
    action = "ticket.create";
    action_required = true;
    answer = lowConfidenceAnswer("intent could not be classified reliably");
  }

  // Force escalation path never invents steps.
  if (escalated) {
    steps = [];
  }

  // Execute Swytchcode when required.
  if (autoExecute && action_required && action) {
    execution = await executeAction(action, {
      message,
      subject:
        intent === "ESCALATION"
          ? `Escalation: ${message.slice(0, 80)}`
          : message.slice(0, 80),
      description: message,
      customerEmail,
      ticketId: classification.ticketId,
      chargeId: classification.chargeId,
    });
    answer = appendExecutionNote(answer, action, execution);

    // If ticket create for escalation failed, still mark escalated intentually.
    if (action === "ticket.create" && execution && !execution.ok) {
      answer +=
        "\n\nTicket creation did not complete. You can retry from the side panel.";
    }
  }

  const sources = retrieved.map((r) => ({
    id: r.article.sourceId,
    sourceId: r.article.sourceId,
    title: r.article.title,
    score: Number(r.score.toFixed(2)),
    lastUpdated: r.article.lastUpdated,
  }));

  const level: ConfidenceLevel = confidenceLevel(confidence);

  const agent: AgentResult = {
    intent,
    answer,
    confidence,
    sources,
    action_required,
    action,
    execution,
    escalated,
  };

  return {
    ...agent,
    message: {
      id: msgId(),
      role: "assistant",
      content: answer,
      createdAt: new Date().toISOString(),
      confidence,
      confidenceLevel: level,
      sources,
      steps: steps.length ? steps : undefined,
      shouldEscalate: escalated,
      intent,
      action_required,
      action,
      execution,
      escalated,
      agent,
    },
  };
}
