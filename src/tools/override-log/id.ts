import { createHash } from "node:crypto";

// Stable 12-hex id over a NUL-joined discriminator. FORMULA-IDENTICAL to
// context_audit's findingId (src/tools/context-audit/score.ts). Deliberately
// duplicated — not imported — so override_log stays decoupled from
// context_audit's FindingCategory type; a boundary test in id.test.ts locks the
// two formulas together. Hashes a STABLE discriminator, never moving evidence.
export function stableId(a: string, b: string, c: string): string {
  return createHash("sha256").update(`${a}\0${b}\0${c}`).digest("hex").slice(0, 12);
}
