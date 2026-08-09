"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CUSTOMERS } from "@/lib/product/sample-data";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CUSTOMERS;
    return CUSTOMERS.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.company.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Accounts ResolveAI is actively supporting.</p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search customers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search customers"
          />
        </div>
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Company</th>
              <th>Status</th>
              <th>Open tickets</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link className="row-link" href={`/customers/${c.id}`}>
                    {c.name}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.email}
                  </div>
                </td>
                <td>{c.company}</td>
                <td>
                  <span
                    className={`badge ${
                      c.status === "Active"
                        ? "badge-success"
                        : c.status === "At risk"
                          ? "badge-warn"
                          : "badge-danger"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td>{c.openTickets}</td>
                <td className="muted">{c.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
