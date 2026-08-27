import { diffPair } from "./diff.js";
import type { SchemaNode, DriftFinding, DriftKind, DriftStats, InputPair } from "./types.js";

export interface RenderPair {
  label: string;
  findings: DriftFinding[];
  fields_compared: number;
  in_sync: number;
  drifted: number;
}

export interface Analyzed {
  score: number | null;
  findings: DriftFinding[];
  stats: DriftStats;
  entries: RenderPair[];
}

function asNode(v: unknown): SchemaNode {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as SchemaNode) : {};
}

export function analyze(pairs: InputPair[]): Analyzed {
  const findings: DriftFinding[] = [];
  const entries: RenderPair[] = [];
  let fieldsCompared = 0;
  let inSync = 0;
  let drifted = 0;
  const byKind: Record<DriftKind, number> = {
    field_only_in_doc: 0,
    field_only_in_canonical: 0,
    type_mismatch: 0,
    required_drift: 0,
  };

  pairs.forEach((raw, index) => {
    const p: InputPair = raw && typeof raw === "object" ? raw : {};
    const label = typeof p.label === "string" && p.label.trim() !== "" ? p.label.trim() : `pair ${index + 1}`;
    const d = diffPair(asNode(p.declared), asNode(p.canonical), label);
    for (const f of d.findings) {
      findings.push(f);
      byKind[f.category]++;
    }
    entries.push({ label, findings: d.findings, fields_compared: d.fields_compared, in_sync: d.in_sync, drifted: d.drifted });
    fieldsCompared += d.fields_compared;
    inSync += d.in_sync;
    drifted += d.drifted;
  });

  const score = fieldsCompared === 0 ? null : Math.round((100 * inSync) / fieldsCompared);
  const stats: DriftStats = {
    pairs_total: pairs.length,
    fields_compared: fieldsCompared,
    in_sync: inSync,
    drifted,
    by_kind: byKind,
  };
  return { score, findings, stats, entries };
}
