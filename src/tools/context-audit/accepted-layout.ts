// src/tools/context-audit/accepted-layout.ts
// Detects the TBD-14 accepted-layout classes for a doc, deterministically, at
// scoring time. Pure functions over already-computed structures — they classify
// the post-TBD-14 orphan set and never recompute reachability. Any detector
// firing means "not genuine-abandoned rot", so the doc is excluded from the
// orphans sub-score numerator (it stays a candidate and a finding — see graph.ts).

export function parentDir(relPath: string): string {
  const i = relPath.lastIndexOf("/");
  return i < 0 ? "" : relPath.slice(0, i);
}

// All directory ancestors of a doc, immediate parent first, up to "" (repo root).
// "a/b/c.md" -> ["a/b", "a", ""].
function ancestorDirs(relPath: string): string[] {
  const out: string[] = [];
  let d = parentDir(relPath);
  while (true) { out.push(d); if (d === "") break; d = parentDir(d); }
  return out;
}

// D1 — route-to-directory, nested. The doc is under a routed DIRECTORY-TARGET but
// not DIRECTLY in one (an intervening subdirectory). Keys on dirTargets — the
// directories routed AS a directory — NOT the broader routedDirs, which also holds
// file-parent and root "" entries and would silently net genuine rot (TBD-19: the
// Ghost apps/admin/.../MSW_USAGE_GUIDE.md was netted because apps/admin sat in
// routedDirs via a file link). Structural fact over the correct set; no silent-FN.
export function isRouteToDirNested(relPath: string, dirTargets: Set<string>): boolean {
  const parent = parentDir(relPath);
  if (dirTargets.has(parent)) return false;               // directly in a directory-target -> not nested
  for (const a of ancestorDirs(relPath)) if (a !== parent && dirTargets.has(a)) return true;
  return false;
}

// D2 — skill-discovery. Build the set of directories that directly contain a
// SKILL.md; a doc is skill-discovered if any ancestor directory is such a dir.
// Reuses ancestorDirs (Task 1) — immediate parent first, up to "" (root).
export function computeSkillDirs(docRelPaths: string[]): Set<string> {
  const s = new Set<string>();
  for (const p of docRelPaths) {
    if (p.split("/").pop()!.toLowerCase() === "skill.md") {
      const d = parentDir(p);
      if (d !== "") s.add(d);   // a ROOT-level SKILL.md ("" parent) would match every doc via ancestorDirs -> silent-FN; exclude it (design spine: fail visible, not silent)
    }
  }
  return s;
}

export function isSkillDiscovered(relPath: string, skillDirs: Set<string>): boolean {
  for (const a of ancestorDirs(relPath)) if (skillDirs.has(a)) return true;
  return false;
}

// D3 — agent-runtime config. Path-recognition is sanctioned for THIS class by the
// TBD-14 ruling (unlike test fixtures). .claude/commands is hard-skipped by the
// walk, so it never reaches here; the rest of .claude/** is runtime config.
export function isAgentRuntimeConfig(relPath: string): boolean {
  const segs = relPath.split("/");
  if (segs[0] === ".claude") return true;
  if (relPath === "WARP.md") return true;
  if (segs.includes("cursor-hooks")) return true;
  return false;
}

const DATED_FILENAME = /\d{4}-\d{2}-\d{2}/;   // D4a: a full ISO-ish date anywhere in the path

// D4 — tight dated-archival. D4a (dated filename) is structurally tight. D4b
// (plans/ or CHANGELOG/ DIRECTORY segment) is convention tight — the close-
// condition re-validation checks D4b nets individually (spec §6.2). Bare docs/**
// is deliberately NOT netted (spec §4 gap).
export function isTightDatedArchival(relPath: string): boolean {
  if (DATED_FILENAME.test(relPath)) return true;                       // D4a
  const dirSegs = relPath.split("/").slice(0, -1);                     // directory segments only (exclude the filename)
  if (dirSegs.includes("plans")) return true;                         // D4b
  if (dirSegs.includes("CHANGELOG")) return true;                     // D4b
  return false;
}

// D1 is the only consumer of the directory-route field, so the context carries
// dirTargets (TBD-19), not the broader routedDirs.
export interface AcceptedLayoutCtx { dirTargets: Set<string>; skillDirs: Set<string>; }

// Any tight detector firing => the doc is accepted layout, not genuine-abandoned
// rot, so it is excluded from the orphans sub-score numerator (still a finding).
export function isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean {
  return isRouteToDirNested(relPath, ctx.dirTargets)
    || isSkillDiscovered(relPath, ctx.skillDirs)
    || isAgentRuntimeConfig(relPath)
    || isTightDatedArchival(relPath);
}
