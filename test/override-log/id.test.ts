import { test } from "node:test";
import assert from "node:assert/strict";
import { stableId } from "../../src/tools/override-log/id.js";
import { findingId } from "../../src/tools/context-audit/score.js";

test("stableId returns 12 lowercase hex chars", () => {
  const id = stableId("gate", "2026-08-27", "proceed");
  assert.match(id, /^[0-9a-f]{12}$/);
});

test("stableId is deterministic for the same inputs", () => {
  assert.equal(stableId("a", "b", "c"), stableId("a", "b", "c"));
});

test("stableId changes when any input changes", () => {
  const base = stableId("a", "b", "c");
  assert.notEqual(base, stableId("a", "b", "d"));
  assert.notEqual(base, stableId("a", "x", "c"));
});

// Boundary test (deliberate-duplication cross-reference, WORKFLOW Obs 5):
// override_log's stableId MUST stay formula-identical to context_audit's
// findingId so export_record ids are comparable across tools.
test("stableId equals context_audit findingId for identical inputs", () => {
  assert.equal(
    stableId("routing_drift", "docs/x.md", "y"),
    findingId("routing_drift", "docs/x.md", "y"),
  );
});
