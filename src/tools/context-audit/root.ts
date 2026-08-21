import type { Root } from "./types.js";
import { readdirSync, statSync, accessSync, constants } from "node:fs";
import { resolve, dirname, join } from "node:path";

export class RootTargetError extends Error {
  readonly code = "NO_ROUTING_ROOT" as const;
  detail?: string;
  constructor(message: string, detail?: string) { super(message); this.detail = detail; }
}

export function hasStructuralName(basename: string, name: "CLAUDE.md" | "AGENTS.md" | "CONTEXT.md"): boolean {
  return basename.toLowerCase() === name.toLowerCase();
}

function dirHasRootRouter(dir: string): boolean {
  // Root anchoring recognizes CLAUDE.md OR AGENTS.md (NOT CONTEXT.md — the
  // root anchor stays the top-level agent-instructions file). readdirSync
  // returns the entry name regardless of symlink status, so a CLAUDE.md that
  // is a symlink to AGENTS.md still anchors here by name.
  try {
    return readdirSync(dir).some((n) => hasStructuralName(n, "CLAUDE.md") || hasStructuralName(n, "AGENTS.md"));
  } catch { return false; }
}

function dirHasGit(dir: string): boolean {
  try { statSync(join(dir, ".git")); return true; } catch { return false; }
}

export function resolveRoot(givenPath: string): Root {
  const abs = resolve(givenPath);
  let st;
  try { st = statSync(abs); } catch { throw new RootTargetError("target path does not exist or is not readable", "not_found"); }
  if (!st.isDirectory()) throw new RootTargetError("target path is not a directory", "not_a_directory");

  try { accessSync(abs, constants.R_OK); } catch { throw new RootTargetError("target directory is not readable", "not_readable"); }

  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasRootRouter(dir)) return { path: dir, method: "claude_md" };
    if (dir === dirname(dir)) break;
  }
  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasGit(dir)) return { path: dir, method: "git_root" };
    if (dir === dirname(dir)) break;
  }
  return { path: abs, method: "given_path" };
}
