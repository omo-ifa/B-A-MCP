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

// D1 — route-to-directory, nested. Nets a doc iff its NEAREST routing-known
// ancestor — the first ancestor directory in routedDirs, scanning up from the
// immediate parent — is a STRICT ancestor (an intervening subdirectory sits
// between it and the doc) AND a genuine directory-TARGET (in dirTargets).
// Uses BOTH sets on purpose (TBD-19):
//   - routedDirs-only over-nets: a doc nested below a dir that is in routedDirs
//     merely via a file link (Ghost apps/admin, reached via a linked README) was
//     silently netted (the MSW casualty).
//   - dirTargets-only over-nets the OTHER way: dropping the routedDirs guard lets
//     a doc whose nearest routing-known ancestor is a file-parent still match a
//     DISTANT dir-target through intervening file-parent dirs (posthog live PRDs
//     under products/desktop/docs/plans, with products a dir-target 3 levels up).
// routedDirs locates the nearest directory the routing layer touches at all (the
// shield); dirTargets decides whether that nearest ancestor is a real directory
// route. Structural; both failure directions are visible FPs, never silent FNs.
export function isRouteToDirNested(relPath: string, routedDirs: Set<string>, dirTargets: Set<string>): boolean {
  const parent = parentDir(relPath);
  for (const a of ancestorDirs(relPath)) {
    if (routedDirs.has(a)) return a !== parent && dirTargets.has(a);   // nearest routing-known ancestor decides
  }
  return false;   // no routing-known ancestor
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

const DATED_FILENAME = /\d{4}-\d{2}-\d{2}/;        // D4a: a full ISO-ish date anywhere in the path
const VERSION_BASENAME = /^v?\d+\.\d+(\.\d+)+$/;   // D4b: a full-semver basename (>=2 dots), e.g. 1.4.1, 6.1.0, v2.0.0

// D4 — tight dated/versioned archival. BOTH sub-rules are STRUCTURAL (self-evident
// from the filename), never a directory-name convention. D4a: a dated filename.
// D4b: a version-shaped basename (a released-version artifact by self-evidence,
// e.g. CHANGELOG/1.4.1.md) — the successor to the dropped plans/ and CHANGELOG/
// DIRECTORY-segment rules, which were a convention guess and a confirmed silent-FN
// vector (live PRDs under plans/, TBD-20). Ambiguous two-part forms (v2, 2.0) do
// NOT net -> counted, the safe direction. Bare docs/** is still NOT netted (spec §4
// gap). The close-condition re-validation checks the D4b version-shape nets
// individually (spec §6.2).
export function isTightDatedArchival(relPath: string): boolean {
  if (DATED_FILENAME.test(relPath)) return true;                       // D4a
  const base = relPath.split("/").pop()!.replace(/\.md$/i, "");        // basename without the .md extension
  if (VERSION_BASENAME.test(base)) return true;                       // D4b
  return false;
}

// D5 — component-manifest (registry-glob shape). A DESCRIPTION.md is registry
// content iff its parent dir carries BOTH a config.json and a description.md AND is
// one of >=3 sibling dirs (same grandparent) that each do — the visible artifact of
// a registry glob, never a path prefix (TBD-14 Ruling 2). configDirs is walk-supplied
// because walk collects .md only, so config.json is otherwise invisible.
export function computeManifestDirs(configDirs: Set<string>, docRelPaths: string[]): Set<string> {
  const descDirs = new Set<string>();
  for (const p of docRelPaths) {
    if (p.split("/").pop()!.toLowerCase() === "description.md") descDirs.add(parentDir(p));
  }
  // candidate = a dir that has BOTH a config.json and a description.md (never the repo root)
  const byGrand = new Map<string, string[]>();
  for (const d of descDirs) {
    if (d === "" || !configDirs.has(d)) continue;
    const g = parentDir(d);
    let arr = byGrand.get(g);
    if (!arr) { arr = []; byGrand.set(g, arr); }
    arr.push(d);
  }
  const qualifying = new Set<string>();
  for (const group of byGrand.values()) if (group.length >= 3) for (const d of group) qualifying.add(d);
  return qualifying;
}

export function isComponentManifest(relPath: string, manifestDirs: Set<string>): boolean {
  return relPath.split("/").pop()!.toLowerCase() === "description.md" && manifestDirs.has(parentDir(relPath));
}

// D1 needs BOTH the broad routedDirs (to find the nearest routing-known ancestor)
// and dirTargets (to test whether it is a real directory route) — TBD-19.
export interface AcceptedLayoutCtx { routedDirs: Set<string>; dirTargets: Set<string>; skillDirs: Set<string>; manifestDirs: Set<string>; }

// Any tight detector firing => the doc is accepted layout, not genuine-abandoned
// rot, so it is excluded from the orphans sub-score numerator (still a finding).
export function isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean {
  return isRouteToDirNested(relPath, ctx.routedDirs, ctx.dirTargets)
    || isSkillDiscovered(relPath, ctx.skillDirs)
    || isAgentRuntimeConfig(relPath)
    || isTightDatedArchival(relPath)
    || isComponentManifest(relPath, ctx.manifestDirs);
}
