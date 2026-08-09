const { exec, isSwytchcodeError } = require("@swytchcode/runtime");

async function tryOne(label, id, input, opts) {
  try {
    const result = await exec(id, input, { ...opts, timeoutMs: 30000, cwd: process.cwd() });
    console.log("OK", label, JSON.stringify(result).slice(0, 400));
  } catch (e) {
    if (isSwytchcodeError(e)) {
      console.log("ERR", label, e.message, e.details || "");
    } else {
      console.log("ERR", label, e);
    }
  }
}

(async () => {
  await tryOne("refund-dry", "stripe.charge.refund", {
    params: { charge: "ch_demo_123" },
    // reason: "requested_by_customer",
  }, { dryRun: true });

  await tryOne("ticket-create-dry", "intercom.ticket.create", {
    body: {
      ticket_type_id: "1",
      contacts: [{ email: "jordan@acme.demo" }],
      ticket_attributes: {
        _default_title_: "Webhook deliveries returning 500",
        _default_description_: "Demo escalation from ResolveAI",
      },
    },
  }, { dryRun: true });

  await tryOne("ticket-get-dry", "intercom.ticket.get", {
    params: { ticket_id: "2154214521" },
  }, { dryRun: true });
})();
