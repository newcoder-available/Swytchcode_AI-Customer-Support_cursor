"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CreatedTicket = {
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
};

type CreateResponse = {
  ok: boolean;
  error?: string;
  mode?: string;
  ticket?: CreatedTicket;
  notification?: {
    sent: boolean;
    messageId: string | null;
    to: string;
    summary: string;
  };
  agent?: {
    intent: string;
    confidence: number;
    answer: string;
    escalated: boolean;
    sources: Array<{ sourceId: string; title: string; score: number }>;
  };
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusClass(status: string) {
  if (status === "RESOLVED") return "badge-success";
  if (status === "ESCALATED" || status === "CUSTOMER_REPLIED") return "badge-warn";
  if (status === "NEW") return "badge-danger";
  return "badge-info";
}

export function TicketsWorkspace() {
  const router = useRouter();
  const [tickets, setTickets] = useState<CreatedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateResponse | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    subject: "",
    description: "",
    priority: "NORMAL",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter(
      (t) =>
        t.id.toLowerCase().includes(needle) ||
        t.customerEmail.toLowerCase().includes(needle) ||
        t.customerName.toLowerCase().includes(needle) ||
        t.subject.toLowerCase().includes(needle),
    );
  }, [tickets, q]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          runAgent: true,
        }),
      });
      const data = (await res.json()) as CreateResponse;
      if (!data.ok || !data.ticket) {
        setError(data.error || "Ticket could not be created");
        return;
      }
      setSuccess(data);
      setForm({
        customerName: "",
        customerEmail: "",
        subject: "",
        description: "",
        priority: "NORMAL",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ticket could not be created");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page tickets-page">
      <div className="page-head">
        <div>
          <h1>Tickets</h1>
          <p>
            Create a support ticket from user input. Customer email is required,
            shown on the ticket, and notified by Gmail via Swytchcode.
          </p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search by email, subject, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search tickets"
          />
          <button type="button" className="btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="tickets-layout">
        <form className="panel panel-pad create-ticket-form" onSubmit={onCreate}>
          <h2>Create ticket</h2>

          <label className="field">
            <span>Customer name</span>
            <input
              className="input"
              value={form.customerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerName: e.target.value }))
              }
              placeholder="Jordan Miller"
              required
            />
          </label>

          <label className="field">
            <span>Customer email</span>
            <input
              className="input"
              type="email"
              value={form.customerEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerEmail: e.target.value }))
              }
              placeholder="customer@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Subject</span>
            <input
              className="input"
              value={form.subject}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject: e.target.value }))
              }
              placeholder="Device showing Error E102"
              required
            />
          </label>

          <label className="field">
            <span>Issue / message</span>
            <textarea
              className="input"
              rows={5}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe the customer issue…"
              required
            />
          </label>

          <label className="field">
            <span>Priority</span>
            <select
              className="select"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ width: "100%" }}
          >
            {busy ? "Creating + notifying…" : "Create ticket & notify email"}
          </button>
        </form>

        <div className="tickets-main">
          {success?.ticket && (
            <div className="panel panel-pad success-card" role="status">
              <h3>Ticket created</h3>
              <dl className="kv">
                <dt>Ticket ID</dt>
                <dd className="mono">{success.ticket.id}</dd>
                <dt>Customer email</dt>
                <dd>
                  <strong>{success.ticket.customerEmail}</strong>
                </dd>
                <dt>Customer</dt>
                <dd>{success.ticket.customerName}</dd>
                <dt>Notification</dt>
                <dd>
                  {success.notification?.sent
                    ? `Sent to ${success.notification.to}`
                    : success.notification?.summary || "Not sent"}
                </dd>
                <dt>Status</dt>
                <dd>{success.ticket.status.replaceAll("_", " ")}</dd>
                <dt>AI confidence</dt>
                <dd>
                  {success.agent
                    ? `${Math.round(success.agent.confidence * 100)}% · ${success.agent.intent}`
                    : "—"}
                </dd>
              </dl>
              {success.agent?.answer && (
                <div className="agent-preview">
                  <h4>Agent response</h4>
                  <p className="whitespace-pre-wrap">{success.agent.answer}</p>
                </div>
              )}
              <div className="toolbar" style={{ marginTop: 12 }}>
                <Link
                  className="btn btn-primary"
                  href={`/tickets/${encodeURIComponent(success.ticket.id)}`}
                >
                  Open ticket
                </Link>
                <Link className="btn" href="/inbox">
                  Open inbox
                </Link>
              </div>
            </div>
          )}

          <div className="panel table-wrap">
            {loading ? (
              <div className="panel-pad muted">Loading tickets…</div>
            ) : rows.length === 0 ? (
              <div className="panel-pad muted">
                No tickets yet. Create one with a customer email to send a
                notification and run the agent.
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer email</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Notify</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() =>
                        router.push(`/tickets/${encodeURIComponent(t.id)}`)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <Link
                          className="row-link"
                          href={`/tickets/${encodeURIComponent(t.id)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t.id.slice(0, 16)}…
                        </Link>
                      </td>
                      <td>
                        <strong>{t.customerEmail}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.customerName}
                        </div>
                      </td>
                      <td>{t.subject}</td>
                      <td>
                        <span
                          className={`badge ${
                            t.priority === "URGENT" || t.priority === "HIGH"
                              ? "badge-warn"
                              : "badge-info"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(t.status)}`}>
                          {t.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        {t.notificationSent ? (
                          <span className="badge badge-success">Sent</span>
                        ) : (
                          <span className="badge badge-warn">Pending</span>
                        )}
                      </td>
                      <td className="muted">{formatWhen(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
