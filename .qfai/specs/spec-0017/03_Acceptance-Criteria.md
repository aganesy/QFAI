# 03 Acceptance Criteria

## AC-0017-0001: Single Lineage Loop

Given a UI-bearing spec, when `/qfai-prototyping` runs, then exactly one prototype lineage `iter-00..iter-N` is produced (no parallel candidates) and `prototyping.json#iterations[]` contains contiguous `index` values starting at 0.

## AC-0017-0002: Iteration Budget Fixed

Given any `/qfai-prototyping` run, when iteration count is checked, then it does not exceed 15 (indices 0..14) and the upper bound is a code constant `MAX_ITERATIONS = 15` not a config.

## AC-0017-0003: Four Axes Ordinal

Given any `iter-NN/review.json`, when validated, then `scores.{informationArchitecture,navigationFlow,usability,functionality}` are present with values in `{weak, acceptable, strong, exceptional}` and no other axis is present. (UX-loop redesign: replaces the deprecated `{designQuality, originality, craft, functionality}` axis set — see 09_delta.md OP-0001.)

## AC-0017-0004: Prose Critique Required

Given any `iter-NN/review.json`, when validated, then `proseCritique` word count is in `[200, 500]`. Outside this range raises `QFAI-PROT2-020`.

## AC-0017-0005: Layout-Anti-Pattern IA Cap

Given any `iter-NN/review.json` where `layoutAntiPatternsDetected.length > 0`, when validated, then `scores.informationArchitecture` is in `{weak, acceptable}`. `strong` or `exceptional` raises `QFAI-PROT2-021`. (UX-loop redesign: replaces the deprecated anti-slop-originality cap — see 09_delta.md OP-0002.)

## AC-0017-0006: Pivot Directive Present

Given any `iter-NN/review.json`, when validated, then `pivotDirective` is one of `{continue, refine, pivot}`. Other values raise `QFAI-PROT2-022`.

## AC-0017-0007: Deterministic Stop on Convergence

Given the latest iter has all 4 axes (informationArchitecture, navigationFlow, usability, functionality) `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0`, when `qfai prototyping iterate --cycle <n+1>` runs, then it exits with code `64` and prints "convergence reached". (UX-loop redesign: convergence now requires DESIGN.md token compliance and zero layout anti-patterns — see 09_delta.md OP-0003.)

## AC-0017-0008: Deterministic Stop on Max Iterations

Given the latest iter has `index === 14`, when `qfai prototyping iterate --cycle 15` runs, then it exits with code `65` and prints "max iterations reached".

## AC-0017-0009: Best-of-History Removed

Given any `prototyping.json` v3.0 file, when validated, then `bestOfHistory` field is absent. `acceptedIterationIndex` always equals `iterations.length - 1`.

## AC-0017-0010: Per-Iter Evidence Minimal

Given any iter directory, when listed, then it contains `<screen>.png`, `<screen>.html`, and `review.json` only. Legacy artifacts (`<screen>.snapshot.txt`, `<screen>.commands.json`) are not required.

## AC-0017-0011: Design System As DESIGN.md Mirror

Given a completed run, when checked, then `.qfai/contracts/design/design-system.yaml` is generated post-loop as a **deterministic mirror of `DESIGN.md` tokens** (not extracted from final iter HTML measurements) and `.qfai/contracts/design/prototype-handoff.yaml` references it via `extractedDesignSystem`. (UX-loop redesign: brand SSOT moved from "extract from winner HTML" to "mirror DESIGN.md" — see 09_delta.md OP-0004.)

## AC-0017-0012: Completion Certificate As Sole DONE Signal

Given a `/qfai-prototyping` run, when DONE is claimed, then `qfai prototyping certify --check` returns exit 0 with a digest-matching `completion-certificate.json` v2.0. No other path declares DONE.

## AC-0017-0013: No Legacy Concepts In Codebase

Given the QFAI v2.0 codebase, when `packages/qfai/scripts/check-no-legacy-concepts.sh` runs, then it exits 0 with output `OK: no legacy concepts present`. Any of these strings in `packages/qfai/` (excl. tmp/node_modules/dist) raises non-zero exit: `low-cost`, `full-harness`, `maxCycles`, `maxIterationsByMode`, `round-start`, `round-harvest`, `round-narrow`, `round-absorb`, `harvestBuilder`, `absorptionBuilder`, `reimplementationBuilder`, `branchPlanner`, `plateauDetector`, `candidateConcept`, `polishCycle`, `bestOfHistory`, `allReviewerAxesPerfect100`, `conceptFit`, `regressionAlert`, `BreakthroughConfig`, `evaluation-rubric`, `evaluator-calibration`, `absorption-policy`, `selected-direction`.

