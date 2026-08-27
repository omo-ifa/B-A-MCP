import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../../src/tools/doc-drift/analyze.js";
import type { SchemaNode } from "../../src/tools/doc-drift/types.js";

const obj = (properties: Record<string, SchemaNode>): SchemaNode => ({ type: "object", properties });
const leaf = (t: string): SchemaNode => ({ type: t });

test("empty pairs array scores null (never 100 over an empty denominator)", () => {
  const r = analyze([]);
  assert.equal(r.score, null);
  assert.equal(r.stats.pairs_total, 0);
  assert.equal(r.stats.fields_compared, 0);
  assert.equal(r.findings.length, 0);
});

test("score is the rounded share of in-sync field-paths across all pairs", () => {
  // pair A: a in sync, b drifted (2 compared, 1 in sync). pair B: c in sync (1/1).
  const r = analyze([
    { label: "A", declared: obj({ a: leaf("string"), b: leaf("string") }), canonical: obj({ a: leaf("string"), b: leaf("number") }) },
    { label: "B", declared: obj({ c: leaf("string") }), canonical: obj({ c: leaf("string") }) },
  ]);
  assert.equal(r.stats.fields_compared, 3);
  assert.equal(r.stats.in_sync, 2);
  assert.equal(r.score, 67); // round(100 * 2/3)
});

// DISCRIMINATING (Obs 15 + the D9/score MUST-FIX): a fully-minimized canonical
// must NOT read 100 — its field-paths are opaque-excluded, so the denominator is
// empty and the score is null, not a fabricated 100.
test("an all-opaque pair contributes nothing: score null, not 100", () => {
  const r = analyze([{ label: "min", declared: obj({ a: leaf("string"), b: leaf("string") }), canonical: { type: "object" } }]);
  assert.equal(r.stats.fields_compared, 0);
  assert.equal(r.score, null);
  assert.equal(r.findings.length, 0);
});

test("by_kind tallies findings per kind", () => {
  const r = analyze([{ declared: obj({ a: leaf("string"), gone: leaf("string") }), canonical: obj({ a: leaf("number"), extra: leaf("string") }) }]);
  assert.equal(r.stats.by_kind.type_mismatch, 1); // a
  assert.equal(r.stats.by_kind.field_only_in_doc, 1); // gone
  assert.equal(r.stats.by_kind.field_only_in_canonical, 1); // extra
});

test("findings carry the pair label; pair 0's findings precede pair 1's", () => {
  const r = analyze([
    { label: "first", declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("number") }) },
    { label: "second", declared: obj({ b: leaf("string") }), canonical: obj({ b: leaf("number") }) },
  ]);
  assert.equal(r.findings[0].label, "first");
  assert.equal(r.findings[1].label, "second");
});

test("an unlabeled pair gets a synthetic label so unlabeled pairs do not collide", () => {
  const r = analyze([
    { declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("number") }) },
    { declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("number") }) },
  ]);
  assert.notEqual(r.findings[0].id, r.findings[1].id); // distinct synthetic labels -> distinct ids
});

// analyze() is DEFENSIVELY lenient (never throws); the TOOL boundary
// (runDocDrift) is what rejects a non-object member with INVALID_PAIRS (D5),
// tested in index.test.ts. This tests only analyze's internal robustness.
test("a non-object pair item is coerced to an empty pair, never throws", () => {
  const r = analyze([null as any, "x" as any]);
  assert.equal(r.stats.pairs_total, 2);
  assert.equal(r.stats.fields_compared, 0);
  assert.equal(r.findings.length, 0);
});
