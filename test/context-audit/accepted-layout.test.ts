import { test } from "node:test";
import assert from "node:assert/strict";
import { parentDir, isRouteToDirNested } from "../../src/tools/context-audit/accepted-layout.js";
import { computeSkillDirs, isSkillDiscovered } from "../../src/tools/context-audit/accepted-layout.js";
import { isAgentRuntimeConfig } from "../../src/tools/context-audit/accepted-layout.js";
import { isTightDatedArchival } from "../../src/tools/context-audit/accepted-layout.js";
import { isAcceptedLayout } from "../../src/tools/context-audit/accepted-layout.js";
import { computeManifestDirs, isComponentManifest } from "../../src/tools/context-audit/accepted-layout.js";

test("parentDir returns the directory portion, empty for root-level", () => {
  assert.equal(parentDir("a/b/c.md"), "a/b");
  assert.equal(parentDir("c.md"), "");
});

test("D1 route-to-dir-nested: nets only when the NEAREST routing-known ancestor is a strict dir-target (TBD-19)", () => {
  // src is a genuine directory-target (and therefore also in routedDirs).
  const dt = new Set(["src"]);
  const rd = new Set(["src"]);
  assert.equal(isRouteToDirNested("src/sub/deep.md", rd, dt), true);    // nested below dir-target src
  assert.equal(isRouteToDirNested("src/direct.md", rd, dt), false);     // directly in dir-target
  assert.equal(isRouteToDirNested("other/x.md", rd, dt), false);        // no routing-known ancestor

  // MSW REGRESSION: nearest routing-known ancestor is a strict-ancestor FILE-PARENT
  // (apps/admin in routedDirs via a file link, not a dir-target) -> NOT netted.
  const rdMsw = new Set(["apps/admin", "products"]);
  const dtMsw = new Set(["products"]);
  assert.equal(isRouteToDirNested("apps/admin/test-utils/x/MSW_USAGE_GUIDE.md", rdMsw, dtMsw), false);

  // PRD REGRESSION: parent is a file-parent, and a DISTANT ancestor (products) is a
  // dir-target. The nearest routing-known ancestor is the file-parent parent, so the
  // doc must NOT net (a pure-dirTargets scan would wrongly net it via products).
  const rdPrd = new Set(["products", "products/desktop", "products/desktop/docs", "products/desktop/docs/plans"]);
  const dtPrd = new Set(["products"]);
  assert.equal(isRouteToDirNested("products/desktop/docs/plans/browser-tabs.md", rdPrd, dtPrd), false);

  // DISCRIMINATOR: the SAME deep path DOES net when NO intervening dir is routing-known,
  // so the nearest routing-known ancestor is the dir-target products itself.
  const rdClean = new Set(["products"]);
  const dtClean = new Set(["products"]);
  assert.equal(isRouteToDirNested("products/desktop/docs/plans/browser-tabs.md", rdClean, dtClean), true);
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

test("D5 computeManifestDirs: >=3 sibling dirs each with config.json + DESCRIPTION.md qualify", () => {
  const configDirs = new Set(["r/a", "r/b", "r/c"]);
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md", "r/c/DESCRIPTION.md"];
  const md = computeManifestDirs(configDirs, docs);
  assert.deepEqual([...md].sort(), ["r/a", "r/b", "r/c"]);
});

test("D5 computeManifestDirs: exactly 2 siblings do NOT qualify (threshold is >=3)", () => {
  const configDirs = new Set(["r/a", "r/b"]);
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md"];
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 computeManifestDirs: config.json without DESCRIPTION.md, or vice versa, is not a candidate", () => {
  const configDirs = new Set(["r/a", "r/b", "r/c"]);   // c has config but no DESCRIPTION.md
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md", "r/d/DESCRIPTION.md"]; // d has DESCRIPTION but no config
  // only a and b carry BOTH -> group of 2 -> below threshold -> none qualify
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 computeManifestDirs: siblings are grouped by grandparent, not globally", () => {
  const configDirs = new Set(["g1/a", "g1/b", "g2/c"]);
  const docs = ["g1/a/DESCRIPTION.md", "g1/b/DESCRIPTION.md", "g2/c/DESCRIPTION.md"];
  // g1 has 2, g2 has 1 -> neither group reaches 3
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 computeManifestDirs: a top-level registry (grandparent \"\") qualifies", () => {
  // plugin dirs directly under repo root -> grandparent is "" (root). G === "" is a
  // valid grandparent (a registry may sit at the top level); only a candidate dir that
  // IS the root ("") is excluded. All three qualify.
  const configDirs = new Set(["a", "b", "c"]);
  const docs = ["a/DESCRIPTION.md", "b/DESCRIPTION.md", "c/DESCRIPTION.md"];
  assert.deepEqual([...computeManifestDirs(configDirs, docs)].sort(), ["a", "b", "c"]);
});

test("D5 isComponentManifest: DESCRIPTION.md in a qualifying dir nets, case-insensitive; other files do not", () => {
  const manifestDirs = new Set(["r/a"]);
  assert.equal(isComponentManifest("r/a/DESCRIPTION.md", manifestDirs), true);
  assert.equal(isComponentManifest("r/a/description.md", manifestDirs), true);   // case-insensitive
  assert.equal(isComponentManifest("r/a/README.md", manifestDirs), false);       // not the manifest doc
  assert.equal(isComponentManifest("r/z/DESCRIPTION.md", manifestDirs), false);  // dir not qualifying
  // L4: only the DESCRIPTION.md DIRECTLY in the qualifying dir nets; one nested a
  // level deeper (parent "r/a/sub", not "r/a") is NOT netted.
  assert.equal(isComponentManifest("r/a/sub/DESCRIPTION.md", manifestDirs), false);
});

test("isAcceptedLayout ORs the five detectors; a plain unreferenced doc is NOT accepted", () => {
  const ctx = { routedDirs: new Set(["src"]), dirTargets: new Set(["src"]), skillDirs: new Set(["skills/foo"]), manifestDirs: new Set(["reg/a"]) };
  assert.equal(isAcceptedLayout("src/sub/nested.md", ctx), true);        // D1
  assert.equal(isAcceptedLayout("skills/foo/ref.md", ctx), true);        // D2
  assert.equal(isAcceptedLayout(".claude/agents/a.md", ctx), true);      // D3
  assert.equal(isAcceptedLayout("x/2020-01-01-note.md", ctx), true);     // D4
  assert.equal(isAcceptedLayout("reg/a/DESCRIPTION.md", ctx), true);     // D5
  assert.equal(isAcceptedLayout("src/ORPHAN.md", ctx), false);
});
