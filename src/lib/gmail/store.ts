import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { GmailSupportTicket, GmailTicketStatus } from "@/lib/gmail/types";

type StoreShape = {
  processedMessageIds: string[];
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
    }
  >;
};

const DEFAULT_STORE: StoreShape = {
  processedMessageIds: [],
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
    return { ...DEFAULT_STORE, ...JSON.parse(raw) } as StoreShape;
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
    // Keep bounded
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
