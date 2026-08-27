import { test } from "node:test";
import assert from "node:assert/strict";
import { countTokens } from "../../src/tools/context-audit/tokens.js";
import { contextAuditTool } from "../../src/tools/context-audit/index.js";
import { overrideLogTool } from "../../src/tools/override-log/index.js";
import { docDriftTool } from "../../src/tools/doc-drift/index.js";

// Rule 2: the COMBINED standing tool-definition cost stays under ~4000 tokens.
test("combined standing tool-definition cost is under 4000 (rule 2)", () => {
  const total =
    countTokens(JSON.stringify(contextAuditTool)) +
    countTokens(JSON.stringify(overrideLogTool)) +
    countTokens(JSON.stringify(docDriftTool));
  assert.ok(total < 4000, `combined standing cost ${total} exceeds 4000`);
});
