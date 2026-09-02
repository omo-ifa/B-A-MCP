import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolvePromptsDir, listPromptNames, PromptDirError } from "../../src/prompts/registry.js";

test("resolvePromptsDir finds the real prompts/ from the compiled module location", () => {
  const dir = resolvePromptsDir(); // default anchors on registry.js's own compiled location (dist/src/prompts), walks up to repo-root prompts/
  const names = listPromptNames(dir);
  assert.deepEqual(names, ["decisions", "design-doc", "handoff", "intake", "problem-fit"]);
});

test("DISCRIMINATING: a nearer prompts/ WITHOUT .md is skipped for a farther one WITH .md", () => {
  // root/prompts/<md>            <- the real one (farther)
  // root/a/prompts/(empty, .js)  <- decoy nearer dir, no .md (mimics dist/src/prompts)
  // start from root/a/prompts/registry.js
  const root = mkdtempSync(join(tmpdir(), "promptres-"));
  try {
    mkdirSync(join(root, "prompts"));
    writeFileSync(join(root, "prompts", "x.md"), "# x");
    mkdirSync(join(root, "a", "prompts"), { recursive: true });
    writeFileSync(join(root, "a", "prompts", "registry.js"), "// compiled");
    const startUrl = pathToFileURL(join(root, "a", "prompts", "registry.js")).href;
    const found = resolvePromptsDir(startUrl);
    assert.equal(found, join(root, "prompts"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolvePromptsDir throws PromptDirError when no prompts/ exists above start", () => {
  const root = mkdtempSync(join(tmpdir(), "promptres-none-"));
  try {
    const startUrl = pathToFileURL(join(root, "deep", "mod.js")).href;
    assert.throws(() => resolvePromptsDir(startUrl), PromptDirError);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
