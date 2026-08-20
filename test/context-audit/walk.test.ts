import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
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

function symlinkFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-sym-"));
  writeFileSync(join(dir, "CLAUDE.md"), "# root");
  mkdirSync(join(dir, "real"));
  writeFileSync(join(dir, "real", "target.md"), "target content");
  symlinkSync(join(dir, "real", "target.md"), join(dir, "link-to-file.md"));
  symlinkSync(join(dir, "real"), join(dir, "link-to-dir"));
  return dir;
}

test("walk never follows symlinks: records a symlink finding, does not traverse or duplicate the target", () => {
  const dir = symlinkFixture();
  try {
    const res = walk(resolveRoot(dir));
    const rels = res.docs.map((d) => d.relPath).sort();

    // the real file (reached via the real, non-symlink directory) is a doc
    assert.ok(rels.includes("real/target.md"));
    // the symlink to the file is never walked into docs
    assert.ok(!rels.includes("link-to-file.md"));
    // the symlink to the directory is never traversed (no duplicate via the link)
    assert.ok(!rels.includes("link-to-dir/target.md"));

    const symlinkFindings = res.findings.filter((f) => f.category === "symlink");
    const symlinkFiles = symlinkFindings.map((f) => f.file).sort();
    assert.deepEqual(symlinkFiles, ["link-to-dir", "link-to-file.md"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function binaryFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-bin-"));
  writeFileSync(join(dir, "CLAUDE.md"), "# root");
  writeFileSync(join(dir, "bin.md"), Buffer.from([0x41, 0x00, 0x42]));
  return dir;
}

test("walk records binary/unreadable .md as a skipped finding with null content", () => {
  const dir = binaryFixture();
  try {
    const res = walk(resolveRoot(dir));
    const binDoc = res.docs.find((d) => d.relPath === "bin.md");
    assert.ok(binDoc, "binary file is still recorded as a doc");
    assert.equal(binDoc!.content, null);
    assert.equal(res.filesSkipped, 1);
    assert.ok(res.findings.some((f) => f.category === "skipped" && f.file === "bin.md"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function gitignoredDirFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-gidir-"));
  writeFileSync(join(dir, "CLAUDE.md"), "# root");
  writeFileSync(join(dir, ".gitignore"), "coverage/\n");
  mkdirSync(join(dir, "coverage"));
  writeFileSync(join(dir, "coverage", "notes.md"), "should not appear");
  writeFileSync(join(dir, "real-target.md"), "target");
  // a symlink inside the gitignored dir: if the dir isn't pruned before
  // recursion, this would leak a `symlink` finding out of a skipped subtree.
  symlinkSync(join(dir, "real-target.md"), join(dir, "coverage", "link.md"));
  return dir;
}

test("walk prunes a gitignored directory entirely: no docs or findings leak from it", () => {
  const dir = gitignoredDirFixture();
  try {
    const res = walk(resolveRoot(dir));
    const rels = res.docs.map((d) => d.relPath);
    assert.ok(!rels.includes("coverage/notes.md"));
    assert.ok(!res.findings.some((f) => f.file.startsWith("coverage/")));
    // the root doc and the untouched sibling file are still walked normally
    assert.ok(rels.includes("CLAUDE.md"));
    assert.ok(rels.includes("real-target.md"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
