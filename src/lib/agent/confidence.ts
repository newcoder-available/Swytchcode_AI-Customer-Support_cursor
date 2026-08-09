import type { ConfidenceLevel, RetrievedArticle } from "@/lib/types";

export function escalateThreshold(): number {
  return Number(process.env.CONFIDENCE_ESCALATE_THRESHOLD ?? "0.55");
}

export function scoreConfidence(retrieved: RetrievedArticle[]): {
  confidence: number;
  level: ConfidenceLevel;
  shouldEscalate: boolean;
} {
  const threshold = escalateThreshold();

  if (retrieved.length === 0) {
    return { confidence: 0.12, level: "low", shouldEscalate: true };
  }

  const top = retrieved[0].score;
  const second = retrieved[1]?.score ?? 0;
  const spread = Math.max(top - second, 0);
  // Prefer decisive top hits; weak/ambiguous retrieval → lower confidence.
  const confidence = Number(
    Math.min(0.97, top * 0.72 + spread * 0.28 + (top > 0.35 ? 0.1 : 0)).toFixed(2),
  );

  const level: ConfidenceLevel =
    confidence >= 0.75 ? "high" : confidence >= threshold ? "medium" : "low";

  return {
    confidence,
    level,
    shouldEscalate: confidence < threshold,
  };
}

export function confidenceLevel(confidence: number): ConfidenceLevel {
  const threshold = escalateThreshold();
  if (confidence >= 0.75) return "high";
  if (confidence >= threshold) return "medium";
  return "low";
}
