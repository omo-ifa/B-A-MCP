import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBloat } from "../../src/tools/context-audit/bloat.js";
import type { WalkResult } from "../../src/tools/context-audit/walk.js";

function wr(docs: { relPath: string; content: string; isRoot: boolean }[]): WalkResult {
  return { docs: docs.map((d) => ({ ...d, absPath: "/x/" + d.relPath })), findings: [], filesSkipped: 0 };
}

test("routing token weight sums only routing docs; subscore in [0,100]; n counts routing docs measured", () => {
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: "a".repeat(400), isRoot: true },   // 100 tokens
    { relPath: "src/notes.md", content: "b".repeat(4000), isRoot: false }, // not routing
  ]));
  assert.equal(res.routingTokens, 100);
  assert.equal(res.n, 1);
  assert.ok(res.subscore !== null && res.subscore >= 0 && res.subscore <= 100);
});

test("a tiny healthy router scores near 100 and emits no low finding", () => {
  const res = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "[a](a.md) [b](b.md)", isRoot: true }]));
  assert.equal(res.n, 1);
  assert.ok(res.subscore !== null && res.subscore >= 90);
  assert.equal(res.findings.length, 0);
});

test("zero routing docs measured -> subscore is null (not assessed), n is 0", () => {
  const res = scoreBloat(wr([{ relPath: "src/notes.md", content: "just prose, no routing doc here", isRoot: false }]));
  assert.equal(res.n, 0);
  assert.equal(res.subscore, null);
});

test("routing_token_weight finding attributes to the top router (not hardcoded CLAUDE.md)", () => {
  // Create a router with > 4000 tokens (16000+ chars at 4 chars/token)
  const content = "x".repeat(16500);
  const res = scoreBloat(wr([
    { relPath: "planning/CONTEXT.md", content, isRoot: true },
  ]));
  assert.ok(res.routingTokens > 4000);
  const finding = res.findings.find((f) => f.discriminator === "routing_token_weight");
  assert.ok(finding, "routing_token_weight finding should exist");
  assert.equal(finding.file, "planning/CONTEXT.md", "finding should attribute to the top router, not CLAUDE.md");
  assert.ok(finding.evidence.includes(String(res.routingTokens)), "evidence should contain the token count");
});
