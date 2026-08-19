import type { Root } from "./types.js";
import { readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

export class RootTargetError extends Error {
  readonly code = "NO_ROUTING_ROOT" as const;
  detail?: string;
  constructor(message: string, detail?: string) { super(message); this.detail = detail; }
}

export function hasStructuralName(basename: string, name: "CLAUDE.md" | "AGENTS.md" | "CONTEXT.md"): boolean {
  return basename.toLowerCase() === name.toLowerCase();
}

function dirHasClaudeMd(dir: string): boolean {
  try {
    return readdirSync(dir).some((n) => hasStructuralName(n, "CLAUDE.md"));
  } catch { return false; }
}

function dirHasGit(dir: string): boolean {
  try { statSync(join(dir, ".git")); return true; } catch { return false; }
}

export function resolveRoot(givenPath: string): Root {
  const abs = resolve(givenPath);
  let st;
  try { st = statSync(abs); } catch { throw new RootTargetError("target path does not exist or is not readable"); }
  if (!st.isDirectory()) throw new RootTargetError("target path is not a directory");

  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasClaudeMd(dir)) return { path: dir, method: "claude_md" };
    if (dir === dirname(dir)) break;
  }
  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasGit(dir)) return { path: dir, method: "git_root" };
    if (dir === dirname(dir)) break;
  }
  return { path: abs, method: "given_path" };
}
