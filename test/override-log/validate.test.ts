import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOverrides } from "../../src/tools/override-log/validate.js";

const full = {
  gate: "problem-fit", risk: "score 2/8", alternative: "run the Scorecard",
  decision: "proceed", acknowledged_by: "T. Alexander", date: "2026-08-27",
};

test("a fully documented entry yields no findings and score 100", () => {
  const r = validateOverrides([full]);
  assert.equal(r.findings.length, 0);
  assert.equal(r.score, 100);
  assert.equal(r.stats.fully_documented, 1);
  assert.equal(r.stats.incomplete, 0);
  assert.equal(r.entries[0].complete, true);
});

test("empty array scores null (never 100 over an empty denominator)", () => {
  const r = validateOverrides([]);
  assert.equal(r.score, null);
  assert.equal(r.stats.overrides_total, 0);
  assert.equal(r.findings.length, 0);
});

test("each missing required field is one finding; rationale never faulted", () => {
  const r = validateOverrides([{ gate: "intake", risk: "unknown scope" }]);
  const missing = r.findings.map((f) => f.evidence).sort();
  assert.deepEqual(missing, ["acknowledged_by", "alternative", "date", "decision"]);
  assert.equal(r.findings.every((f) => f.category === "override_field_missing"), true);
  assert.equal(r.entries[0].complete, false);
});

test("severity is keyed by field, not category", () => {
  const r = validateOverrides([{}]);
  const sev = Object.fromEntries(r.findings.map((f) => [f.evidence, f.severity]));
  assert.equal(sev.risk, "high");
  assert.equal(sev.alternative, "high");
  assert.equal(sev.date, "high");
  assert.equal(sev.acknowledged_by, "high");
  assert.equal(sev.gate, "medium");
  assert.equal(sev.decision, "medium");
});

// Discriminating test (WORKFLOW Obs 15): whitespace-only must be treated as
// missing, or the trim step is silently absent while the bar stays green.
test("whitespace-only fields count as missing", () => {
  const r = validateOverrides([{ ...full, risk: "   " }]);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].evidence, "risk");
  assert.equal(r.score, 0);
});

test("score is the rounded share of fully-documented entries", () => {
  const r = validateOverrides([full, { gate: "x" }, { gate: "y" }]); // 1 of 3
  assert.equal(r.score, 33);
  assert.equal(r.stats.fully_documented, 1);
  assert.equal(r.stats.incomplete, 2);
});

test("entry id is stable across field edits to non-identity fields", () => {
  const a = validateOverrides([full]).entries[0].id;
  const b = validateOverrides([{ ...full, risk: "reworded risk", alternative: "reworded" }]).entries[0].id;
  assert.equal(a, b); // gate+date+decision unchanged -> id unchanged
});

test("entry id changes when an identity field changes", () => {
  const a = validateOverrides([full]).entries[0].id;
  const b = validateOverrides([{ ...full, decision: "defer instead" }]).entries[0].id;
  assert.notEqual(a, b);
});

test("findings are ordered by entry then required-field order", () => {
  const r = validateOverrides([{}, {}]);
  // entry 0's six findings precede entry 1's six
  assert.equal(r.findings[0].entry_index, 0);
  assert.equal(r.findings[5].entry_index, 0);
  assert.equal(r.findings[6].entry_index, 1);
  // within an entry, gate (first required field) comes first
  assert.equal(r.findings[0].evidence, "gate");
});

test("fields_missing_total equals the number of findings", () => {
  const r = validateOverrides([{}, { gate: "x", risk: "y" }]);
  assert.equal(r.stats.fields_missing_total, r.findings.length);
});

test("finding ids are stable across edits to non-identity fields", () => {
  // gate/date/decision present (identity fixed); risk/alternative/acknowledged_by missing -> 3 findings each.
  const ids = (o: any) => validateOverrides([o]).findings.map((f) => f.id).sort();
  const a = ids({ gate: "g", date: "d", decision: "x" });
  const b = ids({ gate: "g", date: "d", decision: "x", rationale: "added later" });
  assert.equal(a.length, 3);
  assert.deepEqual(a, b); // identity unchanged -> finding ids unchanged
});

test("a non-object array item is treated as an all-missing entry, never throws", () => {
  const r = validateOverrides([null as any, "x" as any]);
  assert.equal(r.stats.overrides_total, 2);
  assert.equal(r.findings.filter((f) => f.entry_index === 0).length, 6);
});
