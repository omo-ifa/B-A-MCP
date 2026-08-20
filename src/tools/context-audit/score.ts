import { createHash } from "node:crypto";
import type { Finding, RawFinding, FindingCategory, Severity, Subscores } from "./types.js";

export function findingId(category: FindingCategory, normalizedPath: string, discriminator: string): string {
  return createHash("sha256").update(`${category}\0${normalizedPath}\0${discriminator}`).digest("hex").slice(0, 12);
}

export const SEVERITY_BY_CATEGORY: Record<FindingCategory, Severity> = {
  root_absent: "critical", root_empty: "critical",   // design §4 (flagged: §3 says empty=high)
  broken_ref: "high", routing_drift: "high", coverage: "high",
  orphan: "medium", escapes_root: "medium",
  malformed_link: "low", bloat: "low",
  name_collision: "info", symlink: "info", skipped: "info",
};

const RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export function normalizeFindings(raw: RawFinding[]): Finding[] {
  const out: Finding[] = raw.map((x) => ({
    id: findingId(x.category, x.file, x.discriminator),   // stable key, never the measured evidence
    category: x.category,
    severity: SEVERITY_BY_CATEGORY[x.category],
    file: x.file,
    line: x.line,
    message: x.message,
    evidence: x.evidence,
  }));
  out.sort((a, b) =>
    RANK[b.severity] - RANK[a.severity] ||
    (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
    ((a.line ?? -1) - (b.line ?? -1)) ||
    (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return out;
}

export function subscoreFromCount(bad: number, total: number): number {
  return total <= 0 ? 100 : Math.round(100 * (1 - bad / total));
}

// TODO: TBD-10 — placeholder weights; calibrate from the first dogfood run.
// Principle (resolved): accuracy cluster weighted above bloat; N/A sub-score drops and reweights.
const TBD_10_WEIGHTS: Record<keyof Subscores, number> = {
  broken_refs: 3, routing_drift: 3, orphans: 2, coverage: 2, bloat: 1,
};

export function headlineScore(subscores: Subscores): number {
  let weighted = 0, weightSum = 0;
  for (const key of Object.keys(TBD_10_WEIGHTS) as (keyof Subscores)[]) {
    const v = subscores[key];
    if (v === null || v === undefined) continue;   // N/A dropped, weights renormalize
    weighted += v * TBD_10_WEIGHTS[key];
    weightSum += TBD_10_WEIGHTS[key];
  }
  return weightSum === 0 ? 0 : Math.round(weighted / weightSum);
}
