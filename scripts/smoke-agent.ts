import { runSupportAgent } from "../src/lib/agent/answer";

const cases = [
  "How do I download my invoice?",
  "My knowledge sync has been pending for an hour",
  "Create a ticket: webhook deliveries returning 500",
  "What's the status of ticket 2154214521?",
  "I need to talk to a human about billing",
  "asdf qwer zxcv",
  "I was charged twice — can I get a refund for charge ch_demo_123?",
];

async function main() {
  for (const message of cases) {
    const result = await runSupportAgent({ message });
    console.log("\n===", message);
    console.log(
      JSON.stringify(
        {
          intent: result.intent,
          confidence: result.confidence,
          escalated: result.escalated,
          action_required: result.action_required,
          action: result.action,
          sources: result.sources.map((s) => s.id),
          execution_ok: result.execution?.ok ?? null,
          answer_preview: result.answer.slice(0, 140),
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
