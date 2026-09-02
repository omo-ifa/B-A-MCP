import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  resolvePromptsDir,
  listPromptNames,
  computeCommandFiles,
  findOrphans,
} from "../../src/prompts/index.js";
import { parseFrontmatter } from "../../src/prompts/frontmatter.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const commandsDir = join(repoRoot, ".claude", "commands");
const EXPECTED = ["decisions", "design-doc", "handoff", "intake", "problem-fit"];
const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "");

test("served set is exactly the five expected gates", () => {
  assert.deepEqual(listPromptNames(resolvePromptsDir()), EXPECTED);
});

test("every prompt parses and has a non-empty description", () => {
  const dir = resolvePromptsDir();
  for (const name of listPromptNames(dir)) {
    const { attributes } = parseFrontmatter(readFileSync(join(dir, `${name}.md`), "utf8"));
    assert.ok(attributes.description && attributes.description.length > 0, `${name} has a description`);
  }
});

test("committed .claude/commands/ matches a fresh regeneration (no drift)", () => {
  const dir = resolvePromptsDir();
  for (const { name, content } of computeCommandFiles(dir)) {
    const committed = readFileSync(join(commandsDir, `${name}.md`), "utf8");
    assert.equal(norm(committed), norm(content), `${name}.md is up to date — run node scripts/gen-commands.mjs`);
  }
});

test("no orphan command files", () => {
  assert.deepEqual(findOrphans(resolvePromptsDir(), commandsDir), []);
});
