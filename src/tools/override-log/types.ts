import type { Severity } from "../context-audit/types.js";

// One override event as supplied by the caller. All fields are optional strings:
// the tool never hard-refuses a call for a missing field (guidance-with-override
// applied to the tool itself); a missing REQUIRED field becomes a finding.
export interface OverrideEvent {
  gate?: string;
  risk?: string;
  alternative?: string;
  decision?: string;
  acknowledged_by?: string;
  date?: string;
  rationale?: string;
}

// The six fields required for a COMPLETE record (rationale is genuinely optional).
export const REQUIRED_FIELDS = [
  "gate", "risk", "alternative", "decision", "acknowledged_by", "date",
] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

// Severity keyed by the MISSING FIELD (NOT by category — all findings share one
// category, so a category-keyed map like context_audit's SEVERITY_BY_CATEGORY
// would give them all one severity, which is wrong here).
export const SEVERITY_BY_FIELD: Record<RequiredField, Severity> = {
  risk: "high",
  alternative: "high",
  date: "high",
  acknowledged_by: "high",
  gate: "medium",
  decision: "medium",
};

export interface OverrideFinding {
  id: string;
  category: "override_field_missing";
  severity: Severity;
  entry_index: number;
  message: string;
  evidence: string; // the missing field's name
}

export interface OverrideStats {
  overrides_total: number;
  fully_documented: number;
  incomplete: number;
  fields_missing_total: number;
}

export interface OverrideLogResult {
  score: number | null;
  findings: OverrideFinding[];
  stats: OverrideStats;
  rendered: string;
}
