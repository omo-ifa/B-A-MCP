import { validateOverrides } from "./validate.js";
import { renderOverrideLog } from "./render.js";
import type { OverrideEvent, OverrideLogResult } from "./types.js";

export const overrideLogTool = {
  name: "override_log" as const,
  description:
    "Turn guidance-with-override events into a canonical, timestamped override log. Free and keyless: it generates and renders the record in-session and never persists it (that is export_record's job). Pass an array of override events; each missing required field is flagged and the log carries a completeness score.",
  inputSchema: {
    type: "object",
    required: ["overrides"],
    properties: {
      overrides: {
        type: "array",
        description: "Override events to record. Each field is optional; a missing required field is flagged, never rejected.",
        items: {
          type: "object",
          properties: {
            gate: { type: "string", description: "The gate/checkpoint the override was taken at." },
            risk: { type: "string", description: "The specific gap/risk the gate flagged." },
            alternative: { type: "string", description: "The cheaper/safer path the gate named." },
            decision: { type: "string", description: "What was chosen instead." },
            acknowledged_by: { type: "string", description: "Who authorized proceeding." },
            date: { type: "string", description: "When (a date string; presence checked, format not - v1)." },
            rationale: { type: "string", description: "Optional: why they proceeded." },
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
  | { ok: true; result: OverrideLogResult }
  | { ok: false; error: { code: string; message: string; detail?: string } };

export function runOverrideLog(args: { overrides?: unknown }): Outcome {
  if (!args || !Array.isArray(args.overrides)) {
    return { ok: false, error: { code: "INVALID_OVERRIDES", message: "`overrides` must be an array of override events", detail: "field: overrides" } };
  }
  const { score, findings, stats, entries } = validateOverrides(args.overrides as OverrideEvent[]);
  const rendered = renderOverrideLog({ score, stats, entries });
  return { ok: true, result: { score, findings, stats, rendered } };
}

export function toCallToolResult(outcome: Outcome) {
  if (outcome.ok) return { content: [{ type: "text" as const, text: outcome.result.rendered }], structuredContent: outcome.result };
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: outcome.error }) }], isError: true };
}
