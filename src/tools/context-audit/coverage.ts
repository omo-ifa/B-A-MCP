import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";
import type { GraphResult } from "./graph.js";

export interface CoverageResult { subscore: number | null; findings: RawFinding[]; }

const HARD_SKIP = new Set(["node_modules", "dist", "build", "vendor", ".venv", "target", ".git"]);

// TODO: TBD-12 — significance classification + thresholds are stubbed; calibrate from the first dogfood run.
const TBD_12_MIN_FILES = 5;                 // "significant" = at least this many files
const TBD_12_SOURCE_EXTS = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".rb"]; // provisional

function listDirs(rootPath: string): { rel: string; fileCount: number; hasContext: boolean }[] {
  const out: { rel: string; fileCount: number; hasContext: boolean }[] = [];
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
      if (e.isDirectory() && !e.isSymbolicLink() && !HARD_SKIP.has(e.name) && !(e.name.startsWith(".") && e.name !== ".github")) rec(join(abs, e.name));
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

  if (dirs.length === 0) return { subscore: noClaudeRoot ? 0 : null, findings };

  let covered = 0;
  for (const d of dirs) {
    const isCovered = d.hasContext || graph.routedDirs.has(d.rel) || [...graph.routedDirs].some((r) => r !== "" && d.rel.startsWith(r + "/"));
    if (isCovered) { covered++; continue; }
    // uncovered significant workspace -> HIGH, gated behind TBD-12 build guard
    if (opts?.emitHighFindings) {   // TODO: TBD-12 — do not enable until calibrated
      findings.push({ category: "coverage", file: d.rel + "/", line: null, message: "significant source directory has no routing coverage", evidence: `files=${d.fileCount}`, discriminator: d.rel + "/" });
    }
  }
  const subscore = noClaudeRoot ? 0 : Math.round((covered / dirs.length) * 100);
  return { subscore, findings };
}
