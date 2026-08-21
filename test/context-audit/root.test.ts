import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
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

test("throws NO_ROUTING_ROOT when target directory is not readable", () => {
  if (typeof process.getuid === "function" && process.getuid() === 0) return;
  const dir = tmp();
  try {
    chmodSync(dir, 0o000);
    assert.throws(() => resolveRoot(dir), (e: unknown) => e instanceof RootTargetError && e.code === "NO_ROUTING_ROOT");
  } finally {
    chmodSync(dir, 0o755);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hasStructuralName is case-insensitive", () => {
  assert.equal(hasStructuralName("CLAUDE.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("claude.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("Context.MD", "CONTEXT.md"), true);
  assert.equal(hasStructuralName("readme.md", "CLAUDE.md"), false);
});

test("D1: an AGENTS.md-only directory anchors as claude_md (widened root predicate)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-root-agents-"));
  try {
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "AGENTS.md"), "# root\n");
    const root = resolveRoot(dir);
    assert.equal(root.method, "claude_md");   // AGENTS.md now anchors, not the git fallback
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
