# 09 Delta — Relative to spec-0012 / 0013 / 0014 / 0015

## Purpose

Summarize what spec-0017 changes relative to prior prototyping-related specs. Downstream readers who know the old model can jump here.

## Delta from spec-0012 (full-harness reviewer-score schema)

| Area                               | spec-0012                                                                                          | spec-0017 (new)                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence type                      | `FullHarnessIterationEvidence`                                                                     | `PrototypingCycleEvidence` (rename, breaking)                                                                                                  |
| Mode-gated obligations             | `requireRuntimeGate` / `requireUiFidelity` / `requireRenderBundle` / `requireBrowserQaBundle` TRUE only for full-harness | All mode-gated obligations become TRUE for every mode                                                                                          |
| `allReviewerAxesPerfect100`        | Required only for full-harness completion                                                          | Required for completion in every mode                                                                                                          |
| Runtime gate / render / browser QA | Required only for full-harness                                                                     | Required for every mode                                                                                                                        |
| Mode difference                    | Mode affects obligations + max iterations                                                          | Mode affects only `maxCycles` (strict invariant)                                                                                                |
| Evidence fixture path              | `.qfai/evidence/fullHarness/iterations/<n>/*`                                                      | `.qfai/evidence/prototyping/iterations/<n>/*` (canonical)                                                                                      |

## Delta from spec-0013 (design contracts)

- `.qfai/contracts/design/exploration-brief.yaml` / `evaluation-rubric.yaml` / `design-system.yaml` remain the evaluator axis sources.
- New obligation: `evaluator-review.json` output schema; `scores[].evidenceRefs[]` MUST be concrete artifact refs (no placeholders).

## Delta from spec-0014 (validator slices)

- `executionPlan` validator early-exit on `mode !== "full-harness"` is REMOVED. Validator applies to every mode.
- New validator: `modeInvariant` (`QFAI-PROT-MODE-001`) — detects any mode-dependent gate other than `maxCycles`.
- New validator: `reviewCycle` — verifies capture → review → fix → re-capture → re-review chain per cycle.
- `lighthouseGate` moved from required gate to optional auxiliary check.

## Delta from spec-0015 (reviewer gate)

- Independent reviewer gate requirement expanded to every mode (was: full-harness only).
- Review bundle format is now `review-bundle.json` with 5 required fields (screens, axisDefs, designSystemChecklist, previousScore, commandPlanRef).

## Removed assets (breaking)

- `packages/qfai/assets/scripts/capture-screenshots.js` (replaced by Playwright CLI)
- `packages/qfai/src/core/providers/playwrightBrowserQaProvider.ts` (Node Playwright direct call)
- `packages/qfai/src/core/evidence/playwrightRenderAdapter.ts` (Node Playwright direct call)
- Any `packages/qfai/assets/mcp-templates/playwright/**` references (none exist at time of writing; confirmed clean)

## New artifacts

- `packages/qfai/src/core/prototyping/playwrightCliPlan.ts`
- `packages/qfai/src/core/prototyping/reviewBundle.ts`
- `packages/qfai/src/core/prototyping/types.ts`
- `packages/qfai/src/cli/commands/prototyping.ts`
- `packages/qfai/src/core/validators/prototyping/modeInvariant.ts`
- `packages/qfai/src/core/validators/prototyping/reviewCycle.ts`

## Renamed / updated artifacts

- `PrototypingObligations` flag set becomes uniform across modes
- `qfai.config.yaml` key `prototyping.execution.{browserProvider,renderProvider}` → `prototyping.execution.browserTool`
- `SKILL.md` Step 4 explicit Playwright CLI wording
- `references/evidence-requirements.md` extended with iteration paths
