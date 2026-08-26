import { countTokens } from "./tokens.js";
import type { RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";

export interface BloatResult { subscore: number | null; n: number; routingTokens: number; findings: RawFinding[]; }

// TBD-11 RESOLVED — shape (#41) and cutoff numbers (run-7 2026-08-26) both decided.
// Bloat is the cost to orient on ONE path, not how many routers a repo has:
//  - per-router + per root->leaf chain metric (2026-08-20_tbd-11-bloat-per-router-not-total.md).
//  - WORST-CASE aggregation, never a flat sum over routers, so router COUNT cannot drive the
//    score (2026-08-26_tbd-11-bloat-worst-case-aggregation.md). The two TOKEN terms MAX-combine
//    (the heaviest router usually sits on the worst chain — summing double-counts); DEPTH is a
//    separate axis (hops, not tokens) and ADDS. inline_ratio was dropped there (broken by
//    construction — "mostly prose + a few paths" describes what a router IS).
// Cutoff NUMBERS RATIFIED 2026-08-26 from calibration run-7 (char-approx-v1 tokens):
// planning/decisions/2026-08-26_tbd-11-tbd-12-cutoff-numbers-ratified.md,
// evidence planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md §2.
const TBD_11_ROUTER_TOKEN_CUTOFF = 3000;   // RATIFIED: score-neutral in-sample (no repo's heaviest router in the 3000-4000 band); reference router (2211) below, genuine bloat (8k-22k) above.
const TBD_11_CHAIN_TOKEN_CUTOFF  = 6000;   // RATIFIED: sits in a clean natural gap in worst-chain tokens (2211 -> [gap] -> 7437).
const TBD_11_CHAIN_DEPTH_CUTOFF  = 4;      // KEPT, flagged UNDER-DETERMINED: only one corpus obs exceeds it (posthog depth 5); zero obs at depth 3-4, so the corpus cannot distinguish 3/4/5. Revisit only if a deeper corpus lands.

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
  let routingTokens = 0;   // flat total is reported (stats.routing_tokens) but is NOT the penalty basis
  const tokensByPath = new Map<string, number>();

  // Per-router size penalty is taken WORST-CASE over routers (max), never summed — adding more
  // routers must not lower the score. Every breaching router still emits a finding (transparency;
  // visible FP > silent FN), but only the heaviest one contributes to the sub-score.
  let maxRouterTerm = 0;

  for (const r of routers) {
    const content = r.content as string;
    const tks = countTokens(content);
    tokensByPath.set(r.relPath, tks);
    routingTokens += tks;

    // per-router size: a single router that is itself large is bloat (a reader
    // must load all of it to orient here).
    if (tks > TBD_11_ROUTER_TOKEN_CUTOFF) {   // TBD-11 ratified (run-7)
      findings.push(low(r.relPath, "routing file is large; a reader must load it all to orient here", `router_tokens=${tks}`, "router_token_weight"));
      maxRouterTerm = Math.max(maxRouterTerm, Math.min(30, Math.floor((tks - TBD_11_ROUTER_TOKEN_CUTOFF) / 1000) * 5));
    }
  }

  // per root->leaf chain: the total a reader pays to follow one routing path.
  const chain = chainMetrics(routers.map((r) => r.relPath), tokensByPath, routerEdges);
  let chainTokenTerm = 0;
  if (chain.tokens > TBD_11_CHAIN_TOKEN_CUTOFF) {   // TBD-11 ratified (run-7)
    findings.push(low(routers[0]?.relPath ?? "CLAUDE.md", "one routing chain (root to leaf) is heavy to follow", `chain_tokens=${chain.tokens}`, "routing_chain_weight"));
    chainTokenTerm = Math.min(40, Math.floor((chain.tokens - TBD_11_CHAIN_TOKEN_CUTOFF) / 1000) * 5);
  }
  let chainDepthTerm = 0;
  if (chain.depth > TBD_11_CHAIN_DEPTH_CUTOFF) {   // TBD-11 depth: kept 4, under-determined (see constant)
    findings.push(low(routers[0]?.relPath ?? "CLAUDE.md", "routing chain is deep (many routers root to leaf)", `chain_depth=${chain.depth}`, "routing_chain_depth"));
    chainDepthTerm = 5;
  }

  // Worst-case aggregation (2026-08-26 ruling): the chain-token term and the single-router-token
  // term describe the SAME worst path, so they MAX-combine (summing double-counts the heaviest
  // router, which usually sits on the worst chain). DEPTH is a separate axis (files to open, not
  // tokens) and ADDS on top. The single-router term only tops up when a lone router's own weight
  // exceeds what the chain already captured (the mid-chain-giant case).
  const penalty = Math.max(chainTokenTerm, maxRouterTerm) + chainDepthTerm;

  // n === 0: no routing docs measured — not assessed, never a fabricated number.
  const subscore = n === 0 ? null : Math.max(0, 100 - penalty);
  return { subscore, n, routingTokens, findings };
}
