import { test } from "node:test";
import assert from "node:assert/strict";
import { countTokens, CHARS_PER_TOKEN, TOKEN_METHOD } from "../../src/tools/context-audit/tokens.js";

test("char-approx-v1 counts ceil(chars/4) and reports its method", () => {
  assert.equal(TOKEN_METHOD, "char-approx-v1");
  assert.equal(CHARS_PER_TOKEN, 4);
  assert.equal(countTokens(""), 0);
  assert.equal(countTokens("abcd"), 1);
  assert.equal(countTokens("abcde"), 2);      // ceil(5/4)
  assert.equal(countTokens("a".repeat(400)), 100);
});
