import { existsSync } from "node:fs";
import { join } from "node:path";
import { extractLinks, classifyLink } from "./links.js";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult, WalkedDoc } from "./walk.js";

export interface GraphResult {
  findings: RawFinding[];
  routedDirs: Set<string>;
  orphanCount: number;
  orphanCandidateTotal: number;   // docs eligible to be orphans (under a routed dir, non-furniture, non-root)
  brokenRefCount: number;
  routingDriftCount: number;
  refsFromRoots: number;          // classified edges existence-checked whose source doc is a root
  refsFromNonRoots: number;       // classified edges existence-checked whose source doc is not a root
}

const FURNITURE = new Set(["readme.md", "changelog.md", "contributing.md", "license.md", "security.md", "code_of_conduct.md"]);
function isFurniture(relPath: string): boolean {
  const base = relPath.split("/").pop()!.toLowerCase();
  return FURNITURE.has(base) || relPath.startsWith(".github/");
}
function f(category: RawFinding["category"], file: string, line: number | null, message: string, evidence: string, discriminator: string): RawFinding {
  return { category, file, line, message, evidence, discriminator };
}

export function buildGraph(root: Root, walkRes: WalkResult): GraphResult {
  const findings: RawFinding[] = [];
  const routedDirs = new Set<string>();
  const docByPath = new Map<string, WalkedDoc>(walkRes.docs.map((d) => [d.relPath, d]));
  const edges = new Map<string, Set<string>>();   // doc -> doc edges (in-scope targets only)
  let refsFromRoots = 0;
  let refsFromNonRoots = 0;

  for (const doc of walkRes.docs) {
    if (doc.content === null) continue;            // unreadable: excluded from scoring
    for (const raw of extractLinks(doc.content)) {
      const link = classifyLink(raw, doc.relPath);
      if (link.kind === "malformed") { findings.push(f("malformed_link", doc.relPath, link.line, "link does not parse", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind === "escapes_root") { findings.push(f("escapes_root", doc.relPath, link.line, "link resolves above root or is absolute; recorded, never read", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind !== "edge" || link.targetPath === null) continue;
      // a real, non-escaping edge: count it against the right denominator population
      if (doc.isRoot) refsFromRoots++; else refsFromNonRoots++;
      const targetAbs = join(root.path, link.targetPath);
      if (!existsSync(targetAbs)) {
        if (doc.isRoot) findings.push(f("routing_drift", doc.relPath, link.line, "routing file points at a path that does not exist", link.targetPath, link.targetPath));
        else findings.push(f("broken_ref", doc.relPath, link.line, "link points at a path that does not exist", link.targetPath, link.targetPath));
        continue;
      }
      // exists: record routed dir + doc->doc edge
      if (docByPath.has(link.targetPath)) {
        if (!edges.has(doc.relPath)) edges.set(doc.relPath, new Set());
        edges.get(doc.relPath)!.add(link.targetPath);
        const parent = link.targetPath.includes("/") ? link.targetPath.slice(0, link.targetPath.lastIndexOf("/")) : "";
        routedDirs.add(parent);
      } else {
        // directory or non-doc file reference
        routedDirs.add(link.targetPath.replace(/\/$/, ""));
        const parent = link.targetPath.includes("/") ? link.targetPath.slice(0, link.targetPath.lastIndexOf("/")) : link.targetPath;
        routedDirs.add(parent);
      }
    }
  }

  // reachability DFS from every root doc
  const roots = walkRes.docs.filter((d) => d.isRoot).map((d) => d.relPath);
  const reached = new Set<string>(roots);
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nxt of edges.get(cur) ?? []) if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
  }

  const underRoutedDir = (relPath: string): boolean => {
    for (const d of routedDirs) { if (d === "" ) { if (!relPath.includes("/")) return true; } else if (relPath === d || relPath.startsWith(d + "/")) return true; }
    return false;
  };

  let orphanCount = 0;
  let orphanCandidateTotal = 0;
  for (const doc of walkRes.docs) {
    if (doc.isRoot || doc.content === null) continue;
    if (isFurniture(doc.relPath)) continue;
    if (!underRoutedDir(doc.relPath)) continue;
    orphanCandidateTotal++;   // eligible to be an orphan: this is the denominator population
    if (!reached.has(doc.relPath)) { findings.push(f("orphan", doc.relPath, null, "in-scope doc unreachable from any routing root", doc.relPath, doc.relPath)); orphanCount++; }
  }

  return {
    findings,
    routedDirs,
    orphanCount,
    orphanCandidateTotal,
    brokenRefCount: findings.filter((x) => x.category === "broken_ref").length,
    routingDriftCount: findings.filter((x) => x.category === "routing_drift").length,
    refsFromRoots,
    refsFromNonRoots,
  };
}
