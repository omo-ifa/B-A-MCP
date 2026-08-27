import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOverrides } from "../../src/tools/override-log/validate.js";
import { renderOverrideLog } from "../../src/tools/override-log/render.js";

const full = {
  gate: "problem-fit", risk: "score 2/8", alternative: "run the Scorecard",
  decision: "proceed", acknowledged_by: "T. Alexander", date: "2026-08-27",
};

function render(overrides: any[]) {
  const v = validateOverrides(overrides);
  return renderOverrideLog({ score: v.score, stats: v.stats, entries: v.entries });
}

test("header, summary and completeness percent appear", () => {
  const md = render([full, { gate: "x" }]);
  assert.match(md, /# override_log/);
  assert.match(md, /2 overrides/);
  assert.match(md, /50%/); // 1 of 2 fully documented
});

test("empty log renders a notice, not a fake 100%", () => {
  const md = render([]);
  assert.match(md, /No overrides supplied/i);
  assert.doesNotMatch(md, /100%/);
});

test("the one-liner includes the cheaper alternative", () => {
  const md = render([full]);
  assert.match(md, /run the Scorecard/); // alternative must appear in the sentence
  assert.match(md, /problem-fit/);
});

test("an incomplete entry flags its missing fields", () => {
  const md = render([{ gate: "intake", risk: "unknown scope" }]);
  assert.match(md, /Missing/);
  assert.match(md, /alternative/);
  assert.match(md, /acknowledged_by/);
});

test("the entry id is shown", () => {
  const v = validateOverrides([full]);
  const md = renderOverrideLog({ score: v.score, stats: v.stats, entries: v.entries });
  assert.ok(md.includes(v.entries[0].id));
});
