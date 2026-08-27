import type { DriftStats } from "./types.js";
import type { RenderPair } from "./analyze.js";

export function renderDocDrift(args: {
  score: number | null;
  stats: DriftStats;
  entries: RenderPair[];
}): string {
  const { score, stats, entries } = args;
  const lines: string[] = [];
  lines.push(`# doc_drift — schema-of-record drift report`);
  lines.push("");

  const pct = score === null ? "—" : `${score}%`;
  lines.push(`**${stats.pairs_total} pairs · ${stats.in_sync}/${stats.fields_compared} fields in sync (${pct}) · ${stats.drifted} drifted**`);
  lines.push("");

  if (stats.fields_compared === 0) {
    lines.push(`_Nothing to compare — no non-opaque fields across the supplied pairs._`);
    lines.push("");
  }

  for (const e of entries) {
    lines.push(`## ${e.label} — ${e.in_sync}/${e.fields_compared} in sync`);
    if (e.findings.length === 0) {
      lines.push(`- ✓ no drift`);
    } else {
      for (const f of e.findings) {
        lines.push(`- ⚠ **${f.category}** \`${f.path}\` — ${f.evidence}`);
      }
    }
    lines.push("");
  }

  lines.push(`> Opaque \`{type:object}\` nodes are treated as wildcards — drift inside them is not detected; feed a more complete canonical to see it.`);
  lines.push(`> Generated locally by \`doc_drift\` (free tier) — this record is not persisted. Persist a versioned, timestamped copy with \`export_record\`.`);
  return lines.join("\n");
}
