# b-a-mcp

**The B&A build-loop gates and repo-audit tools, as a local MCP server for Claude Code.**

`b-a-mcp` puts a disciplined build loop — *Problem-Fit → Intake → Decisions → Design-Doc → Handoff* — and a set of read-only repo-audit tools inside your Claude Code sessions. The gates are the reasoning; the audit tools measure the thing most projects never look at: whether your `CLAUDE.md` / `AGENTS.md` / `CONTEXT.md` routing layer still points at reality.

It runs locally, over stdio, on your own machine. It reads your real files and never writes to them.

---

## What it is

Two kinds of surface:

- **The build-loop gates** — five prompts, one per stage of the loop. Each does one job and hands a clean artifact to the next: is AI even the right tool here, understand the problem, resolve every open decision (or defer it as a tracked TBD), write the design doc (WHAT and WHY, never the step-by-step), then verify the record still matches the code at close. The gates guide with an override: none silently blocks you — each states the risk, names the cheaper path, and logs the override if you proceed anyway.

- **The repo-audit tools** — three read-only checks that run against your working tree, all shipping today. **`context_audit`** walks your routing layer and returns a scored, hard-to-fake diagnosis of routing bloat, orphaned docs, routing drift, and coverage gaps. **`override_log`** turns a set of guidance-with-override events into a canonical, scored override log. **`doc_drift`** diffs a documented schema against the canonical one and reports where they have drifted apart.

Everything above is **free and keyless.** Nothing here makes a network call or asks for a token.

---

## Install

Requires Node ≥ 20.

```bash
npm install -g b-a-mcp
```

Register it with Claude Code as a local MCP server (stdio):

```jsonc
// .mcp.json (project) or your Claude Code MCP settings
{
  "mcpServers": {
    "b-a-mcp": {
      "command": "b-a-mcp"
    }
  }
}
```

The server exposes all three tools — `context_audit`, `override_log`, and `doc_drift` — on `tools/list`. For `context_audit`, point it at a directory (or let it default to the working directory); it resolves upward to the nearest `CLAUDE.md` / `AGENTS.md` and audits from there. `override_log` and `doc_drift` take their input inline and read no files.

---

## See it run

`context_audit` builds its own report and hands it back verbatim — one screen, no narration. Below is an **illustrative** report showing the shape of that output (the root path is shown generically, and your own numbers will differ); a real run on this repository will replace it before release:

```text
# context_audit — routing health

**Score:** 100/100  (uncalibrated — TBD-10/11/12 stubs active; not a published figure)
**Root:** /path/to/your/repo  (resolved via claude_md)

| sub-score      | value      |
|----------------|------------|
| bloat          | 100 (n=4)  |
| orphans        | 100 (n=69) |
| routing_drift  |  99 (n=67) |
| coverage       | 100 (n=2)  |

## high (1)
- routing_path_missing  CLAUDE.md:131 — router path does not resolve to an existing file
    (evidence: planning/decisions/YYYY-MM-DD_title.md)

## medium (20)
- orphan  planning/plans/2026-08-18-context-audit.md — in-scope doc unreachable from any routing root
- …19 more orphans, all dated plan / calibration docs. They are recognised as archival by
  layout, so none is scored as genuine-abandoned rot — which is why the orphans sub-score is 100
  while the finding list still shows every one of them.

## low (3)
- bloat  CLAUDE.md — routing file is large; a reader must load it all to orient here
    (evidence: router_tokens=3373)
- …2 malformed links

## info (53)
- broken_ref  … — example / placeholder links inside planning docs: reported, never scored

## stats
- docs_in_scope: 74, routing_files: 4, routing_tokens: 4863

> coverage measures whether the routing layer claims your code, not whether the claim is
> accurate — content accuracy is doc_drift's job.
```

Two things that report is doing on purpose:

- **The finding list and the score are different questions.** Every orphaned doc is *listed* (so you can see it), but only genuine-abandoned rot is *scored* — dated archival plans, skill directories, and agent-runtime config are recognised as intentional layout, not failure. That is why a repo with 20 orphan findings can still score 100 on the orphans sub-score.
- **It refuses to publish a number it can't defend.** The score prints with an `uncalibrated … not a published figure` caveat while the scoring thresholds are still being calibrated against real repositories. When the calibration work closes, the caveat goes away. The tool would rather show you a caveat than a confident wrong number.

---

## The free / paid boundary

This is fixed and simple:

- **Free = the reasoning.** All five gate prompts and all three repo-audit tools (`context_audit`, `override_log`, `doc_drift`) are free, keyless, and local. They never touch B&A infrastructure.
- **Paid = the record.** One tool, `export_record` (Phase 2), persists a gate or audit output as a versioned, timestamped artifact. It is the only call that requires a key and the only one that leaves your machine.

The free tier stands on its own. The paid tier just keeps the receipt.

---

## Status

Phase 1 (free tier). All three repo-audit tools — `context_audit`, `override_log`, `doc_drift` — are shipped and registered, and the free tier is feature-complete. `context_audit` still marks its own score uncalibrated (see above) while the headline weighting is finalised against a pinned corpus of real repositories.

---

## License

`b-a-mcp` is B&A's own code plus a small set of bundled third-party components, each under its own license. See [`LICENSE`](LICENSE) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the full terms and the per-component notices.
