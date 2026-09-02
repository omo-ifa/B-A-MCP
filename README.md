# b-a-mcp

**The B&A build-loop gates and repo-audit tools, as a local MCP server for Claude Code.**

`b-a-mcp` puts a disciplined build loop — *Problem-Fit → Intake → Decisions → Design-Doc → Handoff* — and a set of read-only repo-audit tools inside your Claude Code sessions. The gates are the reasoning; the audit tools measure the thing most projects never look at: whether your `CLAUDE.md` / `AGENTS.md` / `CONTEXT.md` routing layer still points at reality.

It runs locally, over stdio, on your own machine. It reads your real files and never writes to them.

---

## What it is

Two kinds of surface:

- **The build-loop gates** — five prompts, one per stage of the loop, served over MCP and invocable as slash commands in your client. Each does one job and hands a clean artifact to the next: is AI even the right tool here, understand the problem, resolve every open decision (or defer it as a tracked TBD), write the design doc (WHAT and WHY, never the step-by-step), then verify the record still matches the code at close. The two entry points — `problem-fit` and `intake` — take an optional idea to start from; the rest run on the conversation and repo you already have. The gates guide with an override: none silently blocks you — each states the risk, names the cheaper path, and logs the override if you proceed anyway.

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

It also serves the five gates on `prompts/list` — invoke them as slash commands (`/problem-fit`, `/intake`, `/decisions`, `/design-doc`, `/handoff`). `problem-fit` and `intake` accept an optional `idea` argument; the other three run on the conversation and repo already in context.

---

## See it run

`context_audit` builds its own report and hands it back verbatim — one screen, no narration. Below is a **real run on this repository** (every number is live; only the root path is shown generically). Point the tool at this repo to reproduce it:

```text
# context_audit — routing health

**Score:** 100/100
**Root:** /path/to/b-a-mcp  (resolved via claude_md — root path shown generically)

| sub-score      | value      |
|----------------|------------|
| bloat          | 100 (n=2)  |
| orphans        | 100 (n=8)  |
| routing_drift  | 100 (n=51) |
| coverage       | 100 (n=7)  |

## low (1)
- bloat  CLAUDE.md — routing file is large; a reader must load it all to orient here
    (evidence: router_tokens=3869)

## info (1)
- broken_ref  src/API.md — a link points at a path that does not exist: reported, never scored

## stats
- docs_in_scope: 11, routing_files: 2, routing_tokens: 5352

> coverage measures whether the routing layer claims your code, not whether the claim is
> accurate — content accuracy is doc_drift's job.
```

Two things that report is doing on purpose:

- **The finding list and the score are different questions.** The one `broken_ref` above is *listed* (so you can see it) but never *scored* — a broken link outside a routing doc is information, not routing rot. The same separation applies to orphans: in a repo with dated archival plans, skill directories, or agent-runtime config, every such doc is *listed* yet recognised as intentional layout, so a pile of orphan findings can still score 100 on the orphans sub-score.
- **It refuses to publish a number it can't defend.** Through calibration the score printed with an `uncalibrated … not a published figure` caveat; that calibration is now closed — the four sub-score weights and every score-driving threshold were ratified against a pinned corpus of real repositories — so the number above is published clean. The flag is a real switch, not decoration: the tool would still rather show a caveat than a confident wrong number.

---

## The free / paid boundary

This is fixed and simple:

- **Free = the reasoning.** All five gate prompts and all three repo-audit tools (`context_audit`, `override_log`, `doc_drift`) are free, keyless, and local. They never touch B&A infrastructure.
- **Paid = the record.** One tool, `export_record` (Phase 2), persists a gate or audit output as a versioned, timestamped artifact. It is the only call that requires a key and the only one that leaves your machine.

The free tier stands on its own. The paid tier just keeps the receipt.

---

## Status

Phase 1 (free tier). All three repo-audit tools — `context_audit`, `override_log`, `doc_drift` — are shipped and registered, and the five gate prompts are served over MCP; the free tier is feature-complete. `context_audit`'s headline weighting and score-driving thresholds are now calibrated against a pinned corpus of real repositories, so it publishes its score without a caveat (see above).

---

## License

`b-a-mcp` is B&A's own code plus a small set of bundled third-party components, each under its own license. See [`LICENSE`](LICENSE) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the full terms and the per-component notices.
