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

test("severity mapping covers every FindingCategory (all 13, including coverage_test=medium, coverage=high)", () => {
  const expected: Record<string, string> = {
    root_absent: "critical",
    root_empty: "critical",
    broken_ref: "high",
    routing_drift: "high",
    coverage: "high",
    orphan: "medium",
    escapes_root: "medium",
    coverage_test: "medium",
    malformed_link: "low",
    bloat: "low",
    name_collision: "info",
    symlink: "info",
    skipped: "info",
  };
  assert.deepEqual(SEVERITY_BY_CATEGORY, expected);
  assert.equal(Object.keys(SEVERITY_BY_CATEGORY).length, 13);
});

test("subscoreFromCount reports n and returns null (not 100) for an empty denominator", () => {
  assert.deepEqual(subscoreFromCount(0, 0), { score: null, n: 0 });
  assert.deepEqual(subscoreFromCount(1, 4), { score: 75, n: 4 });
});

test("headlineScore drops a null sub-score and renormalizes over the rest", () => {
  const s = headlineScore({
    bloat: { score: 80, n: 1 },
    orphans: { score: 100, n: 5 },
    broken_refs: { score: 100, n: 5 },
    routing_drift: { score: 100, n: 5 },
    coverage: { score: null, n: 0 },
  });
  assert.ok(s !== null && s > 80 && s <= 100);   // coverage null dropped; accuracy cluster near-perfect
});

test("headlineScore returns null (not 0) when every sub-score is null — no fabricated composite", () => {
  const s = headlineScore({
    bloat: { score: null, n: 0 },
    orphans: { score: null, n: 0 },
    broken_refs: { score: null, n: 0 },
    routing_drift: { score: null, n: 0 },
    coverage: { score: null, n: 0 },
  });
  assert.equal(s, null);
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

test("normalizeFindings output never carries `discriminator` — the public Finding is exactly 7 fields", () => {
  const raw: RawFinding[] = [
    { category: "orphan", file: "b.md", line: null, message: "", evidence: "b.md", discriminator: "b.md" },
  ];
  const out = normalizeFindings(raw);
  assert.equal((out[0] as unknown as Record<string, unknown>).discriminator, undefined);
  assert.deepEqual(Object.keys(out[0]).sort(), ["category", "evidence", "file", "id", "line", "message", "severity"]);
});
