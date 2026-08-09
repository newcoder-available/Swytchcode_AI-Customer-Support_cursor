export type DemoScenarioId =
  | "knowledge"
  | "troubleshoot"
  | "escalate"
  | "ticket-create"
  | "ticket-status";

export type DemoScenario = {
  id: DemoScenarioId;
  step: number;
  title: string;
  prompt: string;
  expects: {
    intent: string;
    escalated?: boolean;
    action?: string | null;
    sourceIdHint?: string;
  };
  blurb: string;
};

/** Fixed prompts — deterministic agent paths for hackathon demos. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "knowledge",
    step: 1,
    title: "Knowledge",
    prompt: "What do the LED colors mean on a NovaEdge Hub?",
    blurb: "Simple FAQ grounded in KB-FAQ-010",
    expects: {
      intent: "KNOWLEDGE_QUERY",
      escalated: false,
      action: null,
      sourceIdHint: "KB-FAQ-010",
    },
  },
  {
    id: "troubleshoot",
    step: 2,
    title: "Troubleshoot",
    prompt: "Firmware update stuck at 47%",
    blurb: "Troubleshooting steps from KB-FW-014 only",
    expects: {
      intent: "TROUBLESHOOTING",
      escalated: false,
      action: null,
      sourceIdHint: "KB-FW-014",
    },
  },
  {
    id: "escalate",
    step: 3,
    title: "Escalate",
    prompt:
      "I need to talk to a human — my whole site is down and the docs are not helping",
    blurb: "Forces human handoff + ticket.create",
    expects: {
      intent: "ESCALATION",
      escalated: true,
      action: "ticket.create",
    },
  },
  {
    id: "ticket-create",
    step: 4,
    title: "Create ticket",
    prompt: "Create a ticket: Hub NE-4821 pairing fails on two phones",
    blurb: "Runs ticket.create via Swytchcode or simulation",
    expects: {
      intent: "TICKET_CREATE",
      escalated: false,
      action: "ticket.create",
    },
  },
  {
    id: "ticket-status",
    step: 5,
    title: "Ticket status",
    prompt: "What's the status of ticket 2154214521?",
    blurb: "Runs ticket.get for a fixed demo ticket ID",
    expects: {
      intent: "TICKET_STATUS",
      escalated: false,
      action: "ticket.get",
    },
  },
];

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}
