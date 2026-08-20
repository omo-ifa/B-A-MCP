import { resolveRoot, RootTargetError } from "./root.js";
import { walk } from "./walk.js";
import { buildGraph } from "./graph.js";
import { scoreBloat } from "./bloat.js";
import { scoreCoverage } from "./coverage.js";
import { normalizeFindings, subscoreFromCount, headlineScore } from "./score.js";
import { renderAudit } from "./render.js";
import { TOKEN_METHOD } from "./tokens.js";
import type { AuditResult, RawFinding, Subscores } from "./types.js";

export const contextAuditTool = {
  name: "context_audit" as const,
  description:
    "Audit this repo's CLAUDE.md/CONTEXT.md routing layer. Reads your real files locally (never writes, never reads source contents) and returns a scored, unfakeable diagnosis of routing bloat, orphan docs, broken references, routing drift, and coverage gaps. Point it at a path or let it default to the working directory.",
  inputSchema: {
    type: "object",
    properties: { path: { type: "string", description: "Directory to audit; defaults to the server working directory." } },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["root", "score", "subscores", "findings", "stats", "rendered"],
    properties: {
      root: { type: "object", required: ["path", "method"], properties: { path: { type: "string" }, method: { enum: ["claude_md", "git_root", "given_path"] } } },
      score: { type: ["number", "null"] },
      subscores: { type: "object" },
      findings: { type: "array", items: { type: "object" } },
      stats: { type: "object" },
      rendered: { type: "string" },
    },
    additionalProperties: false,
  },
};

type Outcome =
  | { ok: true; result: AuditResult }
  | { ok: false; error: { code: string; message: string; detail?: string } };

export async function runContextAudit(args: { path?: string }): Promise<Outcome> {
  let root;
  try { root = resolveRoot(args.path ?? process.cwd()); }
  catch (e) {
    if (e instanceof RootTargetError) return { ok: false, error: { code: e.code, message: e.message, detail: e.detail } };
    return { ok: false, error: { code: "AUDIT_FAILED", message: "audit could not start" } };
  }

  const w = walk(root);
  const g = buildGraph(root, w);
  const bloat = scoreBloat(w);
  const coverage = scoreCoverage(root, w, g);   // emitHighFindings defaults off (TBD-12 build guard)

  const rawFindings: RawFinding[] = [...w.findings, ...g.findings, ...bloat.findings, ...coverage.findings];

  // root_absent / root_empty (both critical per design §4; §3-vs-§4 severity discrepancy flagged in Global Constraints)
  if (root.method !== "claude_md") {
    rawFindings.push({ category: "root_absent", file: ".", line: null, message: "no root CLAUDE.md anchored this audit", evidence: root.method, discriminator: "root_absent" });
  } else {
    const claudeDoc = w.docs.find((d) => d.relPath.toLowerCase() === "claude.md");
    // "empty" only when the root was actually read; a binary/unreadable root is a `skipped` info finding from the walk, not empty.
    if (claudeDoc && claudeDoc.content !== null && claudeDoc.content.trim() === "") {
      rawFindings.push({ category: "root_empty", file: claudeDoc.relPath, line: null, message: "root CLAUDE.md exists but is empty", evidence: "empty", discriminator: "root_empty" });
    }
  }

  const subscores: Subscores = {
    bloat: { score: bloat.subscore, n: bloat.n },
    // each sub-score's denominator is the population it is drawn from; subscoreFromCount returns null (not assessed) when that population is 0.
    orphans: subscoreFromCount(g.orphanCount, g.orphanCandidateTotal),
    broken_refs: subscoreFromCount(g.brokenRefCount, g.refsFromNonRoots),
    routing_drift: subscoreFromCount(g.routingDriftCount, g.refsFromRoots),
    coverage: { score: coverage.subscore, n: coverage.n },
  };

  const findings = normalizeFindings(rawFindings);
  const score = headlineScore(subscores);
  const stats = {
    docs_in_scope: w.docs.length,
    routing_files: w.docs.filter((d) => d.isRoot).length,
    routing_tokens: bloat.routingTokens,
    orphan_count: g.orphanCount,
    files_skipped: w.filesSkipped,
    token_count_method: TOKEN_METHOD,
    calibrated: false,
  };
  const rendered = renderAudit({ root, score, subscores, findings, stats });
  return { ok: true, result: { root, score, subscores, findings, stats, rendered } };
}

export function toCallToolResult(outcome: Outcome) {
  if (outcome.ok) return { content: [{ type: "text" as const, text: outcome.result.rendered }], structuredContent: outcome.result };
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: outcome.error }) }], isError: true };
}
