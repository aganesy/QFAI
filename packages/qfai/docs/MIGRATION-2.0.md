# MIGRATION-2.0 — `/qfai-prototyping` v2.0

**Spec:** [`spec-0017`](../../../.qfai/specs/spec-0017/01_Spec.md)
**Plan:** `~/.claude/plans/anthropic-ai-qfai-delegated-church.md`
**Status:** breaking change. v1.x runs cannot be migrated automatically; rerun affected projects with v2.0.

## Why

The v1.x `/qfai-prototyping` skill was designed for *safe convergent quality assurance* (5→3→2→1 funnel + absorption + 6-axis compliance + 100/100 completion gate + low-cost / standard / full-harness mode tier). In real usage it never produced the kind of self-driven creative leap described in the [Anthropic Dutch art museum example](https://www.anthropic.com/engineering/harness-design-long-running-apps): nine polished iterations followed by a tenth iteration that scrapped everything and reimagined the page as a 3D spatial experience.

v2.0 redesigns the skill around the *environmental conditions* that elicit that behavior: a long single-thread iteration history, prose critique that accumulates over time, explicit pivot permission, no penalty for radical rewrites, deterministic stop conditions, and a teeth-bearing `originality` axis that punishes generic AI defaults instead of rewarding compliance.

## What changed

### Skill flow

| | v1.x | v2.0 |
|---|---|---|
| Lineage | 5 parallel candidates → 3 → 2 → 1 winner, then polish | One prototype, 15 cycles |
| Cycle budget | mode-tiered: low-cost = 1, standard = 3, full-harness = 20 | fixed 15 (`MAX_ITERATIONS` constant) |
| Completion | every reviewer scored every axis at 100/100 | all 4 axes `exceptional` AND `slopPatternsDetected` empty |
| Stop check | LLM-driven, prone to early DONE | deterministic CLI exit code (`qfai prototyping iterate --cycle <n>`: 0 / 64 / 65 / 2) |
| Acceptance rule | best-of-history (regressions blocked) | latest iter is always accepted (leap regression allowed) |
| Critique form | 6-axis structured JSON | 4-axis ordinal + 200–500 word prose + `pivotDirective` |
| Pivot | harness branched 2 alternates on plateau | AI chooses `continue / refine / pivot` per cycle |
| Anti-slop | none | global pattern list in `qfai-prototyping/references/reviewer-prompt.md`; matches cap originality at `acceptable` |

### CLI surface

Removed (any reference will fail):

- `qfai prototyping round-start`
- `qfai prototyping round-harvest`
- `qfai prototyping round-narrow`
- `qfai prototyping round-absorb`
- `qfai prototyping round-reimplement-verify`
- `--mode <low-cost|standard|full-harness>`
- `--round <r5|r3|r2|r1>`
- `--candidates <csv>`
- `--survivors <csv>`

Added:

- `qfai prototyping iterate --cycle <n>` (the v2.0 driver; run this once per cycle 0..14)
- `--cycle <number>` flag on `qfai prototyping iterate`

Retained:

- `qfai prototyping certify` and `--check`
- `qfai prototyping show-spec`
- `qfai prototyping preflight`

Exit codes for `qfai prototyping iterate --cycle <n>`:

- `0` — continue, the iter dir + `iterate-plan.json` are now ready
- `64` — convergence (all 4 axes `exceptional` and `slopPatternsDetected` empty in the latest iter); run `qfai prototyping certify`
- `65` — max iterations reached (latest iter `index === 14`); run `qfai prototyping certify`
- `2` — input error (cycle out of range, missing `--target-url` at cycle 0, no UI-bearing spec)

### Schema changes

- `prototyping.json` schema bumped from v2.0 → **v3.0**:
  - `rounds[]`, `polishCycles[]`, `bestOfHistory`, `breakthrough`, `mode`, `fullHarness` removed
  - `iterations[]` replaces them. Each entry has `index` (contiguous from 0), `commitSha`, `scores.{designQuality,originality,craft,functionality}`, `proseCritique`, `slopPatternsDetected[]`, `pivotDirective`, `evidenceRefs.{screenshot,html}`
  - `acceptedIterationIndex` always equals `iterations.length - 1` (no best-of-history)
  - `stopReason` is `null | "axes-exceptional" | "max-iterations"`

- `completion-certificate.json` schema bumped from v1.0 → **v2.0**:
  - `polishCycleCount` removed
  - `iterationCount` retained
  - v1.x certificates fail to load at runtime

- New per-iter review schema (`iter-NN/review.json`, schema v3.0): 4 ordinal axes, 200–500 word prose critique, `slopPatternsDetected[]`, `pivotDirective`. `buildEvaluatorReview()` enforces the anti-slop cap at construction time.

### Removed contracts

These design contracts no longer exist anywhere in the package or in init templates:

- `.qfai/contracts/design/evaluation-rubric.yaml` — axes are now global constants in `core/prototyping/iteration.ts`
- `.qfai/contracts/design/evaluator-calibration.yaml` — replaced by ordinal scale + prose critique
- `.qfai/contracts/design/absorption-policy.yaml` — absorption / harvest concept removed
- `.qfai/contracts/design/selected-direction.yaml` — winner-selection concept removed

The discussion sidecars `uiux/33_exploration_rubric.md` and `uiux/34_evaluator_calibration.md` are also removed; their content (axes definition + calibration examples) is no longer part of the per-project pack.

### Removed source modules

```
packages/qfai/src/core/prototyping/
  round.ts, harvestBuilder.ts, absorptionBuilder.ts,
  reimplementationBuilder.ts, branchPlanner.ts, plateauDetector.ts,
  candidateConcept.ts, evaluatorReviewV2.ts, candidate.ts,
  reviewBundle.ts, types.ts, evidenceRecord.ts, playwrightCliPlan.ts
packages/qfai/src/core/calibration/
  plateau.ts
packages/qfai/src/core/harness/   (entire directory)
packages/qfai/src/core/evidence/
  bundleWriter.ts, specCoverage.ts, uiObservation.ts,
  fakeUiDetection.ts, actionCoverage.ts, uiFidelityBuilder.ts,
  runtimeObservation.ts, runtimeGateBuilder.ts, evidenceHandler.ts,
  fsEvidenceWriter.ts, captureStatus.ts
packages/qfai/src/core/validators/
  prototypingCandidateConcept.ts, breakthroughEvidence.ts,
  evaluatorReviewHardFloor.ts, prototypingDesignSystem.ts
packages/qfai/src/core/validators/prototyping/
  modeInvariant.ts, executionPlan.ts, lighthouseGate.ts,
  screenshotDir.ts, iterationGate.ts, designSystemThreshold.ts
```

### Cross-skill effects

- `/qfai-discussion`: stops generating `33_exploration_rubric.md` and `34_evaluator_calibration.md`. The `prototyping.yaml` sidecar is now `surface`-only (no `recommended_mode` / `allowed_modes`).
- `/qfai-sdd`: stops normalizing the four removed design contracts. `ui-design-contract-normalization.md` rewritten. `prototype-handoff.sample.yaml` simplified (`mustPreserve / mayAdapt / mustNotCopy` triple is gone — the artifact itself is the SSOT).
- `/qfai-implement`: visual review guard read-order updated to v2.0 path set; `.qfai/prototypes/winner/index.html` replaced by `.qfai/prototypes/final/index.html`; canonical screenshot mirrors replaced by `.qfai/evidence/prototyping/iter-NN/<screen>.{png,html}`.
- `/qfai-verify`: required reading switched from `evidence-requirements.md` to `iteration-loop.md`; reviewer checks now require iter-NN evidence and a digest-valid `completion-certificate.json` v2.0.
- `agent-routing.yml`: prototyping routing rewritten as the 3-phase v2.0 loop (seed / loop / handoff) with `review_profile: ui-bearing` (the `full-harness` profile in `review-profiles.yml` is removed).

### Error-code namespace

The v2.0 prototyping evidence validator emits codes prefixed `QFAI-PROT2-NNN` (physically separated from the v1.x `QFAI-PROT-NNN` namespace to prevent code reuse drift):

- `QFAI-PROT2-001` prototyping.json missing or unparseable
- `QFAI-PROT2-002` schema / shape / enum violations
- `QFAI-PROT2-003` iterations[] empty
- `QFAI-PROT2-004` non-contiguous iter.index
- `QFAI-PROT2-005` stopReason consistency
- `QFAI-PROT2-006` iterations.length > MAX_ITERATIONS (15)
- `QFAI-PROT2-007` acceptedIterationIndex must equal iterations.length - 1

The legacy `QFAI-PROT-NNN` codes for removed validators remain in the message dictionary in `validate.ts` as historical reference but are not emitted by any active validator.

## Migration steps for existing projects

1. **Discard prior prototyping evidence.** Remove `.qfai/evidence/prototyping/` (v1.x `prototyping.json` v2.0 will fail to load; certificates with `schemaVersion: "1.0"` will be rejected).
2. **Re-run `/qfai-discussion`** for any UI-bearing pack — stop carrying `33_exploration_rubric.md` and `34_evaluator_calibration.md`. Update `prototyping.yaml` to `surface:` only.
3. **Re-run `/qfai-sdd`** to regenerate design contracts. The four removed contracts won't be regenerated.
4. **Run the v2.0 loop:** `qfai prototyping iterate --cycle 0 --target-url <url>`, then capture, then review (per the new `references/reviewer-prompt.md`), then `qfai prototyping iterate --cycle 1`, etc.
5. **Verify with the sanity grep** before opening a PR: `bash packages/qfai/scripts/check-no-legacy-concepts.sh` should print `OK: no legacy v1.x prototyping concepts present`.

## What didn't change

- `qfai validate` / `qfai report` / `qfai doctor` shells.
- The shared completion-certificate digest mechanism (cert is still the only valid DONE signal).
- `playwrightCliLauncher.ts` / `specResolution.ts` / `policy.ts`.
- The QFAI-PROT-150..155 evidence error code numbers (still in the message dictionary; the v2.0 validator just emits a smaller set under the QFAI-PROT2-* namespace).
- All non-prototyping skills' core flow (`/qfai-atdd`, `/qfai-configure`, `web-research`, etc.).
