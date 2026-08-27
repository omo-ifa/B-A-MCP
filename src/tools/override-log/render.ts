import type { OverrideStats } from "./types.js";
import type { RenderEntry } from "./validate.js";

function val(v: string, label: string): string {
  return v === "" ? `_missing ${label}_` : v;
}

// The canonical one-liner. Includes the cheaper ALTERNATIVE — risk plus the named
// alternative is the guidance-with-override signal — even though problem-fit.md:81's
// shorthand omits it. Missing pieces render as explicit [unspecified ...] stubs.
function oneLiner(f: Record<string, string>): string {
  const g = f.gate || "[unspecified gate]";
  const risk = f.risk || "[unspecified risk]";
  const alt = f.alternative || "[unspecified alternative]";
  const dec = f.decision || "[unspecified decision]";
  const who = f.acknowledged_by || "[unspecified]";
  const date = f.date || "[undated]";
  return `> proceeded past **${g}** despite ${risk} — cheaper path offered: ${alt}; chose: ${dec}; authorized by ${who} on ${date}.`;
}

export function renderOverrideLog(args: {
  score: number | null;
  stats: OverrideStats;
  entries: RenderEntry[];
}): string {
  const { score, stats, entries } = args;
  const lines: string[] = [];
  lines.push(`# override_log — guidance-with-override record`);
  lines.push("");

  const pct = score === null ? "—" : `${score}%`;
  lines.push(
    `**${stats.overrides_total} overrides · ${stats.fully_documented} fully documented (${pct}) · ${stats.incomplete} incomplete**`,
  );
  lines.push("");

  if (entries.length === 0) {
    lines.push(`_No overrides supplied._`);
    return lines.join("\n");
  }

  for (const e of entries) {
    const f = e.fields;
    const status = e.complete ? "✓ documented" : "⚠ incomplete";
    const gate = f.gate || "(gate missing)";
    const date = f.date || "(date missing)";
    lines.push(`## ${e.index + 1}. \`${e.id}\` — ${gate} · ${date}  ${status}`);
    lines.push(`- **Risk:** ${val(f.risk, "risk")}`);
    lines.push(`- **Cheaper alternative:** ${val(f.alternative, "alternative")}`);
    lines.push(`- **Decision:** ${val(f.decision, "decision")}`);
    lines.push(`- **Acknowledged by:** ${val(f.acknowledged_by, "acknowledged_by")}`);
    if (f.rationale !== "") lines.push(`- **Rationale:** ${f.rationale}`);
    if (e.missing.length > 0) lines.push(`- ⚠ Missing: ${e.missing.join(", ")}`);
    lines.push("");
    lines.push(oneLiner(f));
    lines.push("");
  }

  lines.push(
    `> Generated locally by \`override_log\` (free tier) — this record is not persisted. Persist a versioned, timestamped copy with \`export_record\`.`,
  );
  return lines.join("\n");
}
