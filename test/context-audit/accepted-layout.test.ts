import { test } from "node:test";
import assert from "node:assert/strict";
import { parentDir, isRouteToDirNested } from "../../src/tools/context-audit/accepted-layout.js";

test("parentDir returns the directory portion, empty for root-level", () => {
  assert.equal(parentDir("a/b/c.md"), "a/b");
  assert.equal(parentDir("c.md"), "");
});

test("D1 route-to-dir-nested: nested under a routed dir is accepted; direct child is not", () => {
  const routedDirs = new Set(["src"]);
  // src/sub/deep.md — parent "src/sub" not routed, ancestor "src" routed -> nested (accepted)
  assert.equal(isRouteToDirNested("src/sub/deep.md", routedDirs), true);
  // src/direct.md — parent "src" IS routed -> directly in routed dir -> NOT nested
  assert.equal(isRouteToDirNested("src/direct.md", routedDirs), false);
  // outside any routed dir -> not nested
  assert.equal(isRouteToDirNested("other/x.md", routedDirs), false);
});
