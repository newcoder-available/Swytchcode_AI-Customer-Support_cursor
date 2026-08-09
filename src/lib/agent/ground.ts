import type { RetrievedArticle } from "@/lib/types";

export type GroundedAnswer = {
  answer: string;
  steps: string[];
  grounded: boolean;
};

/**
 * Build an answer strictly from retrieved KB articles.
 * Always cite source_id. Never invent troubleshooting steps.
 */
export function buildGroundedAnswer(
  intent: string,
  retrieved: RetrievedArticle[],
  opts?: { includeSteps?: boolean },
): GroundedAnswer {
  if (retrieved.length === 0) {
    return {
      grounded: false,
      steps: [],
      answer:
        "I don't have a grounded knowledge-base match for that. I won't guess — escalating to a human is the safest next step.",
    };
  }

  const top = retrieved[0].article;
  const related = retrieved.slice(1);

  const parts: string[] = [
    `**${top.title}**`,
    `Source: \`${top.sourceId}\`${top.lastUpdated ? ` | Updated ${top.lastUpdated}` : ""}`,
    "",
  ];

  if (top.problem) {
    parts.push(`**Problem:** ${top.problem}`, "");
  }
  if (top.symptoms) {
    parts.push(`**Symptoms:** ${top.symptoms}`, "");
  }
  if (top.cause) {
    parts.push(`**Cause:** ${top.cause}`, "");
  }

  const includeSteps =
    opts?.includeSteps ??
    (intent === "TROUBLESHOOTING" || Boolean(top.steps?.length));

  const steps =
    includeSteps && Array.isArray(top.steps) && top.steps.length > 0
      ? [...top.steps]
      : [];

  if (steps.length > 0) {
    parts.push("**Resolution** (from knowledge base):");
    steps.forEach((step, i) => {
      parts.push(`${i + 1}. ${step}`);
    });
    parts.push("");
  } else if (top.resolution) {
    parts.push(`**Resolution:**\n${top.resolution}`, "");
  }

  if (top.whenToEscalate) {
    parts.push(`**When to escalate:** ${top.whenToEscalate}`, "");
  }

  parts.push(`Cited source ID: \`${top.sourceId}\``);

  if (related.length > 0) {
    parts.push(
      "",
      `Related: ${related
        .map((r) => `${r.article.title} (\`${r.article.sourceId}\`)`)
        .join("; ")}.`,
    );
  }

  return {
    grounded: true,
    steps,
    answer: parts.join("\n"),
  };
}

export function lowConfidenceAnswer(reason: string): string {
  return `I don't have enough grounded knowledge to answer confidently (${reason}). Escalating instead of guessing.`;
}
