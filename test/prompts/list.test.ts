import { test } from "node:test";
import assert from "node:assert/strict";
import { listPrompts } from "../../src/prompts/registry.js";

test("lists exactly the five gates with descriptions", () => {
  const prompts = listPrompts();
  assert.deepEqual(prompts.map((p) => p.name), ["decisions", "design-doc", "handoff", "intake", "problem-fit"]);
  for (const p of prompts) assert.ok(p.description && p.description.length > 0, `${p.name} has description`);
});

test("only intake and problem-fit declare the optional idea argument", () => {
  const byName = Object.fromEntries(listPrompts().map((p) => [p.name, p]));
  for (const n of ["intake", "problem-fit"]) {
    assert.equal(byName[n].arguments.length, 1, `${n} has one arg`);
    assert.equal(byName[n].arguments[0].name, "idea");
    assert.equal(byName[n].arguments[0].required, false);
    assert.ok(byName[n].arguments[0].description && byName[n].arguments[0].description.length > 0);
  }
  for (const n of ["decisions", "design-doc", "handoff"]) {
    assert.deepEqual(byName[n].arguments, [], `${n} has no args`);
  }
});
