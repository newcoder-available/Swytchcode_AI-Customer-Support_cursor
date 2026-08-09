import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { KnowledgeArticle } from "@/lib/types";

const SECTION_KEYS = [
  "problem",
  "symptoms",
  "cause",
  "resolution",
  "when to escalate",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

function knowledgeDir(): string {
  return join(process.cwd(), "knowledge");
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith("---")) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s+/, "");
  const meta: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((t) => t.trim().replace(/^\[|\]$/g, ""))
        .join(",");
    }
    meta[key] = value;
  }
  return { meta, body };
}

function parseSections(body: string): Partial<Record<SectionKey, string>> {
  const sections: Partial<Record<SectionKey, string>> = {};
  const parts = body.split(/^##\s+/m).filter(Boolean);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim().toLowerCase();
    const content = (nl === -1 ? "" : part.slice(nl + 1)).trim();
    if ((SECTION_KEYS as readonly string[]).includes(heading)) {
      sections[heading as SectionKey] = content;
    }
  }
  return sections;
}

function resolutionToSteps(resolution?: string): string[] | undefined {
  if (!resolution) return undefined;
  const steps = resolution
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, ""));
  return steps.length ? steps : undefined;
}

function docToArticle(filename: string, raw: string): KnowledgeArticle | null {
  const { meta, body } = parseFrontmatter(raw);
  const sections = parseSections(body);
  const sourceId = meta.source_id?.trim();
  const title = meta.title?.trim();
  if (!sourceId || !title) return null;

  const tags = (meta.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const category = (meta.category?.trim() || "faq") as KnowledgeArticle["category"];
  // Normalize curly quotes / em-dashes so answers render cleanly across terminals.
  const normalize = (s: string) =>
    s
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u2212/g, "-");

  const problem = normalize(sections.problem || "");
  const symptoms = normalize(sections.symptoms || "");
  const cause = normalize(sections.cause || "");
  const resolution = normalize(sections.resolution || "");
  const whenToEscalate = normalize(sections["when to escalate"] || "");

  const summary = problem.slice(0, 180) || title;
  const composedBody = [
    problem && `Problem: ${problem}`,
    symptoms && `Symptoms: ${symptoms}`,
    cause && `Cause: ${cause}`,
    resolution && `Resolution:\n${resolution}`,
    whenToEscalate && `When to escalate: ${whenToEscalate}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: sourceId,
    sourceId,
    title,
    category,
    tags,
    summary,
    body: composedBody,
    problem,
    symptoms,
    cause,
    resolution,
    whenToEscalate,
    steps: resolutionToSteps(resolution),
    lastUpdated: meta.last_updated?.trim(),
    filename,
  };
}

let cache: KnowledgeArticle[] | null = null;

/** Load all markdown KB docs from /knowledge (server-side). */
export function loadKnowledgeArticles(force = false): KnowledgeArticle[] {
  if (cache && !force) return cache;

  const dir = knowledgeDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const articles: KnowledgeArticle[] = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    const article = docToArticle(file, raw);
    if (article) articles.push(article);
  }

  cache = articles;
  return articles;
}

export function getKnowledgeArticles() {
  return loadKnowledgeArticles();
}
