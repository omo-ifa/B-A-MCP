import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../../src/tools/context-audit/root.js";
import { walk } from "../../src/tools/context-audit/walk.js";

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-"));
  writeFileSync(join(dir, "CLAUDE.md"), "# root");
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "CONTEXT.md"), "# ctx");
  writeFileSync(join(dir, "src", "notes.md"), "notes");
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "node_modules", "pkg.md"), "should be skipped");
  writeFileSync(join(dir, ".gitignore"), "ignored.md\n");
  writeFileSync(join(dir, "ignored.md"), "gitignored");
  mkdirSync(join(dir, ".claude"));
  mkdirSync(join(dir, ".claude", "commands"));
  writeFileSync(join(dir, ".claude", "commands", "gen.md"), "generated");
  return dir;
}

test("walk collects in-scope md, honors hard-skips, .gitignore, and .claude/commands", () => {
  const dir = fixture();
  try {
    const res = walk(resolveRoot(dir));
    const rels = res.docs.map((d) => d.relPath).sort();
    assert.deepEqual(rels, ["CLAUDE.md", "src/CONTEXT.md", "src/notes.md"]);
    // node_modules, gitignored, and .claude/commands all excluded
    assert.ok(!rels.includes("ignored.md"));
    assert.ok(res.docs.find((d) => d.relPath === "CLAUDE.md")!.isRoot);
    assert.ok(res.docs.find((d) => d.relPath === "src/CONTEXT.md")!.isRoot);
    assert.ok(!res.docs.find((d) => d.relPath === "src/notes.md")!.isRoot);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("walk output is sorted and deterministic", () => {
  const dir = fixture();
  try {
    const a = walk(resolveRoot(dir)).docs.map((d) => d.relPath);
    const b = walk(resolveRoot(dir)).docs.map((d) => d.relPath);
    assert.deepEqual(a, b);
    assert.deepEqual(a, [...a].sort());
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
