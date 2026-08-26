import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAudit } from "../../src/tools/context-audit/render.js";
import type { AuditResult } from "../../src/tools/context-audit/types.js";

const base: Omit<AuditResult, "rendered"> = {
  root: { path: "/repo", method: "given_path" },
  score: 72,
  subscores: {
    bloat: { score: 80, n: 1 },
    orphans: { score: 100, n: 5 },
    routing_drift: { score: 100, n: 3 },
    coverage: { score: null, n: 0 },
  },
  findings: [{ id: "abc123abc123", category: "broken_ref", severity: "info", file: "docs/guide.md", line: 4, message: "link points at a path that does not exist", evidence: "missing.md" }],
  stats: { docs_in_scope: 3, routing_files: 2, routing_tokens: 120, orphan_count: 0, genuine_abandoned_count: 0, files_skipped: 0, token_count_method: "char-approx-v1", calibrated: false },
};

test("renderer emits score, weaker-claim note, coverage disclaimer, and uncalibrated note", () => {
  const md = renderAudit(base);
  assert.match(md, /72/);
  assert.match(md, /given_path/);
  assert.match(md, /accuracy|claims the code|doc_drift/i);   // coverage disclaimer present
  assert.match(md, /uncalibrated|TBD-1[012]/i);
  assert.match(md, /broken_ref/);
  assert.match(md, /\| coverage \| not assessed \(n=0\) \|/);   // null sub-score shown as "not assessed", never N/A or a bare number
  assert.match(md, /\| routing_drift \| 100 \(n=3\) \|/);        // assessed sub-score shows value AND n
  assert.doesNotMatch(md, /\| broken_refs \|/);                  // broken_refs is no longer a sub-score
  assert.doesNotMatch(md, /N\/A/);
});

test("renderer shows 'not assessed' for a null headline score, never a bare number or N/A", () => {
  const allNull: Omit<AuditResult, "rendered"> = {
    ...base,
    score: null,
    subscores: {
      bloat: { score: null, n: 0 },
      orphans: { score: null, n: 0 },
      routing_drift: { score: null, n: 0 },
      coverage: { score: null, n: 0 },
    },
  };
  const md = renderAudit(allNull);
  assert.match(md, /\*\*Score:\*\* not assessed/);
  assert.doesNotMatch(md, /N\/A/);
});
