import { existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { extractLinks, classifyLink, isRoutingPathShape, isMarkdownPlaceholder, stripDestDelimiter } from "./links.js";
import { isAcceptedLayout, computeSkillDirs } from "./accepted-layout.js";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult, WalkedDoc } from "./walk.js";

export interface GraphResult {
  findings: RawFinding[];
  routedDirs: Set<string>;
  dirTargets: Set<string>;        // flattened union of dirTargetsBySrc values: directories routed AS a directory target (D1's basis, TBD-19). Excludes file-parent and root "" entries that pollute routedDirs.
  orphanCount: number;
  orphanCandidateTotal: number;   // docs eligible to be orphans (under a routed dir, non-furniture, non-root)
  genuineAbandonedCount: number;  // orphans that are NOT accepted-layout: the sub-score numerator (spec TBD-18)
  brokenRefCount: number;
  routingDriftCount: number;
  refsFromRoots: number;          // classified edges existence-checked whose source doc is a root, excluding placeholder spans and tier-2 unanchored references, which sit outside the adjudicable population
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

// Tier 2 — an "unanchored reference": the span resolves under neither base the
// tool can attribute, but a walked document matching it exists inside the
// router's own subtree. Router prose routinely describes a sibling or child
// directory, so the path is real and the base is unknowable. Neither drift nor
// an edge — the tool declines to call it broken and declines to guess.
//
// LOCATION GATE (design §3.1 as amended 2026-08-24): a ROOT-LOCATED router —
// relPath with no "/" — has no proper subtree bound (its subtree is the repo),
// so it gets NO tier 2. This keys on LOCATION, never on isRoot: isRoot means
// "is a router doc" at any depth and already gates this branch, so gating on it
// would make tier 2 never fire.
//
// Searches the already-walked doc set, never the filesystem. Match is >= 1, not
// exactly 1: with no edge created there is nothing to disambiguate.
function isUnanchoredInSubtree(docs: WalkedDoc[], routerRelPath: string, rawTarget: string): boolean {
  const i = routerRelPath.lastIndexOf("/");
  if (i < 0) return false;                       // root-located router: no bound, no tier 2
  const prefix = routerRelPath.slice(0, i + 1);
  const tail = posix.normalize(rawTarget.trim().split("#")[0]);
  if (tail === "" || tail === "." || tail === ".." || tail.startsWith("../") || posix.isAbsolute(tail)) return false;
  return docs.some((d) => d.relPath.startsWith(prefix) && (d.relPath === tail || d.relPath.endsWith("/" + tail)));
}

export function buildGraph(root: Root, walkRes: WalkResult): GraphResult {
  const findings: RawFinding[] = [];
  const routedDirs = new Set<string>();
  const dirTargetsBySrc = new Map<string, Set<string>>();   // source doc relPath -> directory TARGETS it routed (reachability basis; NOT coverage)
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
        const norm = d === "." ? "" : d;
        routedDirs.add(norm);                               // directory target: the dir itself (normalize "." -> "")
        if (!dirTargetsBySrc.has(srcRel)) dirTargetsBySrc.set(srcRel, new Set());
        dirTargetsBySrc.get(srcRel)!.add(norm);             // AND record it under the doc that routed it (root-restricted propagation basis)
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
        // escapes-root / external spans are not routes. And an unresolved span
        // counts as a broken route ONLY if it has the routing-path SHAPE (a plain
        // .md doc path) — a glob, a package scope, an org/repo ref, or a shell/env
        // path is not a route, so it stays prose. (Resolving spans above are routes
        // by existence and need no shape test.)
        const missing = cands.find((c) => c.kind === "edge" && c.targetPath !== null);
        // Tier 2 is checked INSIDE the shape gate, so only .md-shaped spans ever
        // reach the doc-set scan — preserving design §3.1's "always a .md path by
        // construction" guarantee and avoiding an O(docs) scan per prose span.
        if (missing && isRoutingPathShape(raw.targetRaw)
            && !isUnanchoredInSubtree(walkRes.docs, doc.relPath, raw.targetRaw)) {
          refsFromRoots++;
          findings.push(f("routing_path_missing", doc.relPath, missing.line, "router path does not resolve to an existing file", missing.targetPath!, missing.targetPath!));
        }
        continue;
      }

