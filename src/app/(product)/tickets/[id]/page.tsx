import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicket } from "@/lib/product/sample-data";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) notFound();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            <Link href="/tickets">Tickets</Link> / {ticket.id}
          </p>
          <h1>{ticket.subject}</h1>
          <p>
            {ticket.customerName} · {ticket.customerEmail}
          </p>
        </div>
        <div className="toolbar">
          <span className="badge badge-warn">{ticket.priority}</span>
          <span className="badge badge-info">{ticket.status}</span>
          <Link href="/inbox" className="btn btn-primary">
            Open in Inbox
          </Link>
        </div>
      </div>

      <div className="grid-cards">
        <div className="panel panel-pad">
          <h3 className="muted" style={{ margin: "0 0 8px", fontSize: 11 }}>
            DETAILS
          </h3>
          <dl className="kv">
            <dt>Ticket</dt>
            <dd className="mono">{ticket.id}</dd>
            <dt>Issue</dt>
            <dd>{ticket.issue}</dd>
            <dt>Assigned</dt>
            <dd>{ticket.assigned}</dd>
            <dt>Created</dt>
            <dd>{ticket.created}</dd>
            <dt>Updated</dt>
            <dd>{ticket.updated}</dd>
          </dl>
        </div>
        <div className="panel panel-pad" style={{ gridColumn: "span 2" }}>
          <h3 className="muted" style={{ margin: "0 0 8px", fontSize: 11 }}>
            TIMELINE
          </h3>
          <ul className="activity-list">
            <li>
              <span className="check">✓</span>
              <span>Customer reported {ticket.issue}</span>
            </li>
            <li>
              <span className="check">✓</span>
              <span>ResolveAI classified intent and checked knowledge</span>
            </li>
            <li>
              <span className="check">✓</span>
              <span>Assigned to {ticket.assigned}</span>
            </li>
            <li>
              <span className="check">✓</span>
              <span>Status set to {ticket.status}</span>
            </li>
          </ul>
          <details className="swx-details">
            <summary>AI activity · Powered by Swytchcode</summary>
            <div className="swx-tools">
              <code>intercom.ticket.create</code>
              <code>intercom.ticket.get</code>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
