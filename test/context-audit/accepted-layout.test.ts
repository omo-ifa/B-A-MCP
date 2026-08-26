import { test } from "node:test";
import assert from "node:assert/strict";
import { parentDir, isRouteToDirNested } from "../../src/tools/context-audit/accepted-layout.js";
import { computeSkillDirs, isSkillDiscovered } from "../../src/tools/context-audit/accepted-layout.js";
import { isAgentRuntimeConfig } from "../../src/tools/context-audit/accepted-layout.js";

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

test("D2 skill-discovery: a doc under a SKILL.md directory is accepted", () => {
  const docs = ["skills/foo/SKILL.md", "skills/foo/reference.md", "skills/foo/lib/util.md", "docs/guide.md"];
  const skillDirs = computeSkillDirs(docs);
  assert.deepEqual([...skillDirs].sort(), ["skills/foo"]);        // parent of the SKILL.md
  assert.equal(isSkillDiscovered("skills/foo/reference.md", skillDirs), true);   // sibling of SKILL.md
  assert.equal(isSkillDiscovered("skills/foo/lib/util.md", skillDirs), true);    // nested under the skill dir
  assert.equal(isSkillDiscovered("docs/guide.md", skillDirs), false);            // no skill ancestor
});

test("D3 agent-runtime config: .claude/**, root WARP.md, cursor-hooks/**", () => {
  assert.equal(isAgentRuntimeConfig(".claude/agents/foo.md"), true);
  assert.equal(isAgentRuntimeConfig(".claude/projects/x/AGENT.md"), true);
  assert.equal(isAgentRuntimeConfig("WARP.md"), true);
  assert.equal(isAgentRuntimeConfig("cursor-hooks/pre.md"), true);
  assert.equal(isAgentRuntimeConfig("src/WARP.md"), false);   // WARP.md only at repo root
  assert.equal(isAgentRuntimeConfig("docs/guide.md"), false);
});
