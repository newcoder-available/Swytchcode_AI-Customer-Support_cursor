import { DEMO_SCENARIOS } from "../src/lib/demo/scenarios";
import { runSupportAgent } from "../src/lib/agent/answer";

async function main() {
  for (const s of DEMO_SCENARIOS) {
    const r = await runSupportAgent({ message: s.prompt });
    console.log(`\n=== ${s.step}. ${s.title}`);
    console.log(
      JSON.stringify(
        {
          prompt: s.prompt,
          expected_intent: s.expects.intent,
          intent: r.intent,
          intent_ok: r.intent === s.expects.intent,
          escalated: r.escalated,
          action: r.action,
          channel: r.execution?.channel ?? null,
          mode: r.execution?.mode ?? null,
          top_source: r.sources[0]?.sourceId ?? null,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
