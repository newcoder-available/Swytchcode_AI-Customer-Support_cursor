import { loadKnowledgeArticles } from "@/lib/knowledge/load";
import type { RetrievedArticle } from "@/lib/types";

function normalizeToken(token: string): string {
  let t = token.toLowerCase().replace(/wi-fi/g, "wifi");
  if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
  return t;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "what",
  "does",
  "how",
  "can",
  "you",
  "are",
  "is",
  "do",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "our",
  "we",
  "after",
  "from",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/wi-fi/g, "wifi")
    .replace(/[^a-z0-9\s_.-]/g, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function retrieveArticles(
  query: string,
  limit = 3,
): RetrievedArticle[] {
  const articles = loadKnowledgeArticles();
  const qTokens = tokenize(query);
  const qSet = new Set(qTokens);
  if (qSet.size === 0) return [];

  const lower = query.toLowerCase().replace(/wi-fi/g, "wifi");

  const scored = articles
    .map((article) => {
      const titleTokens = tokenize(article.title);
      const titleSet = new Set(titleTokens);
      const tagSet = new Set(
        article.tags.flatMap((t) => tokenize(t)),
      );
      const bodyTokens = tokenize(
        [
          article.summary,
          article.problem,
          article.symptoms,
          article.cause,
          article.resolution,
          article.whenToEscalate,
        ]
          .filter(Boolean)
          .join(" "),
      );
      const bodySet = new Set(bodyTokens);

      let raw = 0;
      for (const token of qSet) {
        if (titleSet.has(token)) raw += 5;
        if (tagSet.has(token)) raw += 4;
        if (bodySet.has(token)) raw += 1;
      }

      // Distinctive product terms
      if (lower.includes("wifi") && tagSet.has("wifi")) raw += 8;
      if (lower.includes("offline") && (titleSet.has("offline") || tagSet.has("offline"))) {
        raw += 6;
      }
      if (lower.includes("firmware") && tagSet.has("firmware")) raw += 8;
      if (lower.includes("led") && (tagSet.has("led") || titleSet.has("faq") || article.sourceId === "KB-FAQ-010")) {
        raw += 10;
      }
      if (lower.includes("color") && article.sourceId === "KB-FAQ-010") raw += 8;
      if (lower.includes("maintenance") && tagSet.has("maintenance")) raw += 8;
      if (lower.includes("pairing") || lower.includes("install")) {
        if (tagSet.has("pairing") || tagSet.has("installation") || tagSet.has("install")) {
          raw += 6;
        }
      }
      if (lower.includes("escalat") && (tagSet.has("escalation") || article.category === "escalation")) {
        raw += 10;
      }

      for (const tag of article.tags) {
        if (/^e-[a-z]+-\d+/i.test(tag) && lower.includes(tag.toLowerCase())) {
          raw += 14;
        }
      }
      if (lower.includes(article.sourceId.toLowerCase())) raw += 12;

      const score = Math.min(raw / Math.max(qSet.size + 4, 6), 1);
      return { article, score };
    })
    .filter((r) => r.score > 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
