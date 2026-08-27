import { stableId } from "./id.js";
import { REQUIRED_FIELDS, SEVERITY_BY_FIELD } from "./types.js";
import type { OverrideEvent, OverrideFinding, OverrideStats } from "./types.js";

// All input + rationale, in a fixed key order (rationale rendered but never faulted).
const ALL_FIELDS = [
  "gate", "risk", "alternative", "decision", "acknowledged_by", "date", "rationale",
] as const;

export interface RenderEntry {
  id: string;
  index: number;
  fields: Record<string, string>; // normalized values; "" when absent
  missing: string[]; // missing required field names, in REQUIRED_FIELDS order
  complete: boolean;
}

export interface Validated {
  score: number | null;
  findings: OverrideFinding[];
  stats: OverrideStats;
  entries: RenderEntry[];
}

function norm(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateOverrides(overrides: OverrideEvent[]): Validated {
  const findings: OverrideFinding[] = [];
  const entries: RenderEntry[] = [];
  let fullyDocumented = 0;
  let fieldsMissingTotal = 0;

  overrides.forEach((raw, index) => {
    const e: OverrideEvent = raw && typeof raw === "object" ? raw : {};

    const fields: Record<string, string> = {};
    for (const f of ALL_FIELDS) fields[f] = norm((e as Record<string, unknown>)[f]);

    // Entry id = stable hash over the identity fields (gate|date|decision),
    // never the moving evidence — so it survives risk/alternative/acknowledged_by
    // being completed and can key export_record's supersede.
    const id = stableId(fields.gate, fields.date, fields.decision);
    const discriminator = `${fields.gate}\0${fields.date}\0${fields.decision}`;

    const missing: string[] = [];
    for (const f of REQUIRED_FIELDS) {
      if (fields[f] === "") {
        missing.push(f);
        findings.push({
          id: stableId("override_field_missing", discriminator, f),
          category: "override_field_missing",
          severity: SEVERITY_BY_FIELD[f],
          entry_index: index,
          message: `override entry ${index + 1} is missing required field \`${f}\``,
          evidence: f,
        });
      }
    }

    fieldsMissingTotal += missing.length;
    const complete = missing.length === 0;
    if (complete) fullyDocumented++;
    entries.push({ id, index, fields, missing, complete });
  });

  const total = overrides.length;
  const score = total === 0 ? null : Math.round((100 * fullyDocumented) / total);
  const stats: OverrideStats = {
    overrides_total: total,
    fully_documented: fullyDocumented,
    incomplete: total - fullyDocumented,
    fields_missing_total: fieldsMissingTotal,
  };

  return { score, findings, stats, entries };
}
