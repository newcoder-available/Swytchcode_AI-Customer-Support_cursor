"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Ticket = {
  id: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  notificationSent: boolean;
  notificationMessageId: string | null;
  aiConfidence: number | null;
  agentAnswer: string | null;
  activity: string[];
  knowledgeSources: Array<{ sourceId: string; title: string; score: number }>;
  threadId?: string;
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [updateNote, setUpdateNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!data.ok || !data.ticket) {
        setError(data.error || "Ticket not found");
        setTicket(null);
        return;
      }
      setTicket(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendUpdate(useAi: boolean) {
    if (!ticket) return;
    setBusy(useAi ? "ai" : "manual");
    setFlash(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            useAi,
            message: updateNote.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Update could not be sent.");
        return;
      }
      setTicket(data.ticket);
      setUpdateNote("");
      setFlash(
        data.notification?.summary ||
          `Update sent to ${ticket.customerEmail}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page">
        <p className="error-banner">{error || "Ticket not found"}</p>
        <Link href="/tickets" className="btn">
          Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            <Link href="/tickets">Tickets</Link> / {ticket.id}
          </p>
          <h1>{ticket.subject}</h1>
          <p>
            <strong>{ticket.customerName}</strong> ·{" "}
            <a href={`mailto:${ticket.customerEmail}`}>{ticket.customerEmail}</a>
          </p>
        </div>
        <div className="toolbar">
          <span className="badge badge-warn">{ticket.priority}</span>
          <span className="badge badge-info">
            {ticket.status.replaceAll("_", " ")}
          </span>
          <Link
            href={`/inbox?thread=${encodeURIComponent(ticket.id)}`}
            className="btn"
          >
            Open in Inbox
          </Link>
          <button type="button" className="btn" onClick={() => router.refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {flash && (
        <div className="panel panel-pad success-card" role="status">
          {flash}
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="grid-cards">
        <div className="panel panel-pad">
          <h3 className="muted" style={{ margin: "0 0 8px", fontSize: 11 }}>
            CUSTOMER & NOTIFICATION
          </h3>
          <dl className="kv">
            <dt>Email</dt>
            <dd>
              <strong>{ticket.customerEmail}</strong>
            </dd>
            <dt>Name</dt>
            <dd>{ticket.customerName}</dd>
            <dt>Notification</dt>
            <dd>
              {ticket.notificationSent
                ? `Sent (${ticket.notificationMessageId || "gmail"})`
                : "Not sent"}
            </dd>
            <dt>Ticket ID</dt>
            <dd className="mono" style={{ fontSize: 11 }}>
              {ticket.id}
            </dd>
            <dt>Created</dt>
            <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
            <dt>Updated</dt>
            <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
          </dl>
        </div>

        <div className="panel panel-pad" style={{ gridColumn: "span 2" }}>
          <h3 className="muted" style={{ margin: "0 0 8px", fontSize: 11 }}>
            ISSUE
          </h3>
          <p className="whitespace-pre-wrap">{ticket.description}</p>

          <h3 className="muted" style={{ margin: "16px 0 8px", fontSize: 11 }}>
            LATEST AI / UPDATE
          </h3>
          <p>
            Confidence:{" "}
            {ticket.aiConfidence != null
              ? `${Math.round(ticket.aiConfidence * 100)}%`
              : "—"}
          </p>
          {ticket.agentAnswer && (
            <p className="whitespace-pre-wrap">{ticket.agentAnswer}</p>
          )}

          <h3 className="muted" style={{ margin: "16px 0 8px", fontSize: 11 }}>
            SEND CUSTOMER UPDATE
          </h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Sends an email to <strong>{ticket.customerEmail}</strong> on this
            Gmail thread via Swytchcode.
          </p>
          <textarea
            className="input"
            rows={4}
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
            placeholder="Optional note for the AI (or write a manual update)…"
            disabled={!!busy}
          />
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!!busy}
              onClick={() => void sendUpdate(true)}
            >
              {busy === "ai" ? "Sending AI update…" : "Send AI update to customer"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!!busy || !updateNote.trim()}
              onClick={() => void sendUpdate(false)}
            >
              {busy === "manual" ? "Sending…" : "Send manual update"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!!busy}
              onClick={() => void load()}
            >
              Reload ticket
            </button>
          </div>

          <h3 className="muted" style={{ margin: "16px 0 8px", fontSize: 11 }}>
            ACTIVITY
          </h3>
          <ul className="activity-list">
            {ticket.activity.map((step, idx) => (
              <li key={`${idx}-${step}`}>
                <span className="check">✓</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>

          {(ticket.knowledgeSources || []).length > 0 && (
            <>
              <h3 className="muted" style={{ margin: "16px 0 8px", fontSize: 11 }}>
                KNOWLEDGE
              </h3>
              <ul>
                {ticket.knowledgeSources.map((s) => (
                  <li key={s.sourceId}>
                    <code>{s.sourceId}</code> {s.title} (
                    {Math.round(s.score * 100)}%)
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
