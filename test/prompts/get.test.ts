import { test } from "node:test";
import assert from "node:assert/strict";
import { getPrompt, UnknownPromptError } from "../../src/prompts/registry.js";

test("get intake substitutes $ARGUMENTS with the idea (server-side)", () => {
  const res = getPrompt("intake", { idea: "add a CSV export button" });
  assert.equal(res.messages[0].role, "user");
  const text = res.messages[0].content.text;
  assert.ok(text.includes("add a CSV export button"), "idea substituted");
  assert.ok(!text.includes("$ARGUMENTS"), "no literal $ARGUMENTS remains");
  assert.ok(res.description && res.description.length > 0);
});

test("get with no idea substitutes $ARGUMENTS to empty string", () => {
  const res = getPrompt("intake", {});
  assert.ok(!res.messages[0].content.text.includes("$ARGUMENTS"));
});

test("get a no-argument gate returns its body unchanged (no $ARGUMENTS in source)", () => {
  const res = getPrompt("decisions");
  assert.ok(res.messages[0].content.text.includes("Gate 2"));
  assert.ok(!res.messages[0].content.text.includes("$ARGUMENTS"));
});

test("unknown name throws UnknownPromptError, message carries no filesystem path", () => {
  try {
    getPrompt("not-a-gate");
    assert.fail("expected throw");
  } catch (e) {
    assert.ok(e instanceof UnknownPromptError);
    assert.ok(!/[/\\]/.test((e as Error).message), "no path separators leaked");
  }
});

test("a traversal-shaped name is rejected as unknown, never opened", () => {
  assert.throws(() => getPrompt("../../etc/passwd"), UnknownPromptError);
});
