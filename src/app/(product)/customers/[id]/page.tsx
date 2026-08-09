import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, TICKETS } from "@/lib/product/sample-data";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = getCustomer(id);
  if (!customer) notFound();
  const tickets = TICKETS.filter((t) => t.customerId === customer.id);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            <Link href="/customers">Customers</Link> / {customer.name}
          </p>
          <h1>{customer.name}</h1>
          <p>{customer.email}</p>
        </div>
        <Link href="/inbox" className="btn btn-primary">
          Open conversation
        </Link>
      </div>

      <div className="grid-cards">
        <div className="panel panel-pad stat-card">
          <h3>Plan</h3>
          <strong>{customer.plan}</strong>
        </div>
        <div className="panel panel-pad stat-card">
          <h3>Status</h3>
          <strong>{customer.status}</strong>
        </div>
        <div className="panel panel-pad stat-card">
          <h3>Customer since</h3>
          <strong style={{ fontSize: 18 }}>{customer.since}</strong>
        </div>
        <div className="panel panel-pad stat-card">
          <h3>Open tickets</h3>
          <strong>{customer.openTickets}</strong>
        </div>
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No tickets for this customer.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link className="row-link" href={`/tickets/${t.id}`}>
                      {t.id}
                    </Link>
                  </td>
                  <td>{t.issue}</td>
                  <td>
                    <span className="badge badge-warn">{t.priority}</span>
                  </td>
                  <td>
                    <span className="badge badge-info">{t.status}</span>
                  </td>
                  <td className="muted">{t.updated}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
