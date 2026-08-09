"use client";

import { useEffect, useState } from "react";

type HealthPayload = {
  ok: boolean;
  execMode?: string;
  cli?: { available: boolean; version: string | null };
  allowlist?: Array<{ operation: string; canonicalId: string; enabled: boolean }>;
  doctor?: { ok: boolean; summary?: string };
  error?: string;
};

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as HealthPayload;
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ ok: false, error: "Health check failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Workspace preferences and system status.</p>
        </div>
      </div>

      <div className="grid-cards">
        <div className="panel panel-pad">
          <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>Workspace</h2>
          <dl className="kv">
            <dt>Product</dt>
            <dd>ResolveAI</dd>
            <dt>Brand</dt>
            <dd>NovaEdge Support</dd>
            <dt>Default channel</dt>
            <dd>Chat</dd>
            <dt>Escalation queue</dt>
            <dd>Technical Support</dd>
          </dl>
        </div>

        <div className="panel panel-pad" style={{ gridColumn: "span 2" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>System status</h2>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 12 }}>
            Gmail ticketing uses Swytchcode OAuth. Connect with{" "}
            <code>swytchcode auth connect Gmail</code>, then set{" "}
            <code>SWYTCHCODE_MODE=live</code>.
          </p>
          {!health ? (
            <div className="skeleton" style={{ width: "60%" }} />
          ) : (
            <>
              <dl className="kv">
                <dt>Integrations</dt>
                <dd>
                  <span
                    className={`badge ${health.ok ? "badge-success" : "badge-warn"}`}
                  >
                    {health.ok ? "Ready" : "Needs attention"}
                  </span>
                </dd>
                <dt>Execution mode</dt>
                <dd className="mono">{health.execMode ?? "—"}</dd>
                <dt>CLI</dt>
                <dd>
                  {health.cli?.available
                    ? `Available${health.cli.version ? ` · ${health.cli.version}` : ""}`
                    : "Unavailable"}
                </dd>
              </dl>
              <div style={{ marginTop: 12 }}>
                <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>
                  Allowlisted actions
                </p>
                <div className="swx-tools">
                  {(health.allowlist ?? []).map((a) => (
                    <code key={a.canonicalId}>
                      {a.canonicalId}
                      {a.enabled ? "" : " (off)"}
                    </code>
                  ))}
                </div>
              </div>
              {health.error && (
                <p className="error-banner" style={{ margin: "12px 0 0" }}>
                  {health.error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
