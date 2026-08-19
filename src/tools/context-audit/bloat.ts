import { countTokens } from "./tokens.js";
import { extractLinks } from "./links.js";
import type { RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";

export interface BloatResult { subscore: number; routingTokens: number; findings: RawFinding[]; }

// TODO: TBD-11 — placeholder cutoffs; calibrate from the first dogfood run.
// These are NOT resolved thresholds. char-approx-v1 tokens.
const TBD_11_ROUTING_TOKEN_CUTOFF = 4000;   // routing weight above this starts penalizing
const TBD_11_INLINE_RATIO_CUTOFF = 0.85;    // fraction of non-link chars above this = inlining
const TBD_11_DEPTH_CUTOFF = 4;              // routing nesting depth above this = deep chain

function low(file: string, message: string, evidence: string, discriminator: string): RawFinding {
  return { category: "bloat", file, line: null, message, evidence, discriminator };
}

export function scoreBloat(walk: WalkResult): BloatResult {
  const routers = walk.docs.filter((d) => d.isRoot && d.content !== null);
  const findings: RawFinding[] = [];
  let routingTokens = 0;
  let penalty = 0;

  for (const r of routers) {
    const content = r.content as string;
    const tks = countTokens(content);
    routingTokens += tks;

    const linkChars = extractLinks(content).reduce((n, l) => n + l.targetRaw.length, 0);
    const ratio = content.length === 0 ? 0 : 1 - Math.min(1, linkChars / content.length);
    if (ratio > TBD_11_INLINE_RATIO_CUTOFF && tks > 200) {   // TODO: TBD-11
      findings.push(low(r.relPath, "routing file is mostly prose/tables; consider routing content out", `inline_ratio=${ratio.toFixed(2)}`, "inline_ratio"));
      penalty += 10;
    }
    const depth = r.relPath.split("/").length - 1;
    if (depth > TBD_11_DEPTH_CUTOFF) {                        // TODO: TBD-11
      findings.push(low(r.relPath, "deep routing chain", `depth=${depth}`, "routing_chain_depth"));
      penalty += 5;
    }
  }
  if (routingTokens > TBD_11_ROUTING_TOKEN_CUTOFF) {         // TODO: TBD-11
    findings.push(low("CLAUDE.md", "total routing token weight is high", `routing_tokens=${routingTokens}`, "routing_token_weight"));
    penalty += Math.min(40, Math.floor((routingTokens - TBD_11_ROUTING_TOKEN_CUTOFF) / 1000) * 5);
  }

  const subscore = Math.max(0, 100 - penalty);
  return { subscore, routingTokens, findings };
}