      if (link.kind === "malformed") { findings.push(f("malformed_link", doc.relPath, link.line, "link does not parse", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind === "escapes_root") { findings.push(f("escapes_root", doc.relPath, link.line, "link resolves above root or is absolute; recorded, never read", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind !== "edge" || link.targetPath === null) continue;
      // A template placeholder is not a route in ANY syntax or ANY doc type
      // (design §3.2, ratified global). Narrowed to enumerated placeholder forms
      // (amended 2026-08-25, option C): the broad /[<>{}]/ swallow is gone, so a
      // broken CommonMark <dest> link no longer vanishes silently. Excluded from
      // numerator AND denominator.
      if (isMarkdownPlaceholder(raw.targetRaw)) continue;
      // D1's strip: a fully-wrapped `<path>` delimiter is stripped and its inner
      // adjudicated normally — an existing target resolves as an edge, a broken
      // one still drifts for the right reason. If stripping yields a non-edge
      // (escapes/malformed inner), keep the original link so nothing is silently
      // dropped — it drifts visibly on the literal instead.
      let eff = link;
      const strippedRaw = stripDestDelimiter(raw.targetRaw);
      if (strippedRaw !== raw.targetRaw) {
        const re = classifyLink({ targetRaw: strippedRaw, line: raw.line, malformed: false }, doc.relPath);
        if (re.kind === "edge" && re.targetPath !== null) eff = re;
      }
      // a real, non-escaping edge: count it against the right denominator population
      if (doc.isRoot) refsFromRoots++; else refsFromNonRoots++;
      const targetAbs = join(root.path, eff.targetPath!);
      if (!existsSync(targetAbs)) {
        if (doc.isRoot) findings.push(f("routing_drift", doc.relPath, link.line, "routing file points at a path that does not exist", eff.targetPath!, eff.targetPath!));
        else findings.push(f("broken_ref", doc.relPath, link.line, "link points at a path that does not exist", eff.targetPath!, eff.targetPath!));
        continue;
      }
      // exists: a resolving edge from this doc
      if (doc.isRoot) resolvedRefsFromRoots++;
      recordResolvedTarget(doc.relPath, eff.targetPath!, targetAbs);
    }
  }

  // index of in-scope documents by their parent directory (directory-only
  // propagation basis; reads only the already-walked doc set, no new traversal)
  const docsByParentDir = new Map<string, string[]>();
  for (const d of walkRes.docs) {
    if (d.content === null) continue;
    const parent = d.relPath.includes("/") ? d.relPath.slice(0, d.relPath.lastIndexOf("/")) : "";
    let arr = docsByParentDir.get(parent);
    if (!arr) { arr = []; docsByParentDir.set(parent, arr); }
    arr.push(d.relPath);
  }

  // Flatten the per-source directory-target map into one set — D1's dir-target
  // basis (TBD-19). Strictly the directories some router routed AS a directory,
  // never a file-parent entry. Root "" (from a rare literal `.`/`./` directory
  // route) is filtered OUT here so D1 can never treat the whole repo as one routed
  // directory and net every doc — the "excludes root" invariant holds by
  // construction, not by the rarity of `.` routes. dirTargetsBySrc itself keeps ""
  // (its reachability use is unaffected). Computed unconditionally so it is
  // returned even when the orphan guard skips scoring.
  const dirTargets = new Set<string>();
  for (const set of dirTargetsBySrc.values()) for (const d of set) if (d !== "") dirTargets.add(d);

  // reachability DFS from every root doc
  const roots = walkRes.docs.filter((d) => d.isRoot).map((d) => d.relPath);
  const reached = new Set<string>(roots);
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop()!;
    // document edges (unchanged)
    for (const nxt of edges.get(cur) ?? []) if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
    // directory-target edges (design 2026-08-25 §3.1–§3.2, root-restricted by
    // construction: only a REACHED `cur` reaches this line). A directory routed
    // by cur makes the documents DIRECTLY inside it reachable — DIRECTORY-ONLY
    // depth: a doc in a SUBDIRECTORY is not reached (the visible-FP-never-silent-
    // FN boundary). Pushing them means a doc reached via a directory route can
    // in turn propagate its own directory routes (naturally transitive).
    for (const d of dirTargetsBySrc.get(cur) ?? []) {
      for (const doc of docsByParentDir.get(d) ?? []) if (!reached.has(doc)) { reached.add(doc); stack.push(doc); }
    }
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
  let genuineAbandonedCount = 0;
  if (resolvedRefsFromRoots > 0) {
    const skillDirs = computeSkillDirs(walkRes.docs.filter((d) => d.content !== null).map((d) => d.relPath));
    for (const doc of walkRes.docs) {
      if (doc.isRoot || doc.content === null) continue;
      if (isFurniture(doc.relPath)) continue;
      if (!underRoutedDir(doc.relPath)) continue;
      orphanCandidateTotal++;   // eligible to be an orphan: this is the denominator population
      if (!reached.has(doc.relPath)) {
        findings.push(f("orphan", doc.relPath, null, "in-scope doc unreachable from any routing root", doc.relPath, doc.relPath));
        orphanCount++;
        if (!isAcceptedLayout(doc.relPath, { routedDirs, dirTargets, skillDirs })) genuineAbandonedCount++;
      }
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
    dirTargets,
    orphanCount,
    orphanCandidateTotal,
    genuineAbandonedCount,
    brokenRefCount: findings.filter((x) => x.category === "broken_ref").length,
    // drift = broken router markdown links + unresolvable path-shaped router backticks
    routingDriftCount: findings.filter((x) => x.category === "routing_drift" || x.category === "routing_path_missing").length,
    refsFromRoots,
    refsFromNonRoots,
    resolvedRefsFromRoots,
    routerEdges,
  };
}
