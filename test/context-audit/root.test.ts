import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot, hasStructuralName, RootTargetError } from "../../src/tools/context-audit/root.js";

function tmp() { return mkdtempSync(join(tmpdir(), "ca-root-")); }

test("resolves upward to nearest CLAUDE.md (case-insensitive)", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "claude.md"), "# root");   // lowercase, must still anchor
    const sub = join(dir, "src"); mkdirSync(sub);
    const r = resolveRoot(sub);
    assert.equal(r.method, "claude_md");
    assert.equal(r.path, dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("falls back to git root, then given path", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, ".git"));
    const sub = join(dir, "pkg"); mkdirSync(sub);
    assert.equal(resolveRoot(sub).method, "git_root");
  } finally { rmSync(dir, { recursive: true, force: true }); }

  const bare = tmp();
  try {
    assert.equal(resolveRoot(bare).method, "given_path");
  } finally { rmSync(bare, { recursive: true, force: true }); }
});

test("throws NO_ROUTING_ROOT when target is missing or not a directory", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "file.md"), "x");
    assert.throws(() => resolveRoot(join(dir, "file.md")), (e: unknown) => e instanceof RootTargetError && e.code === "NO_ROUTING_ROOT");
    assert.throws(() => resolveRoot(join(dir, "nope")), (e: unknown) => e instanceof RootTargetError);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hasStructuralName is case-insensitive", () => {
  assert.equal(hasStructuralName("CLAUDE.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("claude.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("Context.MD", "CONTEXT.md"), true);
  assert.equal(hasStructuralName("readme.md", "CLAUDE.md"), false);
});
