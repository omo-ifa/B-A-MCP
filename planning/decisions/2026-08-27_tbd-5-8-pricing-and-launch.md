# TBD-5 and TBD-8 resolved — paid-tier price + launch sequencing

**Date:** 2026-08-27
**Resolves:** TBD-5 (paid-tier price/structure), TBD-8 (launch sequencing)
**Owner rulings:** product owner (B&A), this session
**Also touches:** `planning/Integration_Spec.md` §1 (`export_record` auth semantics), `src/TDD.md`, `CLAUDE.md` Key Open TBDs

---

## TBD-5 — paid-tier price and structure (RESOLVED)

**Ruling: $9 / month — a subscription** (not a one-time purchase).

**Consequence for `export_record` auth (the reason this TBD blocked the contract).**
The Integration_Spec §1 note said the price/structure "determines whether
validation checks entitlement or just key validity." A subscription settles it:

- `export_record` auth must validate **active entitlement** — i.e. is the caller's
  subscription **currently active** in Stripe at call time — not merely that a
  key is well-formed or was once issued.
- A lapsed/cancelled subscription must cause a clean decline (Phase-2 exit
  criterion: "a non-keyholder is cleanly declined" now also covers a
  once-valid-but-now-inactive subscriber).
- Key issuance happens at checkout; validation checks the key **and** the live
  subscription state against Stripe customer metadata (site-repo work).

This does **not** unblock the Phase-2 build on its own — the site-repo
consent-gated checkout + key issuance still must be built. It removes the
pricing ambiguity from the contract shape.

## TBD-8 — launch sequencing (RESOLVED)

**Ruling: split launch — free tier first.**

- Ship the **keyless free tier** (three repo-audit tools + five gate prompts) to
  npm now, as its own launch. It is the lead-generation / authority asset and
  does not depend on the paid backend.
- The paid `export_record` ships in a **later Phase-2 launch**, once the
  site-repo checkout is built and proven.
- Consistent with the roadmap phase order; no change to the free/paid boundary
  (rule 3). The free tier standing on its own is the whole premise.

## What this changes

- `src/TDD.md` — TBD-5, TBD-8 → Resolved.
- `CLAUDE.md` — removed from the (now empty of these) Key Open TBDs region; TBD-5
  no longer listed as open.
- `planning/Integration_Spec.md` §1 — the `TODO: TBD-5` auth note replaced with
  the entitlement-check ruling.
- No code changes (Phase 2 is unbuilt); no rule-2/rule-8 triggers.

## Still open (not this decision)

- TBD-3 (DO Functions allowance) — resolved separately the same day
  (`2026-08-27` TDD.md; 90,000 GiB-s confirmed, non-load-bearing).
- The Phase-2 build itself remains blocked on the site-repo checkout.
