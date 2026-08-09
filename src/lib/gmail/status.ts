import type {
  GmailTicketStatus,
  ThreadMessageRole,
  GmailThreadMessage,
} from "@/lib/gmail/types";
import { getTicketState } from "@/lib/gmail/store";

export function deriveTicketStatus(input: {
  threadId: string;
  messages: GmailThreadMessage[];
  supportEmail: string;
}): GmailTicketStatus {
  const state = getTicketState(input.threadId);
  if (state?.status === "RESOLVED") return "RESOLVED";
  if (state?.escalated || state?.status === "ESCALATED") return "ESCALATED";
  if (state?.status === "AI_ANALYZING") return "AI_ANALYZING";
  if (state?.waitingForCustomer || state?.status === "WAITING_FOR_CUSTOMER") {
    const last = input.messages[input.messages.length - 1];
    if (last?.role === "customer") return "CUSTOMER_REPLIED";
    return "WAITING_FOR_CUSTOMER";
  }

  const hasAgent = input.messages.some((m) => m.role === "agent");
  const last = input.messages[input.messages.length - 1];

  if (!hasAgent) return "NEW";
  if (last?.role === "customer") return "CUSTOMER_REPLIED";
  if (last?.role === "agent") return "AI_RESPONDED";
  return state?.status ?? "NEW";
}

export function classifyMessageRole(
  fromHeader: string,
  supportEmail: string,
): ThreadMessageRole {
  const from = fromHeader.toLowerCase();
  const support = supportEmail.toLowerCase();
  if (support && from.includes(support)) {
    // Outbound from support mailbox — treat as agent unless clearly human-tagged
    if (from.includes("human@") || from.includes("agent-human")) return "human";
    return "agent";
  }
  return "customer";
}

export function inferPriority(subject: string, body: string): "LOW" | "NORMAL" | "HIGH" | "URGENT" {
  const text = `${subject} ${body}`.toLowerCase();
  if (/(urgent|critical|down|outage|emergency)/.test(text)) return "URGENT";
  if (/(error|fail|broken|escalate|not working)/.test(text)) return "HIGH";
  if (/(question|how do|warranty|led)/.test(text)) return "LOW";
  return "NORMAL";
}
