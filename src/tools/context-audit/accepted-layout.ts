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

// D1 — route-to-directory, nested. The doc is under a routed directory but not
// DIRECTLY in one (an intervening subdirectory). Structural fact; no silent-FN.
export function isRouteToDirNested(relPath: string, routedDirs: Set<string>): boolean {
  const parent = parentDir(relPath);
  if (routedDirs.has(parent)) return false;               // directly in a routed dir -> not nested
  for (const a of ancestorDirs(relPath)) if (a !== parent && routedDirs.has(a)) return true;
  return false;
}
