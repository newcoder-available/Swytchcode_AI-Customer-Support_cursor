import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  GmailSupportTicket,
  GmailTicketPriority,
  GmailTicketStatus,
} from "@/lib/gmail/types";

export type CreatedTicketRecord = {
  id: string;
  source: "gmail";
  customerEmail: string;
  customerName: string;
  subject: string;
  description: string;
  status: GmailTicketStatus;
  priority: GmailTicketPriority;
  createdAt: string;
  updatedAt: string;
  notificationSent: boolean;
  notificationMessageId: string | null;
  threadId: string;
  aiConfidence: number | null;
  agentAnswer: string | null;
  activity: string[];
  knowledgeSources: Array<{ sourceId: string; title: string; score: number }>;
};

type StoreShape = {
  processedMessageIds: string[];
  createdTickets: CreatedTicketRecord[];
  tickets: Record<
    string,
    {
      status: GmailTicketStatus;
      priority?: GmailSupportTicket["priority"];
      aiConfidence: number | null;
      resolution: string | null;
      lastProcessedMessageId: string | null;
      lastAiMessageId: string | null;
      escalated?: boolean;
      waitingForCustomer?: boolean;
      activity: string[];
      knowledgeSources: Array<{ sourceId: string; title: string; score: number }>;
      updatedAt: string;
      customerEmail?: string;
      customerName?: string;
      subject?: string;
      description?: string;
      notificationSent?: boolean;
      notificationMessageId?: string | null;
    }
  >;
};

const DEFAULT_STORE: StoreShape = {
  processedMessageIds: [],
  createdTickets: [],
  tickets: {},
};

function storePath() {
  return join(process.cwd(), "data", "gmail-ticket-store.json");
}

function ensureStore(): StoreShape {
  const path = storePath();
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
    return structuredClone(DEFAULT_STORE);
  }
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      ...DEFAULT_STORE,
      ...parsed,
      createdTickets: parsed.createdTickets ?? [],
      tickets: parsed.tickets ?? {},
      processedMessageIds: parsed.processedMessageIds ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

function saveStore(store: StoreShape) {
  writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf8");
}

export function isMessageProcessed(messageId: string): boolean {
  const store = ensureStore();
  return store.processedMessageIds.includes(messageId);
}

export function markMessageProcessed(messageId: string) {
  const store = ensureStore();
  if (!store.processedMessageIds.includes(messageId)) {
    store.processedMessageIds.push(messageId);
    if (store.processedMessageIds.length > 5000) {
      store.processedMessageIds = store.processedMessageIds.slice(-4000);
    }
    saveStore(store);
  }
}

export function getTicketState(threadId: string) {
  return ensureStore().tickets[threadId] ?? null;
}

export function upsertTicketState(
  threadId: string,
  patch: Partial<StoreShape["tickets"][string]>,
) {
  const store = ensureStore();
  const prev = store.tickets[threadId] ?? {
    status: "NEW" as GmailTicketStatus,
    aiConfidence: null,
    resolution: null,
    lastProcessedMessageId: null,
    lastAiMessageId: null,
    activity: [],
    knowledgeSources: [],
    updatedAt: new Date().toISOString(),
  };
  store.tickets[threadId] = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.tickets[threadId];
}

export function saveCreatedTicket(ticket: CreatedTicketRecord) {
  const store = ensureStore();
  const idx = store.createdTickets.findIndex((t) => t.id === ticket.id);
  if (idx >= 0) store.createdTickets[idx] = ticket;
  else store.createdTickets.unshift(ticket);
  store.createdTickets = store.createdTickets.slice(0, 200);

  store.tickets[ticket.id] = {
    ...(store.tickets[ticket.id] ?? {
      status: ticket.status,
      aiConfidence: null,
      resolution: null,
      lastProcessedMessageId: null,
      lastAiMessageId: null,
      activity: [],
      knowledgeSources: [],
      updatedAt: ticket.updatedAt,
    }),
    status: ticket.status,
    priority: ticket.priority,
    aiConfidence: ticket.aiConfidence,
    activity: ticket.activity,
    knowledgeSources: ticket.knowledgeSources,
    customerEmail: ticket.customerEmail,
    customerName: ticket.customerName,
    subject: ticket.subject,
    description: ticket.description,
    notificationSent: ticket.notificationSent,
    notificationMessageId: ticket.notificationMessageId,
    updatedAt: ticket.updatedAt,
  };

  saveStore(store);
  return ticket;
}

export function listCreatedTickets(): CreatedTicketRecord[] {
  return ensureStore().createdTickets;
}

export function getCreatedTicket(id: string): CreatedTicketRecord | null {
  return ensureStore().createdTickets.find((t) => t.id === id) ?? null;
}
