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

// ---- TBD-11 worst-case-chain aggregation (2026-08-26 ruling) ----

test("count-invariance: many small healthy routers do NOT drive the score down (the caveman defect)", () => {
  // 20 disconnected routers, each 300 tokens of prose, none over any cutoff.
  // Old flat-sum + inline_ratio penalized each (+10) → floor 0. Worst-case aggregation
  // scores the worst ONE path, which here is a single 300-token router → near 100.
  const docs = Array.from({ length: 20 }, (_, i) => ({
    relPath: `pkg${i}/CONTEXT.md`,
    content: "p".repeat(1200),   // 300 tokens, no links
    isRoot: true,
  }));
  const res = scoreBloat(wr(docs));
  assert.equal(res.n, 20);
  assert.ok(res.subscore !== null && res.subscore >= 90, `count must not drive the score; got ${res.subscore}`);
});

test("count-invariance: adding extra small routers leaves the subscore unchanged", () => {
  const one = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "q".repeat(1200), isRoot: true }]));
  const many = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: "q".repeat(1200), isRoot: true },
    { relPath: "a/CONTEXT.md", content: "q".repeat(1200), isRoot: true },
    { relPath: "b/CONTEXT.md", content: "q".repeat(1200), isRoot: true },
    { relPath: "c/CONTEXT.md", content: "q".repeat(1200), isRoot: true },
  ]));
  assert.equal(many.subscore, one.subscore);
});

test("inline_ratio is removed: a large mostly-prose router emits NO inline_ratio finding", () => {
  // 5000-token prose router: old code emitted an inline_ratio finding (ratio 1.0, > min tokens).
  // The metric is dropped entirely; only the size term (router_token_weight) survives.
  const res = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "z".repeat(20000), isRoot: true }]));
  assert.ok(res.findings.every((f) => f.discriminator !== "inline_ratio"), "inline_ratio finding must not be emitted");
  assert.ok(res.findings.some((f) => f.discriminator === "router_token_weight"), "the size term still fires");
});

test("token terms MAX-combine, not SUM: a lone router that IS its own heavy chain is not double-counted", () => {
  // One 9000-token router. It is over the per-router cutoff AND its 1-hop chain is over the
  // chain cutoff — the SAME tokens. Old code summed router_term(30)+chain_term(15)=45 → 55.
  // Worst-case takes max(30,15)=30 → 70. (Depends on current stub cutoffs, like the tests above.)
  const res = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "w".repeat(36000), isRoot: true }]));
  assert.equal(res.subscore, 70);
});

test("mid-chain giant still penalized (why worst-case keeps the per-router term, not per-chain-only)", () => {
  // Chain total (4600) stays under the chain cutoff, but one router (4500) is over the per-router
  // cutoff. Per-chain-only would go silent here; worst-case's single-router term catches it.
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: "a".repeat(18000), isRoot: true },   // 4500 tokens (meaningfully over the 3000 cutoff)
    { relPath: "a/CONTEXT.md", content: "b".repeat(400), isRoot: true },  // 100 tokens
  ]), new Map([["CLAUDE.md", new Set(["a/CONTEXT.md"])]]));
  assert.equal(res.findings.filter((f) => f.discriminator === "routing_chain_weight").length, 0, "chain total is under cutoff");
  assert.ok(res.findings.some((f) => f.discriminator === "router_token_weight"), "the oversized mid-chain router is still flagged");
  // penalty = max(chainTokenTerm=0, maxRouterTerm=min(30, floor(1500/1000)*5)=5) + depth(0) = 5.
  // Exact value pins the single-router term's contribution — a regression to per-chain-only would score 100.
  assert.equal(res.subscore, 95);
});
