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

test("a large SINGLE router (> per-router cutoff) emits router_token_weight attributed to that router", () => {
  const content = "x".repeat(16500);   // 4125 tokens > 3000 per-router cutoff
  const res = scoreBloat(wr([
    { relPath: "planning/CONTEXT.md", content, isRoot: true },
  ]));
  const finding = res.findings.find((f) => f.discriminator === "router_token_weight");
  assert.ok(finding, "router_token_weight finding should exist");
  assert.equal(finding.file, "planning/CONTEXT.md");
  assert.ok(finding.evidence.includes("4125"), "evidence should carry the per-router token count");
});

test("bloat is per root->leaf CHAIN, not a flat total: small routers, heavy chain -> routing_chain_weight", () => {
  // Three routers each UNDER the per-router cutoff, but a chain that sums over the
  // chain cutoff. A flat total would have penalized 'many routers'; the chain metric
  // penalizes the cost of following one path. routerEdges wires the DAG.
  const each = "y".repeat(2800 * 4);   // 2800 tokens each (< 3000 per-router cutoff)
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: each, isRoot: true },
    { relPath: "a/CONTEXT.md", content: each, isRoot: true },
    { relPath: "a/b/CONTEXT.md", content: each, isRoot: true },
  ]), new Map([
    ["CLAUDE.md", new Set(["a/CONTEXT.md"])],
    ["a/CONTEXT.md", new Set(["a/b/CONTEXT.md"])],
  ]));
  assert.equal(res.findings.filter((f) => f.discriminator === "router_token_weight").length, 0, "no single router is over the per-router cutoff");
  const chain = res.findings.find((f) => f.discriminator === "routing_chain_weight");
  assert.ok(chain, "the heavy root->leaf chain must emit routing_chain_weight");
  assert.ok(chain.evidence.includes("8400"), "chain sum = 2800 * 3");
});

test("chain metric is cycle-safe: two routers referencing each other do not loop", () => {
  const each = "z".repeat(400);   // 100 tokens each
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: each, isRoot: true },
    { relPath: "a/CONTEXT.md", content: each, isRoot: true },
  ]), new Map([
    ["CLAUDE.md", new Set(["a/CONTEXT.md"])],
    ["a/CONTEXT.md", new Set(["CLAUDE.md"])],   // cycle
  ]));
  assert.ok(res.subscore !== null && res.subscore >= 0 && res.subscore <= 100);   // terminates, valid score
});