## AC-0017-0014: Skill Size Budget

Given the v2.0 skill assets, when measured, then:

- `qfai-prototyping/SKILL.md` ≤ 130 lines
- `qfai-prototyping/references/iteration-loop.md` ≤ 80 lines
- `qfai-prototyping/references/generator-prompt.md` ≤ 60 lines
- `qfai-prototyping/references/reviewer-prompt.md` ≤ 100 lines
- `qfai-prototyping/references/handoff.md` ≤ 50 lines

## AC-0017-0015: DESIGN.md SSOT Lock at SDD Phase 0

Given a `/qfai-sdd` Phase 0 run with a root `DESIGN.md` present, when Phase 0 completes, then `.qfai/contracts/design/DESIGN.md.lock.yaml` exists and contains a sha256 hash of the current `DESIGN.md` byte content. When `DESIGN.md` is missing at Phase 0, Phase 0 raises `QFAI-PROT2-030` and halts.

## AC-0017-0016: Cycle 0 Records DESIGN.md Hash

Given a `qfai prototyping iterate --cycle 0 --target-url <url>` invocation with a frozen `DESIGN.md.lock.yaml`, when the command completes, then `prototyping.json#designMdSha256` equals the recorded lock hash and matches the current on-disk `DESIGN.md` sha256.

## AC-0017-0017: Cycle ≥1 Halts on Hash Mismatch

Given a `prototyping.json` with a `designMdSha256` value that does not match the current on-disk `DESIGN.md` sha256, when `qfai prototyping iterate --cycle <n>` (n ≥ 1) runs, then it exits with code `2` and prints "DESIGN.md hash mismatch — re-run from cycle 0". `QFAI-PROT2-031` is emitted.

## AC-0017-0018: layoutAntiPatternsDetected Schema

Given any `iter-NN/review.json`, when validated, then `layoutAntiPatternsDetected` is present as an array of strings drawn from the global list `{lap-001-orphan-page, lap-002-deadend-flow, lap-003-modal-stack-trap, lap-004-hidden-primary-action, lap-005-no-empty-state, lap-006-mystery-meat-icon, lap-007-state-not-represented, lap-008-no-back-affordance}`. Unknown values raise `QFAI-PROT2-032`.

## AC-0017-0019: designMdViolations Schema

Given any `iter-NN/review.json`, when validated, then `designMdViolations` is present as an array. Each entry has shape `{ category: "color"|"font"|"radius"|"shadow", expected: string, found: string, location: string }`. Out-of-set `category` values raise `QFAI-PROT2-033`.

## AC-0017-0020: findDesignMdViolations Pure Function

Given a pair `(html, designMd)` where `designMd` is the parsed token table from `DESIGN.md`, when `findDesignMdViolations(html, designMd)` is called, then it returns an array of `{category, expected, found, location}` violations covering color / font / radius / shadow, is **pure** (no I/O, no clock), and is deterministic (same input → same output).

## AC-0017-0021: Pivot Directive Rules (UX-loop)

Given a sequence of iter reviews, when `pivotDirective` is computed, then the rules are:

- `pivot` when **3 consecutive cycles** have low informationArchitecture (`weak` OR `acceptable`) AND the **latest** has `layoutAntiPatternsDetected.length > 0`
- `continue` when **≥2 of the 4 axes improved** vs the prior iter
- otherwise `refine`

Other values raise `QFAI-PROT2-022`. (UX-loop redesign: replaces the prior "3 consecutive low-originality" pivot rule — see 09_delta.md OP-0005.)

## AC-0017-0022: Legacy Slop / Visual-Aesthetic Anti-Patterns Removed

Given the v2.0+UX-loop reviewer prompt and validator schemas, when scanned, then no reference to `slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, or `slop-010-rounded-2xl-shadow-lg` appears as an active anti-pattern token. (Legacy slop list survives only in `09_delta.md` history rows.)

## AC-0017-0023: Legacy Design Contracts Removed

Given the v2.0+UX-loop active contract index, when `_policies/05_Contracts.md` is read, then `brand-design.yaml`, `exploration-brief.yaml`, and `reference-pool.yaml` are not listed as active design contracts. Root `DESIGN.md` and `.qfai/contracts/design/DESIGN.md.lock.yaml` are listed instead.

## AC-0017-0024: DCON-030/031/032 Validator Renumber

Given the v2.0+UX-loop design-contract validators, when error codes are scanned, then validator IDs `DCON-030` (DESIGN.md presence/structure), `DCON-031` (DESIGN.md.lock.yaml hash integrity), and `DCON-032` (design-system.yaml mirrors DESIGN.md tokens) are present. Old DCON-005..016 series are gap-allowed renumbered (legacy IDs retained only in 09_delta.md history).
