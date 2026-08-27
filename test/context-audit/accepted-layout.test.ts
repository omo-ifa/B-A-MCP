import { test } from "node:test";
import assert from "node:assert/strict";
import { parentDir, isRouteToDirNested } from "../../src/tools/context-audit/accepted-layout.js";
import { computeSkillDirs, isSkillDiscovered } from "../../src/tools/context-audit/accepted-layout.js";
import { isAgentRuntimeConfig } from "../../src/tools/context-audit/accepted-layout.js";
import { isTightDatedArchival } from "../../src/tools/context-audit/accepted-layout.js";
import { isAcceptedLayout } from "../../src/tools/context-audit/accepted-layout.js";

test("parentDir returns the directory portion, empty for root-level", () => {
  assert.equal(parentDir("a/b/c.md"), "a/b");
  assert.equal(parentDir("c.md"), "");
});

test("D1 route-to-dir-nested: keys on dirTargets, not the broader routedDirs (TBD-19)", () => {
  // dirTargets = directories routed AS a directory. "src" is one; "apps/admin" is NOT
  // (in the real graph it lands in routedDirs only via a file-parent link).
  const dirTargets = new Set(["src"]);
  // nested below a directory-target -> accepted layout
  assert.equal(isRouteToDirNested("src/sub/deep.md", dirTargets), true);
  // directly inside a directory-target -> not nested
  assert.equal(isRouteToDirNested("src/direct.md", dirTargets), false);
  // outside any directory-target -> not nested
  assert.equal(isRouteToDirNested("other/x.md", dirTargets), false);
  // MSW REGRESSION: nested below a dir that is NOT a directory-target must NOT net,
  // even several levels deep (the Ghost apps/admin/.../MSW_USAGE_GUIDE.md shape).
  assert.equal(isRouteToDirNested("apps/admin/test-utils/x/MSW_USAGE_GUIDE.md", dirTargets), false);
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

test("D4 tight dated/versioned-archival: dated filename OR version-shaped basename; segment conventions dropped (TBD-20)", () => {
  // D4a — dated filename (structural), unchanged
  assert.equal(isTightDatedArchival("posts/published-2014-12-19-hello.md"), true);
  assert.equal(isTightDatedArchival("x/plans/2026-08-25-thing.md"), true);   // dated plan still nets, via D4a
  // D4b — version-shaped basename (structural), full semver only
  assert.equal(isTightDatedArchival("CHANGELOG/1.4.1.md"), true);
  assert.equal(isTightDatedArchival("CHANGELOG/6.1.0.md"), true);
  assert.equal(isTightDatedArchival("archive/v2.0.0.md"), true);
  // ambiguous two-part forms do NOT net (counted = safe direction)
  assert.equal(isTightDatedArchival("docs/v2.md"), false);
  assert.equal(isTightDatedArchival("docs/2.0.md"), false);
  // DROPPED conventions: a live, non-dated, non-versioned doc under plans/ or CHANGELOG/
  // is NO LONGER netted (the posthog live-PRD silent-FN vector).
  assert.equal(isTightDatedArchival("products/desktop/docs/plans/browser-tabs.md"), false);
  assert.equal(isTightDatedArchival("CHANGELOG/upcoming.md"), false);
  // NOT netted: bare docs/ (spec gap — stays counted), unchanged
  assert.equal(isTightDatedArchival("docs/architecture.md"), false);
});

test("D2 skill-discovery: a root-level SKILL.md must not register (silent-FN guard)", () => {
  // A repo-ROOT SKILL.md has parentDir("SKILL.md") === "". Since ancestorDirs()
  // always terminates in "", naively adding "" to skillDirs would make every
  // doc in the repo "skill-discovered" — a silent false negative on genuine
  // orphans. computeSkillDirs must exclude the empty-string parent.
  const skillDirs = computeSkillDirs(["SKILL.md", "src/x.md"]);
  assert.deepEqual([...skillDirs], []);
  assert.equal(isSkillDiscovered("src/anything.md", skillDirs), false);

  // Confirm the guard doesn't disturb the normal nested-skill case.
  const nested = computeSkillDirs(["skills/foo/SKILL.md"]);
  assert.deepEqual([...nested], ["skills/foo"]);
  assert.equal(isSkillDiscovered("skills/foo/ref.md", nested), true);
});

test("isAcceptedLayout ORs the four detectors; a plain unreferenced doc is NOT accepted", () => {
  const ctx = { dirTargets: new Set(["src"]), skillDirs: new Set(["skills/foo"]) };
  assert.equal(isAcceptedLayout("src/sub/nested.md", ctx), true);        // D1
  assert.equal(isAcceptedLayout("skills/foo/ref.md", ctx), true);        // D2
  assert.equal(isAcceptedLayout(".claude/agents/a.md", ctx), true);      // D3
  assert.equal(isAcceptedLayout("x/2020-01-01-note.md", ctx), true);     // D4
  // genuine-abandoned: directly in a directory-target, no skill/agent/date signal
  assert.equal(isAcceptedLayout("src/ORPHAN.md", ctx), false);
});
