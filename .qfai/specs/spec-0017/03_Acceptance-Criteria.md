# 03 Acceptance Criteria

## AC-0017-0001: Single Lineage Loop

Given a UI-bearing spec, when `/qfai-prototyping` runs, then exactly one prototype lineage `iter-00..iter-N` is produced (no parallel candidates) and `prototyping.json#iterations[]` contains contiguous `index` values starting at 0.

## AC-0017-0002: Iteration Budget Fixed

Given any `/qfai-prototyping` run, when iteration count is checked, then it does not exceed 15 (indices 0..14) and the upper bound is a code constant `MAX_ITERATIONS = 15` not a config.

## AC-0017-0003: Four Axes Ordinal

Given any `iter-NN/review.json`, when validated, then `scores.{designQuality,originality,craft,functionality}` are present with values in `{weak, acceptable, strong, exceptional}` and no other axis is present.

## AC-0017-0004: Prose Critique Required

Given any `iter-NN/review.json`, when validated, then `proseCritique` word count is in `[200, 500]`. Outside this range raises `QFAI-PROT2-020`.

## AC-0017-0005: Anti-Slop Originality Cap

Given any `iter-NN/review.json` where `slopPatternsDetected.length > 0`, when validated, then `scores.originality` is in `{weak, acceptable}`. `strong` or `exceptional` raises `QFAI-PROT2-021`.

## AC-0017-0006: Pivot Directive Present

Given any `iter-NN/review.json`, when validated, then `pivotDirective` is one of `{continue, refine, pivot}`. Other values raise `QFAI-PROT2-022`.

## AC-0017-0007: Deterministic Stop on Convergence

Given the latest iter has all 4 axes `exceptional` and `slopPatternsDetected.length === 0`, when `qfai prototyping iterate --cycle <n+1>` runs, then it exits with code `64` and prints "convergence reached".

## AC-0017-0008: Deterministic Stop on Max Iterations

Given the latest iter has `index === 14`, when `qfai prototyping iterate --cycle 15` runs, then it exits with code `65` and prints "max iterations reached".

## AC-0017-0009: Best-of-History Removed

Given any `prototyping.json` v3.0 file, when validated, then `bestOfHistory` field is absent. `acceptedIterationIndex` always equals `iterations.length - 1`.

## AC-0017-0010: Per-Iter Evidence Minimal

Given any iter directory, when listed, then it contains `<screen>.png`, `<screen>.html`, and `review.json` only. Legacy artifacts (`<screen>.snapshot.txt`, `<screen>.commands.json`) are not required.

## AC-0017-0011: Design System As Output Contract

Given a completed run, when checked, then `.qfai/contracts/design/design-system.yaml` is generated post-loop from the final iter HTML and `.qfai/contracts/design/prototype-handoff.yaml` references it via `extractedDesignSystem`.

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
