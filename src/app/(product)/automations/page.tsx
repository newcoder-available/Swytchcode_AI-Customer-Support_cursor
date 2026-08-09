export default function AutomationsPage() {
  const rows = [
    {
      name: "Escalate low-confidence answers",
      trigger: "Confidence below threshold",
      action: "Create support ticket",
      status: "Active",
    },
    {
      name: "Ticket status lookup",
      trigger: "Customer asks for ticket status",
      action: "Retrieve ticket via Intercom",
      status: "Active",
    },
    {
      name: "Refund on verified billing request",
      trigger: "Charge ID + refund intent",
      action: "Prepare Stripe refund",
      status: "Active",
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Automations</h1>
          <p>Approved actions ResolveAI can run during a conversation.</p>
        </div>
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Automation</th>
              <th>Trigger</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.trigger}</td>
                <td>{r.action}</td>
                <td>
                  <span className="badge badge-success">{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel panel-pad">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>Powered by Swytchcode</h2>
        <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
          External actions are allowlisted and executed through Swytchcode —
          never by interpolating customer text into shell commands.
        </p>
        <div className="swx-tools">
          <code>intercom.ticket.create</code>
          <code>intercom.ticket.get</code>
          <code>stripe.charge.refund</code>
        </div>
      </div>
    </div>
  );
}
