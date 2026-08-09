export type GmailTicketStatus =
  | "NEW"
  | "AI_ANALYZING"
  | "WAITING_FOR_CUSTOMER"
  | "AI_RESPONDED"
  | "CUSTOMER_REPLIED"
  | "ESCALATED"
  | "RESOLVED";

export type GmailTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ThreadMessageRole = "customer" | "agent" | "human" | "unknown";

export type GmailThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate: string;
  snippet: string;
  bodyText: string;
  role: ThreadMessageRole;
  labelIds: string[];
};

export type GmailSupportTicket = {
  id: string;
  source: "gmail";
  customerEmail: string;
  customerName: string;
  subject: string;
  status: GmailTicketStatus;
  priority: GmailTicketPriority;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt: string;
  lastMessageFrom: "customer" | "agent" | "human" | "unknown";
  aiConfidence: number | null;
  resolution: string | null;
  snippet: string;
  unread: boolean;
  labels: string[];
  lastProcessedMessageId: string | null;
  messages?: GmailThreadMessage[];
  knowledgeSources?: Array<{ sourceId: string; title: string; score: number }>;
  activity?: string[];
  mode?: "live" | "dry-run" | "demo";
};

export type GmailConnectionState = {
  connected: boolean;
  emailAddress: string | null;
  mode: "live" | "dry-run" | "demo";
  error?: string;
};
