import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAudit } from "../../src/tools/context-audit/render.js";
import type { AuditResult } from "../../src/tools/context-audit/types.js";

const base: Omit<AuditResult, "rendered"> = {
  root: { path: "/repo", method: "given_path" },
  score: 72,
  subscores: { bloat: 80, orphans: 100, broken_refs: 50, routing_drift: 100, coverage: null },
  findings: [{ id: "abc123abc123", category: "broken_ref", severity: "high", file: "src/CONTEXT.md", line: 4, message: "link points at a path that does not exist", evidence: "missing.md" }],
  stats: { docs_in_scope: 3, routing_files: 2, routing_tokens: 120, orphan_count: 0, files_skipped: 0, token_count_method: "char-approx-v1", calibrated: false },
};

test("renderer emits score, weaker-claim note, coverage disclaimer, and uncalibrated note", () => {
  const md = renderAudit(base);
  assert.match(md, /72/);
  assert.match(md, /given_path/);
  assert.match(md, /accuracy|claims the code|doc_drift/i);   // coverage disclaimer present
  assert.match(md, /uncalibrated|TBD-1[012]/i);
  assert.match(md, /broken_ref/);
  assert.match(md, /N\/A/);                                   // coverage null shown as N/A
});
