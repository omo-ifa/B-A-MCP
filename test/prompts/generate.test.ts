import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderCommand, computeCommandFiles, findOrphans } from "../../src/prompts/generate.js";

test("renderCommand preserves $ARGUMENTS literally and emits frontmatter", () => {
  const out = renderCommand(
    { description: "d", "argument-hint": "[an idea]" },
    "Body with $ARGUMENTS token"
  );
  assert.ok(out.startsWith("---\n"));
  assert.ok(out.includes('description: "d"'));
  assert.ok(out.includes("argument-hint: [an idea]"));
  assert.ok(out.includes("$ARGUMENTS"), "generator PRESERVES $ARGUMENTS literal (opposite of server)");
});

test("renderCommand omits argument-hint when absent", () => {
  const out = renderCommand({ description: "only desc" }, "body");
  assert.ok(out.includes('description: "only desc"'));
  assert.ok(!out.includes("argument-hint"));
});

test("renderCommand is deterministic", () => {
  const a = renderCommand({ description: "d", "argument-hint": "[x]" }, "b $ARGUMENTS");
  const b = renderCommand({ description: "d", "argument-hint": "[x]" }, "b $ARGUMENTS");
  assert.equal(a, b);
});

test("computeCommandFiles emits one file per served prompt, sorted", () => {
  const dir = mkdtempSync(join(tmpdir(), "gen-"));
  try {
    writeFileSync(join(dir, "b.md"), `---\ndescription: "B"\n---\nbody b`);
    writeFileSync(join(dir, "a.md"), `---\ndescription: "A"\n---\nbody a`);
    const files = computeCommandFiles(dir);
    assert.deepEqual(files.map((f) => f.name), ["a", "b"]);
    assert.ok(files[0].content.includes('description: "A"'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findOrphans flags command files with no source prompt", () => {
  const dir = mkdtempSync(join(tmpdir(), "gen-src-"));
  const cmds = mkdtempSync(join(tmpdir(), "gen-cmd-"));
  try {
    writeFileSync(join(dir, "keep.md"), `---\ndescription: "k"\n---\nx`);
    writeFileSync(join(cmds, "keep.md"), "whatever");
    writeFileSync(join(cmds, "stale.md"), "orphan");
    assert.deepEqual(findOrphans(dir, cmds), ["stale.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(cmds, { recursive: true, force: true });
  }
});
