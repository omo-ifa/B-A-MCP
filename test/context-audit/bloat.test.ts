import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBloat } from "../../src/tools/context-audit/bloat.js";
import type { WalkResult } from "../../src/tools/context-audit/walk.js";

function wr(docs: { relPath: string; content: string; isRoot: boolean }[]): WalkResult {
  return { docs: docs.map((d) => ({ ...d, absPath: "/x/" + d.relPath })), findings: [], filesSkipped: 0 };
}

test("routing token weight sums only routing docs; subscore in [0,100]", () => {
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: "a".repeat(400), isRoot: true },   // 100 tokens
    { relPath: "src/notes.md", content: "b".repeat(4000), isRoot: false }, // not routing
  ]));
  assert.equal(res.routingTokens, 100);
  assert.ok(res.subscore >= 0 && res.subscore <= 100);
});

test("a tiny healthy router scores near 100 and emits no low finding", () => {
  const res = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "[a](a.md) [b](b.md)", isRoot: true }]));
  assert.ok(res.subscore >= 90);
  assert.equal(res.findings.length, 0);
});
