import { test } from "node:test";
import assert from "node:assert/strict";
import { overrideLogTool, runOverrideLog, toCallToolResult } from "../../src/tools/override-log/index.js";

test("tool name and required input key", () => {
  assert.equal(overrideLogTool.name, "override_log");
  assert.deepEqual(overrideLogTool.inputSchema.required, ["overrides"]);
});

test("a valid call returns rendered + structuredContent, mirrored", () => {
  const out = runOverrideLog({ overrides: [{ gate: "problem-fit", risk: "r", alternative: "a", decision: "d", acknowledged_by: "who", date: "2026-08-27" }] });
  assert.equal(out.ok, true);
  const res = toCallToolResult(out);
  assert.ok(res.structuredContent);
  assert.equal((res.structuredContent as any).score, 100);
  assert.equal(res.content[0].text, (res.structuredContent as any).rendered);
});

test("missing/non-array overrides is a structured INVALID_OVERRIDES error, not a throw", () => {
  const out = runOverrideLog({} as any);
  assert.equal(out.ok, false);
  const res = toCallToolResult(out);
  assert.equal(res.isError, true);
  assert.equal(res.structuredContent, undefined);
  assert.equal(JSON.parse(res.content[0].text).error.code, "INVALID_OVERRIDES");
});

test("an empty array is valid (score null), not an error", () => {
  const out = runOverrideLog({ overrides: [] });
  assert.equal(out.ok, true);
  assert.equal((out as any).result.score, null);
});
