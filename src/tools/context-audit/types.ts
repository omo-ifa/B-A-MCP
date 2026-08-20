export type RootMethod = "claude_md" | "git_root" | "given_path";
export interface Root { path: string; method: RootMethod; }

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type FindingCategory =
  | "orphan" | "broken_ref" | "routing_drift" | "malformed_link" | "escapes_root"
  | "coverage" | "bloat" | "root_absent" | "root_empty"
  | "name_collision" | "symlink" | "skipped";

// Public finding shape (design §3 output contract — exactly these fields).
export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  file: string;            // root-relative path; uncovered-dir path (trailing "/") for `coverage`
  line: number | null;
  message: string;
  evidence: string;        // the raw counted / moving value
}

// Internal working finding, produced by walk/graph/bloat/coverage before
// scoring. `discriminator` is the STABLE id key (never a measured value):
// the target path for link findings, the metric name for bloat, the uncovered
// directory path for coverage. `normalizeFindings` hashes it into `id`,
// derives `severity` from the category, and STRIPS `discriminator` so the
// public `Finding` stays exactly the design's seven fields.
export interface RawFinding {
  category: FindingCategory;
  file: string;
  line: number | null;
  message: string;
  evidence: string;
  discriminator: string;
}

export interface Subscores {
  bloat: number | null;
  orphans: number | null;
  broken_refs: number | null;
  routing_drift: number | null;
  coverage: number | null;
}

export interface AuditStats {
  docs_in_scope: number;
  routing_files: number;
  routing_tokens: number;
  orphan_count: number;
  files_skipped: number;
  token_count_method: string;
  calibrated: boolean;      // false while TBD-10/11/12 stubs are active
}

export interface AuditResult {
  root: Root;
  score: number;
  subscores: Subscores;
  findings: Finding[];
  stats: AuditStats;
  rendered: string;
}
