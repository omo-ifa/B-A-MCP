import { createHash } from "node:crypto";
import type { Finding, RawFinding, FindingCategory, Severity, Subscore, Subscores } from "./types.js";

export function findingId(category: FindingCategory, normalizedPath: string, discriminator: string): string {
  return createHash("sha256").update(`${category}\0${normalizedPath}\0${discriminator}`).digest("hex").slice(0, 12);
}

export const SEVERITY_BY_CATEGORY: Record<FindingCategory, Severity> = {
  root_absent: "critical", root_empty: "critical",   // design §4 (flagged: §3 says empty=high)
  broken_ref: "high", routing_drift: "high", coverage: "high",
  orphan: "medium", escapes_root: "medium", coverage_test: "medium",   // decision: 2026-08-20_test-dir-coverage-severity.md
  malformed_link: "low", bloat: "low",
  routing_unresolved: "info", name_collision: "info", symlink: "info", skipped: "info",
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

export function subscoreFromCount(bad: number, total: number): Subscore {
  // total === 0: nothing was assessed — n=0, score=null, never a fabricated 100.
  // (exact-fidelity check: counts are asserted non-negative upstream, so total < 0 cannot occur.)
  return { score: total === 0 ? null : Math.round(100 * (1 - bad / total)), n: total };
}

// TODO: TBD-10 — placeholder weights; calibrate from the first dogfood run.
// Principle (resolved): accuracy cluster weighted above bloat; N/A sub-score drops and reweights.
const TBD_10_WEIGHTS: Record<keyof Subscores, number> = {
  broken_refs: 3, routing_drift: 3, orphans: 2, coverage: 2, bloat: 1,
};

// The routing-layer sub-scores: the ones that actually measure routing health
// (drift = router links resolve; coverage = routing claims the code; orphans =
// docs reachable from routing). broken_refs and bloat are file/doc hygiene, not
// routing health.
const ROUTING_LAYER_KEYS: (keyof Subscores)[] = ["routing_drift", "coverage", "orphans"];

export function headlineScore(subscores: Subscores): number | null {
  // A routing-HEALTH composite must rest on at least one real routing-layer
  // measurement. If none of routing_drift/coverage/orphans was assessed (e.g. a
  // repo with no routing root, or routers that resolve nothing), the only
  // survivors are hygiene sub-scores (broken_refs/bloat) — reporting a confident
  // "health" number off those alone is exactly the fabricated-100 failure this
  // guards. Return null; the root_absent / routing_unresolved findings carry the
  // brokenness. A coverage floor of 0 (a routing measurement) keeps the headline.
  if (ROUTING_LAYER_KEYS.every((k) => subscores[k].score === null)) return null;
  let weighted = 0, weightSum = 0;
  for (const key of Object.keys(TBD_10_WEIGHTS) as (keyof Subscores)[]) {
    const v = subscores[key].score;
    if (v === null || v === undefined) continue;   // not assessed: dropped, weights renormalize
    weighted += v * TBD_10_WEIGHTS[key];
    weightSum += TBD_10_WEIGHTS[key];
  }
  // every sub-score null -> nothing to assess -> no fabricated composite.
  return weightSum === 0 ? null : Math.round(weighted / weightSum);
}
