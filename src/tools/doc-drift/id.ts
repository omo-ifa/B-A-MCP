import { createHash } from "node:crypto";

// Stable 12-hex id over a NUL-joined discriminator. FORMULA-IDENTICAL to
// context_audit's findingId (src/tools/context-audit/score.ts) and override_log's
// stableId. Deliberately duplicated — not imported — so doc_drift stays decoupled
// from context_audit's FindingCategory type; the boundary test in id.test.ts locks
// the formulas together. Hashes a STABLE discriminator, never moving evidence.
export function stableId(a: string, b: string, c: string): string {
  return createHash("sha256").update(`${a}\0${b}\0${c}`).digest("hex").slice(0, 12);
}
