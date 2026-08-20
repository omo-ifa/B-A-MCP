import { test } from "node:test";
import assert from "node:assert/strict";
import { findingId, normalizeFindings, subscoreFromCount, headlineScore, SEVERITY_BY_CATEGORY } from "../../src/tools/context-audit/score.js";
import type { RawFinding } from "../../src/tools/context-audit/types.js";

test("finding id is stable across runs and independent of measured values", () => {
  assert.equal(findingId("broken_ref", "src/CONTEXT.md", "missing.md"), findingId("broken_ref", "src/CONTEXT.md", "missing.md"));
  assert.notEqual(findingId("broken_ref", "src/CONTEXT.md", "a.md"), findingId("broken_ref", "src/CONTEXT.md", "b.md"));
});

test("severity mapping matches design §4 (root_empty critical; broken_ref high; orphan medium)", () => {
  assert.equal(SEVERITY_BY_CATEGORY.root_empty, "critical");
  assert.equal(SEVERITY_BY_CATEGORY.root_absent, "critical");
  assert.equal(SEVERITY_BY_CATEGORY.broken_ref, "high");
  assert.equal(SEVERITY_BY_CATEGORY.routing_drift, "high");
  assert.equal(SEVERITY_BY_CATEGORY.orphan, "medium");
  assert.equal(SEVERITY_BY_CATEGORY.escapes_root, "medium");
  assert.equal(SEVERITY_BY_CATEGORY.malformed_link, "low");
});

test("subscoreFromCount and headline drop N/A sub-scores", () => {
  assert.equal(subscoreFromCount(0, 0), 100);
  assert.equal(subscoreFromCount(1, 4), 75);
  const s = headlineScore({ bloat: 80, orphans: 100, broken_refs: 100, routing_drift: 100, coverage: null });
  assert.ok(s > 80 && s <= 100);   // coverage null dropped; accuracy cluster near-perfect
});

test("normalizeFindings assigns ids and sorts by severity", () => {
  const raw: RawFinding[] = [
    { category: "orphan", file: "b.md", line: null, message: "", evidence: "b.md", discriminator: "b.md" },
    { category: "broken_ref", file: "a.md", line: 3, message: "", evidence: "x.md", discriminator: "x.md" },
  ];
  const out = normalizeFindings(raw);
  assert.equal(out[0].category, "broken_ref");   // high sorts before medium
  assert.ok(out.every((f) => f.id.length === 12));
});
