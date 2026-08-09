export type KnowledgeArticle = {
  /** Same as sourceId — used as the canonical cite key. */
  id: string;
  sourceId: string;
  title: string;
  category:
    | "network"
    | "firmware"
    | "restart"
    | "access"
    | "installation"
    | "error-codes"
    | "escalation"
    | "maintenance"
    | "faq"
    | "billing"
    | "account"
    | "product"
    | "troubleshooting";
  tags: string[];
  summary: string;
  body: string;
  problem?: string;
  symptoms?: string;
  cause?: string;
  resolution?: string;
  whenToEscalate?: string;
  steps?: string[];
  lastUpdated?: string;
  filename?: string;
};

export type RetrievedArticle = {
  article: KnowledgeArticle;
  score: number;
};

export type ConfidenceLevel = "high" | "medium" | "low";

export type AgentIntent =
  | "KNOWLEDGE_QUERY"
  | "TROUBLESHOOTING"
  | "TICKET_CREATE"
  | "TICKET_STATUS"
  | "ESCALATION"
  | "UNKNOWN";

export type AgentActionName =
  | "ticket.create"
  | "ticket.get"
  | "refund"
  | null;

export type AgentSource = {
  id: string;
  sourceId: string;
  title: string;
  score: number;
  lastUpdated?: string;
};

export type ExecutionChannel = "swytchcode" | "simulation";

export type ExecMode = "dry-run" | "live" | "simulation";

export type AgentExecution = {
  ok: boolean;
  /** dry-run/live = real Swytchcode kernel; simulation = in-app fallback */
  mode: ExecMode;
  channel: ExecutionChannel;
  canonicalId?: string;
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
} | null;

/** Canonical structured agent response. */
export type AgentResult = {
  intent: AgentIntent;
  answer: string;
  confidence: number;
  sources: AgentSource[];
  action_required: boolean;
  action: AgentActionName;
  execution: AgentExecution;
  escalated: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  confidence?: number;
  confidenceLevel?: ConfidenceLevel;
  sources?: AgentSource[];
  steps?: string[];
  shouldEscalate?: boolean;
  intent?: AgentIntent;
  action_required?: boolean;
  action?: AgentActionName;
  execution?: AgentExecution;
  escalated?: boolean;
  agent?: AgentResult;
};

export type ChatRequest = {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  customerEmail?: string;
  autoExecute?: boolean;
};

export type ChatResponse = {
  /** Structured agent output (primary contract). */
  intent: AgentIntent;
  answer: string;
  confidence: number;
  sources: AgentSource[];
  action_required: boolean;
  action: AgentActionName;
  execution: AgentExecution;
  escalated: boolean;
  /** UI message wrapper for the chat pane. */
  message: ChatMessage;
};

export type TicketRecord = {
  id: string;
  subject: string;
  description: string;
  status: "open" | "pending" | "resolved";
  priority: "low" | "normal" | "high";
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  source: "demo" | "swytchcode";
};

export type ActionResult = {
  ok: boolean;
  action: string;
  mode: ExecMode;
  channel?: ExecutionChannel;
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
};
