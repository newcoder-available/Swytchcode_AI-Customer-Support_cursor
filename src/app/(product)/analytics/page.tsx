export default function AnalyticsPage() {
  const stats = [
    { label: "Resolved by AI", value: "68%" },
    { label: "Avg. first response", value: "12s" },
    { label: "Escalation rate", value: "18%" },
    { label: "CSAT (7d)", value: "4.7" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Operational snapshot for the support workspace.</p>
        </div>
      </div>

      <div className="grid-cards">
        {stats.map((s) => (
          <div key={s.label} className="panel panel-pad stat-card">
            <h3>{s.label}</h3>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel panel-pad">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>This week</h2>
        <ul className="activity-list">
          <li>
            <span className="check">✓</span>
            <span>142 conversations handled by ResolveAI</span>
          </li>
          <li>
            <span className="check">✓</span>
            <span>31 tickets created through approved automations</span>
          </li>
          <li>
            <span className="check">✓</span>
            <span>Top knowledge article: Hub LED color meanings</span>
          </li>
        </ul>
        <p className="muted" style={{ margin: "12px 0 0", fontSize: 12 }}>
          Figures above are illustrative product metrics for the support
          workspace UI.
        </p>
      </div>
    </div>
  );
}
