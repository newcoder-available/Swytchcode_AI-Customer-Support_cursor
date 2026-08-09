"use client";

import { useMemo, useState } from "react";
import { ARTICLES } from "@/lib/product/sample-data";

const CATEGORIES = [
  "All",
  "Troubleshooting",
  "Firmware",
  "Network",
  "Account",
  "Installation",
] as const;

export default function KnowledgePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const rows = useMemo(() => {
    return ARTICLES.filter((a) => {
      const needle = q.trim().toLowerCase();
      const matchesQ =
        !needle ||
        a.title.toLowerCase().includes(needle) ||
        a.summary.toLowerCase().includes(needle) ||
        a.id.toLowerCase().includes(needle);
      const matchesCat = category === "All" || a.category === category;
      return matchesQ && matchesCat;
    });
  }, [q, category]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Knowledge</h1>
          <p>Verified articles ResolveAI uses to ground answers.</p>
        </div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search knowledge…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search knowledge"
          />
        </div>
      </div>

      <div className="toolbar">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`btn ${category === c ? "btn-primary" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid-cards">
        {rows.map((a) => (
          <article key={a.id} className="panel panel-pad">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span className="badge">{a.category}</span>
              <span
                className={`badge ${
                  a.status === "Verified" ? "badge-success" : "badge-warn"
                }`}
              >
                {a.status}
              </span>
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 15 }}>{a.title}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {a.summary}
            </p>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Source</dt>
              <dd className="mono">{a.id}</dd>
              <dt>Last updated</dt>
              <dd>{a.updated}</dd>
              <dt>Used by AI</dt>
              <dd>{a.usedByAi} times</dd>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
