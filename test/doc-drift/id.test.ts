import { test } from "node:test";
import assert from "node:assert/strict";
import { stableId } from "../../src/tools/doc-drift/id.js";
import { findingId } from "../../src/tools/context-audit/score.js";

test("stableId returns 12 lowercase hex chars", () => {
  assert.match(stableId("type_mismatch", "pair 1", "findings.score"), /^[0-9a-f]{12}$/);
});

test("stableId is deterministic for the same inputs", () => {
  assert.equal(stableId("a", "b", "c"), stableId("a", "b", "c"));
});

test("stableId changes when any input changes", () => {
  const base = stableId("a", "b", "c");
  assert.notEqual(base, stableId("a", "b", "d"));
  assert.notEqual(base, stableId("a", "x", "c"));
});

// Boundary test (deliberate-duplication cross-reference, Obs 5 + Obs 27):
// doc_drift's stableId MUST stay formula-identical to context_audit's findingId.
test("stableId equals context_audit findingId for identical inputs", () => {
  assert.equal(
    stableId("routing_drift", "docs/x.md", "y"),
    findingId("routing_drift", "docs/x.md", "y"),
  );
});
