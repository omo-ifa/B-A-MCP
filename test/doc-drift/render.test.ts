import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../../src/tools/doc-drift/analyze.js";
import { renderDocDrift } from "../../src/tools/doc-drift/render.js";
import type { SchemaNode } from "../../src/tools/doc-drift/types.js";

const obj = (properties: Record<string, SchemaNode>): SchemaNode => ({ type: "object", properties });
const leaf = (t: string): SchemaNode => ({ type: t });

function render(pairs: any[]) {
  const a = analyze(pairs);
  return renderDocDrift({ score: a.score, stats: a.stats, entries: a.entries });
}

test("header, summary and drift percent appear", () => {
  const md = render([{ label: "X", declared: obj({ a: leaf("string"), b: leaf("string") }), canonical: obj({ a: leaf("string"), b: leaf("number") }) }]);
  assert.match(md, /# doc_drift/);
  assert.match(md, /1 pairs/);
  assert.match(md, /50%/); // 1 of 2 in sync
});

test("empty input renders a notice, not a fake 100%", () => {
  const md = render([]);
  assert.match(md, /Nothing to compare/i);
  assert.doesNotMatch(md, /100%/);
});

test("a drift finding is shown under its pair", () => {
  // canonical must be NON-opaque (a real, different property) or the pair is
  // wildcarded — `obj({})` is `{type:object, properties:{}}`, which isOpaque.
  const md = render([{ label: "toolX", declared: obj({ gone: leaf("string"), a: leaf("string") }), canonical: obj({ a: leaf("string") }) }]);
  assert.match(md, /toolX/);
  assert.match(md, /field_only_in_doc/);
  assert.match(md, /gone/);
});

test("a fully in-sync pair reads as no drift", () => {
  const md = render([{ label: "clean", declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("string") }) }]);
  assert.match(md, /no drift/i);
});
