import { createHash } from "node:crypto";
import type { Finding, RawFinding, FindingCategory, Severity, Subscore, Subscores } from "./types.js";

export function findingId(category: FindingCategory, normalizedPath: string, discriminator: string): string {
  return createHash("sha256").update(`${category}\0${normalizedPath}\0${discriminator}`).digest("hex").slice(0, 12);
}

export const SEVERITY_BY_CATEGORY: Record<FindingCategory, Severity> = {
  root_absent: "critical", root_empty: "critical",   // design §4 (flagged: §3 says empty=high)
  routing_drift: "high", routing_path_missing: "high", coverage: "high",   // router link/path points nowhere → routing accuracy
  orphan: "medium", escapes_root: "medium", coverage_test: "medium",   // decision: 2026-08-20_test-dir-coverage-severity.md
  malformed_link: "low", bloat: "low",
  broken_ref: "info",   // 2026-08-20: non-router broken links are reported, not scored
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

// TBD-10 — weights. coverage/bloat/routing_drift resolved from run-7
// (planning/decisions/2026-08-26_tbd-10-weights-partial-and-tbd-18-orphans-rebase.md);
// orphans resolved 2026-08-26 after TBD-18 closed
// (planning/decisions/2026-08-26_tbd-10-orphans-weight.md).
// Principle: accuracy cluster weighted above bloat; a null sub-score drops and the rest
// renormalize.
//   coverage: 3 — the cleanest routing-health discriminator across the corpus.
//   bloat:    1 — file/doc hygiene, not routing health (accuracy > bloat).
//   routing_drift: 1 — DOWN-weighted from the stub 3: post-TBD-16 it is saturated at
//                 ~100 (near-zero variance), a floor-catcher, not a headline driver.
//   orphans:  1 — owner-ratified, PROVISIONAL (gated on §4-gap detection). Post-TBD-18 the
//                 sub-score scores genuine-abandoned rot and DISCRIMINATES (corpus range
//                 31–92), so it earns weight; but the §4-gap accepted-layout classes
//                 (component-manifest, test-fixture, bare docs/**) still count as rot, a
//                 known DOWNWARD bias on §4-gap-heavy repos. 1 is the largest weight that
//                 keeps that bias's headline pull bounded (~±8); it is RAISE-eligible when
//                 the three §4-gap /decisions items (design §9) land. Ceiling is §4-gap
//                 detection, NOT signal quality.
const TBD_10_WEIGHTS: Partial<Record<keyof Subscores, number>> = {
  routing_drift: 1, coverage: 3, bloat: 1, orphans: 1,
};

// The WEIGHTED routing-layer sub-scores: the ones that measure routing health AND carry
// weight in the composite (drift = router links/paths resolve; coverage = routing claims
// the code; orphans = docs reachable from a routing root). The headline must rest on at
// least one of these — a health composite is not formed from the hygiene sub-score (bloat)
// alone. orphans joined here when it became weighted (TBD-10, 2026-08-26): a weighted
// orphans is a genuine routing-layer measurement and may satisfy the guard like the others
// (the prior "unweighted orphans must not pass the guard" exclusion no longer applies).
const ROUTING_LAYER_KEYS: (keyof Subscores)[] = ["routing_drift", "coverage", "orphans"];

export function headlineScore(subscores: Subscores): number | null {
  // A routing-HEALTH composite must rest on at least one real WEIGHTED routing-layer
  // measurement. If none of routing_drift/coverage was assessed (e.g. a
  // repo with no routing root, or routers that resolve nothing), the only
  // survivor is the hygiene sub-score (bloat) — reporting a confident
  // "health" number off those alone is exactly the fabricated-100 failure this
  // guards. Return null; the root_absent / routing_unresolved findings carry the
  // brokenness. A coverage floor of 0 (a routing measurement) keeps the headline.
  if (ROUTING_LAYER_KEYS.every((k) => subscores[k].score === null)) return null;
  let weighted = 0, weightSum = 0;
  for (const [key, weight] of Object.entries(TBD_10_WEIGHTS) as [keyof Subscores, number][]) {
    const v = subscores[key].score;
    if (v === null || v === undefined) continue;   // not assessed: dropped, weights renormalize
    weighted += v * weight;
    weightSum += weight;
  }
  // every sub-score null -> nothing to assess -> no fabricated composite.
  return weightSum === 0 ? null : Math.round(weighted / weightSum);
}
