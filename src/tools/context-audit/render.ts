import type { AuditResult, Severity } from "./types.js";

const ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function renderAudit(result: Omit<AuditResult, "rendered">): string {
  const { root, score, subscores, findings, stats } = result;
  const lines: string[] = [];
  lines.push(`# context_audit — routing health`);
  lines.push("");
  const scoreText = score === null ? "not assessed" : `${score}/100`;
  lines.push(`**Score:** ${scoreText}${stats.calibrated ? "" : "  _(uncalibrated — score thresholds not yet finalized; not a published figure)_"}`);
  lines.push(`**Root:** \`${root.path}\` (resolved via \`${root.method}\`)`);
  if (root.method !== "claude_md") lines.push(`> Weaker claim: no root \`CLAUDE.md\` anchored this audit; resolved via \`${root.method}\`.`);
  lines.push("");
  lines.push(`| sub-score | value |`);
  lines.push(`|---|---|`);
  for (const [k, v] of Object.entries(subscores)) {
    lines.push(`| ${k} | ${v.score === null ? `not assessed (n=${v.n})` : `${v.score} (n=${v.n})`} |`);
  }
  lines.push("");
  for (const sev of ORDER) {
    const group = findings.filter((f) => f.severity === sev);
    if (group.length === 0) continue;
    lines.push(`## ${sev} (${group.length})`);
    for (const f of group) lines.push(`- \`${f.id}\` **${f.category}** ${f.file}${f.line !== null ? ":" + f.line : ""} — ${f.message} _(evidence: ${f.evidence})_`);
    lines.push("");
  }
  lines.push(`## stats`);
  lines.push(`- docs_in_scope: ${stats.docs_in_scope}, routing_files: ${stats.routing_files}, routing_tokens: ${stats.routing_tokens}`);
  lines.push(`- files_skipped: ${stats.files_skipped}, token_count_method: \`${stats.token_count_method}\``);
  lines.push("");
  lines.push(`> \`coverage\` measures whether the routing layer **claims** your code, not whether the claim is **accurate** — content accuracy is \`doc_drift\`'s job.`);
  return lines.join("\n");
}
