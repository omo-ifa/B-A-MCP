import { test } from "node:test";
import assert from "node:assert/strict";
import { diffPair, isOpaque } from "../../src/tools/doc-drift/diff.js";
import type { SchemaNode } from "../../src/tools/doc-drift/types.js";

const leaf = (t: string): SchemaNode => ({ type: t });
const obj = (properties: Record<string, SchemaNode>, required?: string[]): SchemaNode => ({
  type: "object",
  properties,
  ...(required ? { required } : {}),
});

test("identical schemas produce no findings; every field is in sync", () => {
  const s = obj({ a: leaf("string"), b: leaf("number") });
  const r = diffPair(s, s, "p");
  assert.equal(r.findings.length, 0);
  assert.equal(r.fields_compared, 2);
  assert.equal(r.in_sync, 2);
  assert.equal(r.drifted, 0);
});

test("a field only in the doc is field_only_in_doc (high) and counts as drift", () => {
  const r = diffPair(obj({ a: leaf("string"), gone: leaf("string") }), obj({ a: leaf("string") }), "p");
  const f = r.findings.find((x) => x.path === "gone")!;
  assert.equal(f.category, "field_only_in_doc");
  assert.equal(f.severity, "high");
  assert.equal(r.drifted, 1);
});

test("a field only in the canonical is field_only_in_canonical (medium)", () => {
  const r = diffPair(obj({ a: leaf("string") }), obj({ a: leaf("string"), extra: leaf("string") }), "p");
  const f = r.findings.find((x) => x.path === "extra")!;
  assert.equal(f.category, "field_only_in_canonical");
  assert.equal(f.severity, "medium");
});

test("a leaf type disagreement is type_mismatch (high)", () => {
  const r = diffPair(obj({ a: leaf("string") }), obj({ a: leaf("number") }), "p");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].category, "type_mismatch");
  assert.equal(r.findings[0].severity, "high");
  assert.equal(r.drifted, 1);
});

test("required-membership disagreement is required_drift (high) in both directions", () => {
  const a = diffPair(obj({ x: leaf("string") }, ["x"]), obj({ x: leaf("string") }), "p"); // doc required, canon optional
  assert.equal(a.findings[0].category, "required_drift");
  assert.equal(a.findings[0].severity, "high");
  const b = diffPair(obj({ x: leaf("string") }), obj({ x: leaf("string") }, ["x"]), "p"); // reverse
  assert.equal(b.findings[0].category, "required_drift");
});

test("type is compared as a set: ['number','null'] equals ['null','number']", () => {
  const r = diffPair(obj({ a: { type: ["number", "null"] } }), obj({ a: { type: ["null", "number"] } }), "p");
  assert.equal(r.findings.length, 0);
  assert.equal(r.in_sync, 1);
});

test("nested properties recurse: a deep drift is found and counted", () => {
  const d = obj({ stats: obj({ total: leaf("number"), extra: leaf("string") }) });
  const c = obj({ stats: obj({ total: leaf("number") }) });
  const r = diffPair(d, c, "p");
  const f = r.findings.find((x) => x.path === "stats.extra")!;
  assert.equal(f.category, "field_only_in_doc");
  // fields compared: stats (container, in sync) + stats.total (in sync) + stats.extra (drifted) = 3
  assert.equal(r.fields_compared, 3);
  assert.equal(r.drifted, 1);
});

// DISCRIMINATING (Obs 15): the opaque-wildcard rule must be PRESENT, not just
// green-by-accident. An opaque node on either side excludes that field-path
// ENTIRELY — no finding, and it never counts toward the denominator.
test("an opaque canonical node wildcards the field-path: no finding, not counted", () => {
  const d = obj({ findings: obj({ id: leaf("string"), category: leaf("string") }) });
  const c = obj({ findings: { type: "object" } }); // opaque: no properties
  const r = diffPair(d, c, "p");
  assert.equal(r.findings.length, 0, "no drift emitted at/under an opaque node");
  assert.equal(r.fields_compared, 0, "opaque field-path is excluded from the denominator entirely");
});

test("an opaque ROOT wildcards the whole pair (the Finding-2 gaming case)", () => {
  const d = obj({ a: leaf("string"), b: leaf("string"), c: leaf("string") });
  const c: SchemaNode = { type: "object" }; // opaque root — the deliberately-minimized form
  const r = diffPair(d, c, "p");
  assert.equal(r.findings.length, 0);
  assert.equal(r.fields_compared, 0); // NOT 3 field_only_in_doc, NOT scored 100
});

// B (object-vs-leaf shape drift): a doc node with properties but no explicit type,
// facing a typed leaf on the canonical side, must NOT count silently in sync.
test("an object node facing a typed leaf is a shape mismatch (object-vs-leaf)", () => {
  const d = obj({ meta: { properties: { a: leaf("string") } } });
  const c = obj({ meta: leaf("string") });
  const r = diffPair(d, c, "p");
  const f = r.findings.find((x) => x.path === "meta")!;
  assert.equal(f.category, "type_mismatch");
  assert.equal(r.drifted, 1);
});

test("isOpaque: {type:object} no props is opaque; a typed leaf is not", () => {
  assert.equal(isOpaque({ type: "object" }), true);
  assert.equal(isOpaque({}), true); // untyped, no props -> wildcard
  assert.equal(isOpaque({ type: "string" }), false);
  assert.equal(isOpaque({ type: "object", properties: { a: { type: "string" } } }), false);
});

test("findings carry the pair label and a stable id", () => {
  const r = diffPair(obj({ a: leaf("string") }), obj({ a: leaf("number") }), "context_audit.output");
  assert.equal(r.findings[0].label, "context_audit.output");
  assert.match(r.findings[0].id, /^[0-9a-f]{12}$/);
});
