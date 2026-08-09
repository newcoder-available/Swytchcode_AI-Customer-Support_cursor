import { loadKnowledgeArticles } from "../src/lib/knowledge/load";
import { runSupportAgent } from "../src/lib/agent/answer";

async function main() {
  const articles = loadKnowledgeArticles(true);
  console.log(
    "KB docs:",
    articles.length,
    articles.map((a) => a.sourceId).join(", "),
  );

  const samples = [
    "Hub went offline after we changed the Wi-Fi password",
    "Firmware update stuck at 47%",
    "What does error code E-NET-14 mean?",
    "When should I escalate to a human?",
    "What do the LED colors mean?",
  ];

  for (const message of samples) {
    const r = await runSupportAgent({ message, autoExecute: false });
    console.log("\n===", message);
    console.log(
      JSON.stringify(
        {
          intent: r.intent,
          confidence: r.confidence,
          sources: r.sources.map((s) => s.sourceId),
          cites: /KB-[A-Z]+-\d+/.test(r.answer),
          answer_head: r.answer.split("\n").slice(0, 4),
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
