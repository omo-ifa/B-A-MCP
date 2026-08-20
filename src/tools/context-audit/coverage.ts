import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ignore from "ignore";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";
import type { GraphResult } from "./graph.js";

export interface CoverageResult { subscore: number | null; n: number; findings: RawFinding[]; }

const HARD_SKIP = new Set(["node_modules", "dist", "build", "vendor", ".venv", "target", ".git"]);
// Kept identical to walk.ts's DOT_ALLOW — coverage's directory traversal must
// scope-match walk's, or a gitignored/dot-excluded significant dir becomes
// invisible to walk/graph but still counted (and flagged) by coverage.
const DOT_ALLOW = new Set([".claude", ".github"]);

// TODO: TBD-12 — significance classification + thresholds are stubbed; calibrate from the first dogfood run.
const TBD_12_MIN_FILES = 5;                 // "significant" = at least this many files
const TBD_12_SOURCE_EXTS = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".rb"]; // provisional

function listDirs(rootPath: string): { rel: string; fileCount: number; hasContext: boolean }[] {
  const out: { rel: string; fileCount: number; hasContext: boolean }[] = [];

  // Mirror walk.ts: load the root .gitignore so a gitignored directory is
  // excluded from coverage's scope exactly as it is excluded from walk's.
  const ig = ignore();
  const giPath = join(rootPath, ".gitignore");
  if (existsSync(giPath)) { try { ig.add(readFileSync(giPath, "utf8")); } catch { /* unreadable .gitignore: ignore */ } }

  function rec(abs: string): void {
    let entries;
    try { entries = readdirSync(abs, { withFileTypes: true }); } catch { return; }
    let fileCount = 0; let hasContext = false;
    for (const e of entries) {
      if (e.isFile()) {
        fileCount++;
        if (e.name.toLowerCase() === "context.md") hasContext = true;
      }
    }
    const rel = relative(rootPath, abs).split(sep).join("/");
    if (rel !== "") out.push({ rel, fileCount, hasContext });
    for (const e of entries) {
      if (!e.isDirectory() || e.isSymbolicLink()) continue;
      if (HARD_SKIP.has(e.name)) continue;
      if (e.name.startsWith(".") && !DOT_ALLOW.has(e.name)) continue;
      const childRel = rel === "" ? e.name : rel + "/" + e.name;
      if (childRel === ".claude/commands") continue;
      // `ignore` matches directory-only patterns (e.g. "coverage/") only
      // against a trailing-slash pathname; a bare dirname misses them.
      if (ig.ignores(childRel + "/")) continue;
      rec(join(abs, e.name));
    }
  }
  rec(rootPath);
  return out;
}

function isSignificant(dir: { rel: string; fileCount: number }, rootPath: string): boolean {
  // TODO: TBD-12 — provisional: a directory with >= MIN_FILES source files.
  try {
    const src = readdirSync(join(rootPath, dir.rel), { withFileTypes: true })
      .filter((e) => e.isFile() && TBD_12_SOURCE_EXTS.some((x) => e.name.toLowerCase().endsWith(x))).length;
    return src >= TBD_12_MIN_FILES;
  } catch { return false; }
}

export function scoreCoverage(root: Root, _walk: WalkResult, graph: GraphResult, opts?: { emitHighFindings?: boolean }): CoverageResult {
  const noClaudeRoot = root.method !== "claude_md";
  const dirs = listDirs(root.path).filter((d) => isSignificant(d, root.path));
  const findings: RawFinding[] = [];

  // n = dirs.length (significant directories judged). n === 0: nothing to
  // judge -> not assessed -> null, regardless of root method (never a
  // fabricated 0 or 100 for an empty population).
  if (dirs.length === 0) return { subscore: null, n: 0, findings };

  let covered = 0;
  for (const d of dirs) {
    const isCovered = d.hasContext || graph.routedDirs.has(d.rel) || [...graph.routedDirs].some((r) => r !== "" && d.rel.startsWith(r + "/"));
    if (isCovered) { covered++; continue; }
    // uncovered significant workspace -> HIGH, gated behind TBD-12 build guard
    if (opts?.emitHighFindings) {   // TODO: TBD-12 — do not enable until calibrated
      findings.push({ category: "coverage", file: d.rel + "/", line: null, message: "significant source directory has no routing coverage", evidence: `files=${d.fileCount}`, discriminator: d.rel + "/" });
    }
  }
  // dirs.length > 0 here: this is a real assessed result even when it floors
  // to 0 (no CLAUDE.md root, or a CLAUDE.md root that covers nothing) — not
  // an empty-denominator artifact.
  const subscore = noClaudeRoot ? 0 : Math.round((covered / dirs.length) * 100);
  return { subscore, n: dirs.length, findings };
}
