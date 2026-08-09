"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GmailSupportTicket } from "@/lib/gmail/types";

type InboxResponse = {
  ok: boolean;
  mode?: string;
  error?: string;
  tickets?: GmailSupportTicket[];
  pollIntervalMs?: number;
  connection?: {
    connected: boolean;
    emailAddress: string | null;
    mode: string;
    error?: string;
  };
};

function statusClass(status: string) {
  if (status === "RESOLVED") return "badge-success";
  if (status === "ESCALATED" || status === "CUSTOMER_REPLIED") return "badge-warn";
  if (status === "NEW") return "badge-danger";
  return "badge-info";
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export function InboxWorkspace() {
  const [tickets, setTickets] = useState<GmailSupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<GmailSupportTicket | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pollMs, setPollMs] = useState(15000);
  const selectedRef = useRef<string | null>(null);
  const loadingInboxRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const loadInbox = useCallback(async (opts?: { silent?: boolean }) => {
    if (loadingInboxRef.current && opts?.silent) return;
    loadingInboxRef.current = true;
    if (!opts?.silent) setLoadingInbox(true);
    try {
      const data = await fetchJson<InboxResponse>("/api/gmail/inbox");
      setMode(data.mode || data.connection?.mode || "");
      setSupportEmail(data.connection?.emailAddress ?? null);
      setConnected(Boolean(data.connection?.connected));
      setPollMs(data.pollIntervalMs || 15000);
      setTickets(data.tickets || []);
      setConnectionError(
        data.error ||
          data.connection?.error ||
          (!data.ok ? "Gmail connection unavailable" : null),
      );
      setSelectedId((prev) => {
        if (prev && (data.tickets || []).some((t) => t.id === prev)) return prev;
        return data.tickets?.[0]?.id || null;
      });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setConnectionError(
        aborted
          ? "Inbox request timed out. Check Swytchcode / Gmail connection."
          : err instanceof Error
            ? err.message
            : "Gmail connection unavailable",
      );
      setTickets([]);
    } finally {
      loadingInboxRef.current = false;
      setLoadingInbox(false);
    }
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const data = await fetchJson<{
        ok: boolean;
        error?: string;
        ticket?: GmailSupportTicket;
      }>(`/api/gmail/threads/${encodeURIComponent(threadId)}`, undefined, 20_000);
      if (!data.ok || !data.ticket) {
        setError(data.error || "Thread retrieval failed");
        return;
      }
      setTicket(data.ticket);
      setTickets((prev) =>
        prev.map((t) => (t.id === data.ticket!.id ? { ...t, ...data.ticket! } : t)),
      );
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
          ? "Thread request timed out. Retry."
          : err instanceof Error
            ? err.message
            : "Thread retrieval failed",
      );
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
    else setTicket(null);
  }, [selectedId, loadThread]);

  useEffect(() => {
    // Only poll live Gmail; dry-run/demo stay idle to keep UI responsive.
    if (mode !== "live") return;
    const id = window.setInterval(() => {
      void (async () => {
        await fetch("/api/gmail/poll", { method: "POST" }).catch(() => null);
        await loadInbox({ silent: true });
        if (selectedRef.current) await loadThread(selectedRef.current);
      })();
    }, Math.max(pollMs, 10_000));
    return () => window.clearInterval(id);
  }, [pollMs, loadInbox, loadThread, mode]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || ticket,
    [tickets, selectedId, ticket],
  );

  const liveReady = mode === "live" && connected;

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setBusy("reply");
    setError(null);
    try {
      const data = await fetchJson<{ ok: boolean; error?: string }>(
        `/api/gmail/threads/${encodeURIComponent(selectedId)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply.trim() }),
        },
        30_000,
      );
      if (!data.ok) {
        setError(data.error || "Reply could not be sent.");
        return;
      }
      setReply("");
      await loadThread(selectedId);
      await loadInbox({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  async function runProcess(extra?: { escalate?: boolean; markResolved?: boolean }) {
    if (!selectedId) return;
    setBusy("process");
    setError(null);
    try {
      const data = await fetchJson<{ ok: boolean; error?: string }>(
        `/api/gmail/threads/${encodeURIComponent(selectedId)}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extra || {}),
        },
        45_000,
      );
      if (!data.ok) {
        setError(data.error || "Could not process ticket");
        return;
      }
      await loadThread(selectedId);
      await loadInbox({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process ticket");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="gmail-inbox">
      <aside className="ticket-list panel" aria-label="Support inbox">
        <div className="ticket-list-head">
          <div>
            <h2>Inbox</h2>
            <p className="muted">
              {supportEmail || "Gmail support threads"}
              {mode ? ` · ${mode}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => void loadInbox()}
            disabled={loadingInbox}
          >
            {loadingInbox ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className={`conn-banner ${liveReady ? "ok" : "warn"}`} role="status">
          <span className={`conn-dot ${liveReady ? "on" : ""}`} aria-hidden />
          <div>
            <strong>
              {liveReady ? "Gmail connected" : "Gmail not live yet"}
            </strong>
            <p>
              {liveReady
                ? "Polling for new support threads."
                : connectionError ||
                  "Run swytchcode auth connect Gmail, then set SWYTCHCODE_MODE=live."}
            </p>
          </div>
        </div>

        {loadingInbox ? (
          <div className="panel-pad ticket-skel">
            <div className="skeleton" style={{ width: "88%", height: 48 }} />
            <div className="skeleton" style={{ width: "76%", height: 48 }} />
            <div className="skeleton" style={{ width: "82%", height: 48 }} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-inbox-list">
            <h3>No support tickets</h3>
            <p>
              {liveReady
                ? "Send an email to your support inbox to create the first ticket."
                : "This is not simulated Gmail data. Connect your mailbox to see real threads."}
            </p>
            {!liveReady && (
              <ol className="setup-steps">
                <li>
                  <code>swytchcode auth connect Gmail</code>
                </li>
                <li>
                  Set <code>SWYTCHCODE_MODE=live</code> in <code>.env.local</code>
                </li>
                <li>Restart the app and refresh Inbox</li>
              </ol>
            )}
          </div>
        ) : (
          <ul className="ticket-rows">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`ticket-row ${selectedId === t.id ? "active" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="ticket-row-top">
                    <span className={`badge ${statusClass(t.status)}`}>
                      {t.unread ? "● " : ""}
                      {t.status.replaceAll("_", " ")}
                    </span>
                    <span className="muted">{formatWhen(t.updatedAt)}</span>
                  </div>
                  <strong>{t.subject}</strong>
                  <span className="muted">
                    {t.customerName} · {t.priority}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="conversation" aria-label="Conversation">
        {!selectedId ? (
          <div className="empty-inbox">
            <h3>Select a support email</h3>
            <p>Gmail threads appear here as tickets once connected.</p>
          </div>
        ) : (
          <>
            <div className="conv-header">
              <div className="customer-line">
                <span className="avatar teal" aria-hidden>
                  {(ticket?.customerName || selected?.customerName || "?")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <h2>{ticket?.customerName || selected?.customerName}</h2>
                  <p>{ticket?.customerEmail || selected?.customerEmail}</p>
                </div>
              </div>
              <span
                className={`badge ${statusClass(ticket?.status || selected?.status || "NEW")}`}
              >
                {(ticket?.status || selected?.status || "").replaceAll("_", " ")}
              </span>
            </div>
            <div className="subject-bar">
              <span className="muted">Subject · </span>
              <strong>{ticket?.subject || selected?.subject}</strong>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}

            <div className="thread" role="log">
              {loadingThread && (
                <div className="typing">Loading conversation…</div>
              )}
              {!loadingThread && (ticket?.messages || []).length === 0 && (
                <div className="empty-inbox">
                  <p className="muted">
                    {error
                      ? "Could not load this thread."
                      : "Open a live ticket to read the Gmail conversation."}
                  </p>
                </div>
              )}
              {(ticket?.messages || []).map((m) => (
                <div
                  key={m.id}
                  className={`bubble-row ${m.role === "customer" ? "mine" : ""}`}
                >
                  {m.role !== "customer" && (
                    <span className="avatar teal" aria-hidden>
                      {m.role === "human" ? "HS" : "RA"}
                    </span>
                  )}
                  <div className="bubble">
                    <div className="bubble-meta">
                      <span>
                        {m.role === "customer"
                          ? "Customer"
                          : m.role === "human"
                            ? "Human support"
                            : "ResolveAI"}
                      </span>
                      <span>
                        {m.date ||
                          formatWhen(
                            new Date(
                              Number(m.internalDate || Date.now()),
                            ).toISOString(),
                          )}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {m.bodyText || m.snippet}
                    </div>
                  </div>
                </div>
              ))}

              {(ticket?.activity || []).length > 0 && (
                <div className="activity-card">
                  <ul>
                    {ticket!.activity!.map((step) => (
                      <li key={step}>
                        <span className="check">✓</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  <details className="swx-details">
                    <summary>Technical detail · Swytchcode</summary>
                    <div className="swx-tools">
                      <code>gmail.user.threads.get1</code>
                      <code>gmail.user.send.create1</code>
                      <code>{mode || "gmail"}</code>
                    </div>
                  </details>
                </div>
              )}
            </div>

            <div className="composer">
              <div className="composer-tools">
                <button
                  type="button"
                  className="btn"
                  disabled={!!busy || !liveReady}
                  onClick={() => void runProcess()}
                >
                  {busy === "process" ? "Working…" : "AI Assist"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!!busy || !liveReady}
                  onClick={() => void runProcess({ escalate: true })}
                >
                  Escalate
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!!busy}
                  onClick={() => void runProcess({ markResolved: true })}
                >
                  Mark resolved
                </button>
              </div>
              <form
                className="composer-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendReply();
                }}
              >
                <textarea
                  className="composer-input"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={
                    liveReady
                      ? `Reply to ${ticket?.customerName?.split(" ")[0] || "customer"}…`
                      : "Connect Gmail in live mode to send replies"
                  }
                  disabled={!!busy || !liveReady}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!!busy || !reply.trim() || !liveReady}
                >
                  {busy === "reply" ? "Sending…" : "Send"}
                </button>
              </form>
            </div>
          </>
        )}
      </section>

      <aside className="context" aria-label="Ticket context">
        <div className="context-scroll">
          <section className="ctx-section">
            <h3>Customer</h3>
            <div className="ctx-card">
              <strong>{ticket?.customerName || selected?.customerName || "—"}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {ticket?.customerEmail || selected?.customerEmail || "—"}
              </p>
            </div>
          </section>

          <section className="ctx-section">
            <h3>Ticket</h3>
            <div className="ctx-card">
              <dl className="kv">
                <dt>ID</dt>
                <dd className="mono" style={{ fontSize: 11 }}>
                  {ticket?.id || selected?.id
                    ? `${(ticket?.id || selected?.id || "").slice(0, 18)}…`
                    : "—"}
                </dd>
                <dt>Status</dt>
                <dd>
                  {(ticket?.status || selected?.status || "—").toString().replaceAll("_", " ")}
                </dd>
                <dt>Priority</dt>
                <dd>{ticket?.priority || selected?.priority || "—"}</dd>
                <dt>Messages</dt>
                <dd>{ticket?.messageCount || selected?.messageCount || 0}</dd>
                <dt>Last activity</dt>
                <dd>
                  {ticket?.lastMessageAt || selected?.updatedAt
                    ? formatWhen(
                        ticket?.lastMessageAt ||
                          selected?.updatedAt ||
                          new Date().toISOString(),
                      )
                    : "—"}
                </dd>
              </dl>
            </div>
          </section>

          <section className="ctx-section">
            <h3>AI resolution</h3>
            <div className="ctx-card">
              <dl className="kv">
                <dt>Confidence</dt>
                <dd>
                  {ticket?.aiConfidence != null
                    ? `${Math.round(ticket.aiConfidence * 100)}%`
                    : "—"}
                </dd>
                <dt>Knowledge</dt>
                <dd>{ticket?.knowledgeSources?.length ?? 0} sources</dd>
              </dl>
              {(ticket?.knowledgeSources || []).map((s) => (
                <div
                  key={s.sourceId}
                  className="muted"
                  style={{ fontSize: 12, marginTop: 6 }}
                >
                  <code>{s.sourceId}</code> {s.title}
                </div>
              ))}
            </div>
          </section>

          <section className="ctx-section">
            <h3>Actions</h3>
            <div className="ctx-actions">
              <button
                type="button"
                className="btn"
                disabled={!!busy || !selectedId || !liveReady}
                onClick={() => void runProcess()}
              >
                Reply with AI
              </button>
              <button
                type="button"
                className="btn"
                disabled={!!busy || !selectedId || !liveReady}
                onClick={() => void runProcess({ escalate: true })}
              >
                Escalate
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!busy || !selectedId}
                onClick={() => void runProcess({ markResolved: true })}
              >
                Mark resolved
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
