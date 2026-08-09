"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TICKETS } from "@/lib/product/sample-data";

export default function TicketsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    return TICKETS.filter((t) => {
      const needle = q.trim().toLowerCase();
      const matchesQ =
        !needle ||
        t.id.toLowerCase().includes(needle) ||
        t.customerName.toLowerCase().includes(needle) ||
        t.issue.toLowerCase().includes(needle) ||
        t.subject.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || t.status === status;
      return matchesQ && matchesStatus;
    });
  }, [q, status]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Tickets</h1>
          <p>Track open work across customers and teams.</p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search tickets…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search tickets"
          />
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option>All</option>
            <option>Open</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Customer</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link className="row-link" href={`/tickets/${t.id}`}>
                    {t.id}
                  </Link>
                </td>
                <td>{t.customerName}</td>
                <td>{t.issue}</td>
                <td>
                  <span
                    className={`badge ${
                      t.priority === "Urgent" || t.priority === "High"
                        ? "badge-warn"
                        : "badge-info"
                    }`}
                  >
                    {t.priority}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      t.status === "Resolved"
                        ? "badge-success"
                        : t.status === "Pending"
                          ? "badge-warn"
                          : "badge-info"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>{t.assigned}</td>
                <td className="muted">{t.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
