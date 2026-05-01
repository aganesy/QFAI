# 05 Examples

## EX-0017-0001: Convergence on iter-08

- BR-Ref: BR-0017-0007
- Given a UI-bearing spec, the run produces 9 iters where iter-08 has all 4 axes `exceptional` and `slopPatternsDetected: []`.
- When `qfai prototyping iterate --cycle 9` runs.
- Then it returns exit 64. `prototyping.json#stopReason` is `"axes-exceptional"`. `acceptedIterationIndex === 8`.

## EX-0017-0002: Pivot at iter-10 (Dutch museum analog)

- BR-Ref: BR-0017-0005, BR-0017-0006
- Given iter-00..iter-09 produce a polished but generic dashboard-style layout. iter-09 review has `scores.originality: acceptable` and `slopPatternsDetected: ["slop-002-saas-dashboard"]` for the 3rd consecutive iter.
- When the reviewer emits `pivotDirective: "pivot"` and the generator at iter-10 scraps prior approach.
- Then iter-10 produces a 3D-room CSS perspective spatial experience. iter-10 review records `originality: exceptional` and `slopPatternsDetected: []`. The leap is accepted regardless that `craft` temporarily dropped from `strong` to `acceptable`.

## EX-0017-0003: Max iterations exhaustion

- BR-Ref: BR-0017-0007
- Given a project where iter-00..iter-14 never reaches all-axes-exceptional.
- When `qfai prototyping iterate --cycle 15` runs.
- Then it returns exit 65. `stopReason: "max-iterations"`. `acceptedIterationIndex === 14`. The run still proceeds to handoff and certification with the iter-14 artifact.

## EX-0017-0004: Anti-slop cap blocks completion

- BR-Ref: BR-0017-0005
- Given iter-12 with all 4 scores marked `exceptional` but `slopPatternsDetected: ["slop-001-shadcn-zinc"]`.
- When the validator runs.
- Then it raises `QFAI-PROT2-021` and `iterate --cycle 13` returns exit 0 (continues). Convergence is not reached.

## EX-0017-0005: Best-of-history is gone

- BR-Ref: BR-0017-0003
- Given iter-08 scores `(strong, exceptional, strong, strong)` and iter-09 scores `(acceptable, acceptable, acceptable, acceptable)` after a pivot.
- When `acceptedIterationIndex` is computed.
- Then it equals `9`. iter-09 is the artifact even though iter-08 had higher aggregate scores.

## EX-0017-0006: Cross-skill simplification

- BR-Ref: BR-0017-0011
- Given a fresh `/qfai-discussion` UI-bearing run.
- When the produced sidecars are listed.
- Then they are `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`, `40_screen_contracts.md`, `50_review_input_bundle.md`. The legacy `33_exploration_rubric.md` and `34_evaluator_calibration.md` are not produced.

## EX-0017-0007: Sanity grep blocks legacy reintroduction

- BR-Ref: BR-0017-0010
- Given a PR that adds a file containing `const PROTOTYPING_MODES = ["low-cost"]`.
- When the CI step `bash packages/qfai/scripts/check-no-legacy-concepts.sh` runs.
- Then it exits non-zero with output `FAIL: leaked low-cost`.

## EX-0017-0008: Skill size budget enforcement

- BR-Ref: BR-0017-0012
- Given an SKILL.md edit that grows `qfai-prototyping/SKILL.md` to 145 lines.
- When the skill validator runs.
- Then it raises an error indicating the budget (`≤ 130`) is exceeded.

## EX-0017-0009: Single lineage at run start

- BR-Ref: BR-0017-0001
- Given a fresh `/qfai-prototyping` run.
- When `qfai prototyping iterate --cycle 0` is called.
- Then exactly one `iter-00/` directory is created, and no parallel `candidates/` directory is produced. Subsequent `iterate --cycle N` continue the same lineage.

## EX-0017-0010: iter index contiguity

- BR-Ref: BR-0017-0002
- Given a `prototyping.json` with `iterations: [{index: 0}, {index: 1}, {index: 2}]`.
- When the validator runs.
- Then it passes. With `iterations: [{index: 0}, {index: 2}, {index: 3}]`, it raises `QFAI-PROT2-004`.

## EX-0017-0011: ordinal score anchors

- BR-Ref: BR-0017-0004
- Given an iter review with `scores.originality: "strong"`.
- When the prose critique is checked.
- Then it must reference the behavioral anchor for `strong` ("clearly above baseline, memorable on this axis"), not a numeric reasoning ("85/100").

## EX-0017-0012: reference pool deviation framing

- BR-Ref: BR-0017-0008
- Given a `reference-pool.yaml` with shadcn-style design references.
- When the reviewer evaluates an iter that closely resembles those references.
- Then `slopPatternsDetected` includes the matching anti-slop ID and `originality` is capped at `acceptable`. Similarity is not rewarded.

## EX-0017-0013: design-system as output, not input

- BR-Ref: BR-0017-0009
- Given a fresh `/qfai-prototyping` run starting cycle 0.
- When the contracts are checked.
- Then `.qfai/contracts/design/design-system.yaml` does NOT exist pre-loop. Post-handoff, it is generated from the final iter HTML and contains extracted color tokens, typography scale, spacing scale, radii, and shadows.
