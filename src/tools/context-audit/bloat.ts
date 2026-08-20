import { countTokens } from "./tokens.js";
import { extractLinks } from "./links.js";
import type { RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";

export interface BloatResult { subscore: number | null; n: number; routingTokens: number; findings: RawFinding[]; }

// TODO: TBD-11 — SHAPE resolved (bloat is per-router + per root->leaf chain, NOT a
// flat total across all routers — decision 2026-08-20_tbd-11-bloat-per-router-not-total.md).
// The cutoff NUMBERS below are still unresolved placeholders. char-approx-v1 tokens.
const TBD_11_ROUTER_TOKEN_CUTOFF = 3000;   // a single router heavier than this = load cost to orient here
const TBD_11_CHAIN_TOKEN_CUTOFF  = 6000;   // total tokens along one root->leaf routing chain above this = heavy chain
const TBD_11_CHAIN_DEPTH_CUTOFF  = 4;      // a routing chain longer than this many routers = deep chain
const TBD_11_INLINE_RATIO_CUTOFF = 0.85;   // fraction of non-link chars above this = inlining
const TBD_11_INLINE_MIN_TOKENS   = 200;    // inline-ratio check only fires if tokens exceed this

function low(file: string, message: string, evidence: string, discriminator: string): RawFinding {
  return { category: "bloat", file, line: null, message, evidence, discriminator };
}

// Longest downward path over the router->router DAG (cycle-safe), by token weight
// and by length. A "chain" is one root-to-leaf routing path; its token sum is what
// a reader pays to orient by following it.
function chainMetrics(routerRelPaths: string[], tokensByPath: Map<string, number>, routerEdges: Map<string, Set<string>>): { tokens: number; depth: number } {
  const memoTokens = new Map<string, number>();
  const memoDepth = new Map<string, number>();
  const visiting = new Set<string>();
  function tokensDown(p: string): number {
    const m = memoTokens.get(p); if (m !== undefined) return m;
    if (visiting.has(p)) return 0;   // cycle: contribute nothing further
    visiting.add(p);
    let best = 0;
    for (const c of routerEdges.get(p) ?? []) best = Math.max(best, tokensDown(c));
    visiting.delete(p);
    const res = (tokensByPath.get(p) ?? 0) + best;
    memoTokens.set(p, res);
    return res;
  }
  function depthDown(p: string): number {
    const m = memoDepth.get(p); if (m !== undefined) return m;
    if (visiting.has(p)) return 0;
    visiting.add(p);
    let best = 0;
    for (const c of routerEdges.get(p) ?? []) best = Math.max(best, depthDown(c));
    visiting.delete(p);
    const res = 1 + best;
    memoDepth.set(p, res);
    return res;
  }
  let tokens = 0, depth = 0;
  for (const p of routerRelPaths) { tokens = Math.max(tokens, tokensDown(p)); depth = Math.max(depth, depthDown(p)); }
  return { tokens, depth };
}

export function scoreBloat(walk: WalkResult, routerEdges: Map<string, Set<string>> = new Map()): BloatResult {
  const routers = walk.docs.filter((d) => d.isRoot && d.content !== null);
  const n = routers.length;
  const findings: RawFinding[] = [];
  let routingTokens = 0;   // flat total is reported (stats.routing_tokens) but no longer the penalty basis
  let penalty = 0;
  const tokensByPath = new Map<string, number>();

  for (const r of routers) {
    const content = r.content as string;
    const tks = countTokens(content);
    tokensByPath.set(r.relPath, tks);
    routingTokens += tks;

    // per-router size: a single router that is itself large is bloat (a reader
    // must load all of it to orient here).
    if (tks > TBD_11_ROUTER_TOKEN_CUTOFF) {   // TODO: TBD-11
      findings.push(low(r.relPath, "routing file is large; a reader must load it all to orient here", `router_tokens=${tks}`, "router_token_weight"));
      penalty += Math.min(30, Math.floor((tks - TBD_11_ROUTER_TOKEN_CUTOFF) / 1000) * 5);
    }

    // inline-ratio: mostly prose/tables rather than routing content out.
    const linkChars = extractLinks(content).reduce((a, l) => a + l.targetRaw.length, 0);
    const ratio = content.length === 0 ? 0 : 1 - Math.min(1, linkChars / content.length);
    if (ratio > TBD_11_INLINE_RATIO_CUTOFF && tks > TBD_11_INLINE_MIN_TOKENS) {
      findings.push(low(r.relPath, "routing file is mostly prose/tables; consider routing content out", `inline_ratio=${ratio.toFixed(2)}`, "inline_ratio"));
      penalty += 10;
    }
  }

  // per root->leaf chain: the total a reader pays to follow one routing path.
  const chain = chainMetrics(routers.map((r) => r.relPath), tokensByPath, routerEdges);
  if (chain.tokens > TBD_11_CHAIN_TOKEN_CUTOFF) {   // TODO: TBD-11
    findings.push(low(routers[0]?.relPath ?? "CLAUDE.md", "one routing chain (root to leaf) is heavy to follow", `chain_tokens=${chain.tokens}`, "routing_chain_weight"));
    penalty += Math.min(40, Math.floor((chain.tokens - TBD_11_CHAIN_TOKEN_CUTOFF) / 1000) * 5);
  }
  if (chain.depth > TBD_11_CHAIN_DEPTH_CUTOFF) {   // TODO: TBD-11
    findings.push(low(routers[0]?.relPath ?? "CLAUDE.md", "routing chain is deep (many routers root to leaf)", `chain_depth=${chain.depth}`, "routing_chain_depth"));
    penalty += 5;
  }

  // n === 0: no routing docs measured — not assessed, never a fabricated number.
  const subscore = n === 0 ? null : Math.max(0, 100 - penalty);
  return { subscore, n, routingTokens, findings };
}
