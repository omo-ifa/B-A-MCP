import { analyze } from "./analyze.js";
import { renderDocDrift } from "./render.js";
import type { InputPair, DocDriftResult } from "./types.js";

export const docDriftTool = {
  name: "doc_drift" as const,
  description:
    "Diagnose schema-of-record drift between a documented interface and its canonical truth. Free and keyless: a pure structural differ — pass an array of {declared, canonical} JSON-Schema pairs and it returns per-field drift findings (documented-but-absent, undocumented, type mismatch, required-drift), a completeness score, and a rendered report. It reads no files and runs nothing; the caller supplies both schemas (for an MCP server, canonical = the tools/list payload; for OpenAPI, openapi.json; etc.). Opaque `{type:object}` nodes are treated as wildcards.",
  inputSchema: {
    type: "object",
    required: ["pairs"],
    properties: {
      pairs: {
        type: "array",
        description: "Schema pairs to compare. Each has an optional label and two JSON-Schema-shaped objects: declared (the doc's claim) and canonical (the ground truth the caller obtained).",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Identifies this pair in findings and the report." },
            declared: { type: "object", description: "The schema as documented (e.g. a JSON block from API.md)." },
            canonical: { type: "object", description: "The ground-truth schema the caller obtained (e.g. a tools/list payload)." },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["score", "findings", "stats", "rendered"],
    properties: {
      score: { type: ["number", "null"] },
      findings: { type: "array", items: { type: "object" } },
      stats: { type: "object" },
      rendered: { type: "string" },
    },
    additionalProperties: false,
  },
};

type Outcome =
  | { ok: true; result: DocDriftResult }
  | { ok: false; error: { code: string; message: string; detail?: string } };

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function runDocDrift(args: { pairs?: unknown }): Outcome {
  if (!args || !Array.isArray(args.pairs)) {
    return { ok: false, error: { code: "INVALID_PAIRS", message: "`pairs` must be an array of {declared, canonical} schema pairs", detail: "field: pairs" } };
  }
  // D5: at the tool boundary each pair — AND each PRESENT declared/canonical — must
  // be a plain object. analyze() stays defensively lenient internally, but a
  // present-but-non-object value is a malformed call, not a silent empty schema (a
  // string-encoded schema would otherwise coerce to {} and misreport as all-drift).
  // An ABSENT declared/canonical stays valid (missing -> {} -> neutral).
  const pairs = args.pairs as unknown[];
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    if (!isPlainObject(p)) {
      return { ok: false, error: { code: "INVALID_PAIRS", message: "each pair must be an object with declared and canonical schemas", detail: `pairs[${i}] is not an object` } };
    }
    const pair = p as { declared?: unknown; canonical?: unknown };
    if (pair.declared !== undefined && !isPlainObject(pair.declared)) {
      return { ok: false, error: { code: "INVALID_PAIRS", message: "a pair's `declared` schema must be an object when present", detail: `pairs[${i}].declared is not an object` } };
    }
    if (pair.canonical !== undefined && !isPlainObject(pair.canonical)) {
      return { ok: false, error: { code: "INVALID_PAIRS", message: "a pair's `canonical` schema must be an object when present", detail: `pairs[${i}].canonical is not an object` } };
    }
  }
  const { score, findings, stats, entries } = analyze(pairs as InputPair[]);
  const rendered = renderDocDrift({ score, stats, entries });
  return { ok: true, result: { score, findings, stats, rendered } };
}

export function toCallToolResult(outcome: Outcome) {
  if (outcome.ok) return { content: [{ type: "text" as const, text: outcome.result.rendered }], structuredContent: outcome.result };
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: outcome.error }) }], isError: true };
}
