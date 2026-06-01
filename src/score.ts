/** Deterministic scoring & grading. */

import type { Issue, Severity } from "./types.js";

export function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

const WEIGHT: Record<Severity, number> = { error: 10, warning: 3, info: 1 };

/**
 * Score a document from its issues, scaled by link count so a doc with many
 * links isn't unfairly punished for one bad link. Clamped 0–100.
 */
export function scoreDoc(linkCount: number, issues: Issue[]): number {
  const denom = Math.max(linkCount, 5);
  let penalty = 0;
  for (const issue of issues) {
    penalty += WEIGHT[issue.severity] * (1 + 5 / denom);
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
