import { test } from "node:test";
import assert from "node:assert/strict";
import { contextAuditTool } from "../../src/tools/context-audit/index.js";
import { countTokens } from "../../src/tools/context-audit/tokens.js";

test("standing tool-definition cost is under the ~4000-token budget (rule 2)", () => {
  const standing = countTokens(JSON.stringify(contextAuditTool));
  assert.ok(standing < 4000, `tool definition standing cost ${standing} exceeds 4000`);
});
