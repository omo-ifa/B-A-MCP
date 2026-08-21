import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ignore from "ignore";
import { hasStructuralName } from "./root.js";
import type { Root, RawFinding } from "./types.js";

export interface WalkedDoc { relPath: string; absPath: string; content: string | null; isRoot: boolean; }
export interface WalkResult { docs: WalkedDoc[]; findings: RawFinding[]; filesSkipped: number; }

const HARD_SKIP_DIRS = new Set(["node_modules", "dist", "build", "vendor", ".venv", "target"]);
const DOT_ALLOW = new Set([".claude", ".github"]);

function info(category: RawFinding["category"], file: string, message: string, evidence: string, discriminator: string): RawFinding {
  return { category, file, line: null, message, evidence, discriminator };
}
function isRootName(basename: string): boolean {
  return hasStructuralName(basename, "CLAUDE.md") || hasStructuralName(basename, "CONTEXT.md") || hasStructuralName(basename, "AGENTS.md");
}
function looksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

export function walk(root: Root): WalkResult {
  const docs: WalkedDoc[] = [];
  const findings: RawFinding[] = [];
  let filesSkipped = 0;

  const ig = ignore();
  const giPath = join(root.path, ".gitignore");
  if (existsSync(giPath)) { try { ig.add(readFileSync(giPath, "utf8")); } catch { /* unreadable .gitignore: ignore */ } }

  function rel(abs: string): string { return relative(root.path, abs).split(sep).join("/"); }

  function recurse(dir: string): void {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { return; } // unreadable dir: degrade, skip
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // detect case-insensitive structural-name collisions in this dir
    const seenLower = new Map<string, string>();
    for (const e of entries) {
      const lower = e.name.toLowerCase();
      if (isRootName(e.name) && seenLower.has(lower) && seenLower.get(lower) !== e.name) {
        findings.push(info("name_collision", rel(join(dir, e.name)), "two files collide under one structural name on a case-sensitive filesystem", e.name, rel(join(dir, e.name))));
      }
      if (isRootName(e.name)) seenLower.set(lower, e.name);
    }

    for (const e of entries) {
      const abs = join(dir, e.name);
      const relPath = rel(abs);

      if (e.isSymbolicLink()) {
        const inScope = e.name.toLowerCase().endsWith(".md") || (!HARD_SKIP_DIRS.has(e.name) && !(e.name.startsWith(".") && !DOT_ALLOW.has(e.name)));
        if (inScope) findings.push(info("symlink", relPath, "symlink encountered; recorded, not traversed", relPath, relPath));
        continue;
      }

      if (e.isDirectory()) {
        if (HARD_SKIP_DIRS.has(e.name)) continue;
        if (e.name.startsWith(".") && !DOT_ALLOW.has(e.name)) continue;
        if (relPath === ".claude/commands") continue;
        // `ignore` matches directory-only patterns (e.g. "coverage/") only
        // against a trailing-slash pathname; a bare dirname misses them.
        if (relPath && ig.ignores(relPath + "/")) continue;
        recurse(abs);
        continue;
      }

      if (!e.isFile()) continue;
      if (!e.name.toLowerCase().endsWith(".md")) continue;
      if (relPath && ig.ignores(relPath)) continue;

      let content: string | null = null;
      try {
        const buf = readFileSync(abs);
        if (looksBinary(buf)) { findings.push(info("skipped", relPath, "file is binary / non-UTF-8; excluded from scoring", "binary", relPath)); filesSkipped++; }
        else content = buf.toString("utf8");
      } catch {
        findings.push(info("skipped", relPath, "file unreadable; excluded from scoring", "unreadable", relPath)); filesSkipped++;
      }
      docs.push({ relPath, absPath: abs, content, isRoot: isRootName(e.name) });
    }
  }

  recurse(root.path);
  docs.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return { docs, findings, filesSkipped };
}
