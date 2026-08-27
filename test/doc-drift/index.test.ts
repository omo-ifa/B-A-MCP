import { test } from "node:test";
import assert from "node:assert/strict";
import { docDriftTool, runDocDrift, toCallToolResult } from "../../src/tools/doc-drift/index.js";
import type { SchemaNode } from "../../src/tools/doc-drift/types.js";

const obj = (properties: Record<string, SchemaNode>): SchemaNode => ({ type: "object", properties });
const leaf = (t: string): SchemaNode => ({ type: t });

test("tool name and required input key", () => {
  assert.equal(docDriftTool.name, "doc_drift");
  assert.deepEqual(docDriftTool.inputSchema.required, ["pairs"]);
});

test("a valid call returns rendered + structuredContent, mirrored", () => {
  const out = runDocDrift({ pairs: [{ label: "t", declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("string") }) }] });
  assert.equal(out.ok, true);
  const res = toCallToolResult(out);
  assert.ok(res.structuredContent);
  assert.equal((res.structuredContent as any).score, 100);
  assert.equal(res.content[0].text, (res.structuredContent as any).rendered);
});

test("non-array pairs is a structured INVALID_PAIRS error, not a throw", () => {
  const out = runDocDrift({} as any);
  assert.equal(out.ok, false);
  const res = toCallToolResult(out);
  assert.equal(res.isError, true);
  assert.equal(res.structuredContent, undefined);
  assert.equal(JSON.parse(res.content[0].text).error.code, "INVALID_PAIRS");
});

test("an empty pairs array is valid (score null), not an error", () => {
  const out = runDocDrift({ pairs: [] });
  assert.equal(out.ok, true);
  assert.equal((out as any).result.score, null);
});

test("a non-object pair member is a structured INVALID_PAIRS error (D5)", () => {
  const out = runDocDrift({ pairs: [{ declared: obj({ a: leaf("string") }), canonical: obj({ a: leaf("string") }) }, "nope" as any] });
  assert.equal(out.ok, false);
  const res = toCallToolResult(out);
  assert.equal(res.isError, true);
  assert.equal(JSON.parse(res.content[0].text).error.code, "INVALID_PAIRS");
});

test("a present-but-non-object declared/canonical is INVALID_PAIRS (A)", () => {
  // a string-encoded schema must be rejected, not coerced to {} and misreported.
  const strDecl = runDocDrift({ pairs: [{ declared: "{\"type\":\"object\"}" as any, canonical: obj({ a: leaf("string") }) }] });
  assert.equal(strDecl.ok, false);
  assert.equal(JSON.parse(toCallToolResult(strDecl).content[0].text).error.code, "INVALID_PAIRS");
  const arrCanon = runDocDrift({ pairs: [{ declared: obj({ a: leaf("string") }), canonical: [] as any }] });
  assert.equal(arrCanon.ok, false);
});

test("an absent declared/canonical stays valid (coerced to {}, not rejected)", () => {
  const out = runDocDrift({ pairs: [{ declared: obj({ a: leaf("string") }) }] }); // canonical absent
  assert.equal(out.ok, true);
});
