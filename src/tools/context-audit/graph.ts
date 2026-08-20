import { existsSync, statSync } from "node:fs";
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
  resolvedRefsFromRoots: number;  // subset of refsFromRoots that resolve to an existing path — the routing basis
  routerEdges: Map<string, Set<string>>;   // isRoot -> isRoot resolved edges: the routing DAG (for bloat's root->leaf chains)
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
  let resolvedRefsFromRoots = 0;

  // shared: a resolving edge (markdown or backtick) records its routed dir and,
  // for in-scope doc targets, a doc->doc edge for reachability.
  const recordResolvedTarget = (srcRel: string, targetPath: string, targetAbs: string): void => {
    if (docByPath.has(targetPath)) {
      if (!edges.has(srcRel)) edges.set(srcRel, new Set());
      edges.get(srcRel)!.add(targetPath);
      const parent = targetPath.includes("/") ? targetPath.slice(0, targetPath.lastIndexOf("/")) : "";
      routedDirs.add(parent);
    } else {
      // exists but is not an in-scope doc: a directory, or a non-doc file
      let isDir = false;
      try { isDir = statSync(targetAbs).isDirectory(); } catch { isDir = false; }
      if (isDir) {
        const d = targetPath.replace(/\/$/, "");
        routedDirs.add(d === "." ? "" : d);                 // directory target: the dir itself (normalize "." -> "")
      } else {
        const parent = targetPath.includes("/") ? targetPath.slice(0, targetPath.lastIndexOf("/")) : "";
        routedDirs.add(parent);                              // non-doc file target: its parent dir
      }
    }
  };

  for (const doc of walkRes.docs) {
    if (doc.content === null) continue;            // unreadable: excluded from scoring
    for (const raw of extractLinks(doc.content)) {
      const link = classifyLink(raw, doc.relPath);

      if (raw.source === "backtick") {
        // Backtick routing is a ROUTER convention (the census found routers route
        // via backtick code-spans). In a non-root content doc a backtick path is a
        // prose citation, not a link — counting it would inflate broken_refs'
        // denominator with citations. So backtick edges are recognized only from
        // router docs (isRoot); non-root docs still link via markdown as before.
        if (!doc.isRoot) continue;
        // Resolve-only: a path-shaped span is an edge ONLY if it resolves to an
        // existing in-repo path; a non-resolving span is prose, never a
        // malformed/escapes/broken_ref/routing_drift finding. Try
        // BOTH doc-relative and root-relative resolution: markdown links are
        // doc-relative by spec, but backtick code-span paths are written
        // root-relative in the wild (e.g. src/CONTEXT.md referencing `src/API.md`).
        // Count the span at most once (doc-relative preferred).
        const rootRel = classifyLink(raw, "");   // as if the doc sat at the repo root
        const cands = [link, rootRel];
        let resolved = false;
        for (const cand of cands) {
          if (cand.kind !== "edge" || cand.targetPath === null) continue;
          const targetAbs = join(root.path, cand.targetPath);
          if (!existsSync(targetAbs)) continue;
          refsFromRoots++; resolvedRefsFromRoots++;   // doc.isRoot guaranteed above
          recordResolvedTarget(doc.relPath, cand.targetPath, targetAbs);
          resolved = true;
          break;   // count the span at most once
        }
        if (resolved) continue;
        // Router-path drift (decision 2026-08-20_router-path-drift.md): a path-shaped
        // backtick in a ROUTER that resolves to nothing is a broken route, not prose.
        // Count it toward routing_drift's denominator and flag it under its own
        // category so unresolvable router paths tally separately from broken
        // markdown links. Only in-repo relative candidates (kind "edge") qualify —
        // escapes-root / external spans are not routes.
        const missing = cands.find((c) => c.kind === "edge" && c.targetPath !== null);
        if (missing) {
          refsFromRoots++;
          findings.push(f("routing_path_missing", doc.relPath, missing.line, "router path does not resolve to an existing file", missing.targetPath!, missing.targetPath!));
        }
        continue;
      }

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
      // exists: a resolving edge from this doc
      if (doc.isRoot) resolvedRefsFromRoots++;
      recordResolvedTarget(doc.relPath, link.targetPath, targetAbs);
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

  // Orphans guard: "orphan" means "unreachable from a routing root". When the
  // routing layer resolves NO edges from any root (resolvedRefsFromRoots === 0),
  // reachability is vacuous — every doc looks unreachable — so orphans is not
  // assessed at all (n=0 -> null), rather than fabricating a confident wave of
  // false orphans. routedDirs may still be non-empty via non-root cross-links;
  // that is exactly the trap this guard closes.
  let orphanCount = 0;
  let orphanCandidateTotal = 0;
  if (resolvedRefsFromRoots > 0) {
    for (const doc of walkRes.docs) {
      if (doc.isRoot || doc.content === null) continue;
      if (isFurniture(doc.relPath)) continue;
      if (!underRoutedDir(doc.relPath)) continue;
      orphanCandidateTotal++;   // eligible to be an orphan: this is the denominator population
      if (!reached.has(doc.relPath)) { findings.push(f("orphan", doc.relPath, null, "in-scope doc unreachable from any routing root", doc.relPath, doc.relPath)); orphanCount++; }
    }
  }

  // router->router adjacency: the subset of resolved doc edges where both endpoints
  // are routers (isRoot). This is the routing DAG bloat walks for root->leaf chains.
  const routerEdges = new Map<string, Set<string>>();
  for (const [src, tgts] of edges) {
    if (!docByPath.get(src)?.isRoot) continue;
    for (const t of tgts) {
      if (!docByPath.get(t)?.isRoot) continue;
      if (!routerEdges.has(src)) routerEdges.set(src, new Set());
      routerEdges.get(src)!.add(t);
    }
  }

  return {
    findings,
    routedDirs,
    orphanCount,
    orphanCandidateTotal,
    brokenRefCount: findings.filter((x) => x.category === "broken_ref").length,
    // drift = broken router markdown links + unresolvable path-shaped router backticks
    routingDriftCount: findings.filter((x) => x.category === "routing_drift" || x.category === "routing_path_missing").length,
    refsFromRoots,
    refsFromNonRoots,
    resolvedRefsFromRoots,
    routerEdges,
  };
}
