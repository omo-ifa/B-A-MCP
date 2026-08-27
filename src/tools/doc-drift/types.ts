import type { Severity } from "../context-audit/types.js";

// A JSON-Schema-shaped node. Only the keywords v1 compares are read; others are
// tolerated. type may be a string or an array of strings.
export interface SchemaNode {
  type?: string | string[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  [k: string]: unknown;
}

export type DriftKind =
  | "field_only_in_doc"
  | "field_only_in_canonical"
  | "type_mismatch"
  | "required_drift";

// Severity keyed by DRIFT KIND (the kind is the category). Doc-consumer blast
// radius: over-promise/actively-wrong = high; under-record (merely stale) = medium.
export const SEVERITY_BY_KIND: Record<DriftKind, Severity> = {
  field_only_in_doc: "high",
  type_mismatch: "high",
  required_drift: "high",
  field_only_in_canonical: "medium",
};

export interface DriftFinding {
  id: string;
  category: DriftKind; // the drift kind IS the category
  severity: Severity;
  label: string; // the pair label
  path: string; // dotted field path, e.g. "findings" or "stats.total"
  message: string;
  evidence: string; // the concrete divergence, never used in the id
}

export interface DriftStats {
  pairs_total: number;
  fields_compared: number; // non-opaque comparable field-paths (the denominator)
  in_sync: number;
  drifted: number; // drifted field-paths (<= findings length)
  by_kind: Record<DriftKind, number>;
}

export interface DocDriftResult {
  score: number | null;
  findings: DriftFinding[];
  stats: DriftStats;
  rendered: string;
}

export interface InputPair {
  label?: string;
  declared?: SchemaNode;
  canonical?: SchemaNode;
}
