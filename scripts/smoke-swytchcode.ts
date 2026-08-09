import { getHealthReport } from "../src/lib/swytchcode/health";
import {
  createTicket,
  getTicket,
  runRefundAction,
} from "../src/lib/swytchcode/actions";

async function main() {
  const h = getHealthReport();
  console.log(
    JSON.stringify(
      {
        ok: h.ok,
        version: h.cli.version,
        mode: h.execMode,
        allowlist: h.allowlist,
      },
      null,
      2,
    ),
  );

  const t = await createTicket({
    subject: "Webhook 500s",
    description: "Escalation from ResolveAI",
    customerEmail: "jordan@acme.demo",
  });
  console.log("ticket", JSON.stringify(t).slice(0, 600));

  const g = await getTicket("2154214521");
  console.log("get", JSON.stringify(g).slice(0, 500));

  const r = await runRefundAction({ chargeId: "ch_demo_123" });
  console.log("refund", JSON.stringify(r).slice(0, 500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
