# 05 Examples

## EX-0017-0001: Convergence on iter-08

- BR-Ref: BR-0017-0007
- Given a UI-bearing spec, the run produces 9 iters where iter-08 has all 4 axes `exceptional` and `slopPatternsDetected: []`.
- When `qfai prototyping iterate --cycle 9` runs.
- Then it returns exit 64. `prototyping.json#stopReason` is `"axes-exceptional"`. `acceptedIterationIndex === 8`.

(UX-loop redesign: deprecated; convergence now also requires `layoutAntiPatternsDetected: []` AND `designMdViolations: []`, and the 4 axes are the UX set `{informationArchitecture, navigationFlow, usability, functionality}`. The `slopPatternsDetected` field is removed. See EX-0017-0017 / AC-0017-0007 / 09_delta.md OP-0003 / OP-0021.)

## EX-0017-0002: Pivot at iter-10 (Dutch museum analog)

- BR-Ref: BR-0017-0005, BR-0017-0006
- Given iter-00..iter-09 produce a polished but generic dashboard-style layout. iter-09 review has `scores.originality: acceptable` and `slopPatternsDetected: ["slop-002-saas-dashboard"]` for the 3rd consecutive iter.
- When the reviewer emits `pivotDirective: "pivot"` and the generator at iter-10 scraps prior approach.
- Then iter-10 produces a 3D-room CSS perspective spatial experience. iter-10 review records `originality: exceptional` and `slopPatternsDetected: []`. The leap is accepted regardless that `craft` temporarily dropped from `strong` to `acceptable`.

(UX-loop redesign: deprecated; pivot now triggers on "3 consecutive low-IA + latest has lap-*" (BR-0017-0006 / AC-0017-0021). The `originality` / `craft` axes and `slopPatternsDetected` field are removed. See EX-0017-0018 / 09_delta.md OP-0005 / OP-0009 / OP-0021.)

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

(UX-loop redesign: deprecated; the anti-slop cap is replaced by the layout-anti-pattern cap on `informationArchitecture` (BR-0017-0005 / AC-0017-0005). `slopPatternsDetected` is replaced by `layoutAntiPatternsDetected` and the `originality` axis is removed. See EX-0017-0019 / 09_delta.md OP-0002 / OP-0008 / OP-0021.)

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

(UX-loop redesign: deprecated example anchor uses `originality` axis which is removed. The ordinal anchor BR (BR-0017-0004) still applies, but to the new UX axes `{informationArchitecture, navigationFlow, usability, functionality}`. See 09_delta.md OP-0001 / OP-0021.)

## EX-0017-0012: reference pool deviation framing

- BR-Ref: BR-0017-0008
- Given a `reference-pool.yaml` with shadcn-style design references.
- When the reviewer evaluates an iter that closely resembles those references.
- Then `slopPatternsDetected` includes the matching anti-slop ID and `originality` is capped at `acceptable`. Similarity is not rewarded.

(UX-loop redesign: deprecated; `reference-pool.yaml` is removed and the "deviate from" framing is reversed. Brand compliance is now positive, sourced from root `DESIGN.md` via `findDesignMdViolations` (BR-0017-0008 / BR-0017-0015). See EX-0017-0016 / 09_delta.md OP-0007 / OP-0011b / OP-0021.)

## EX-0017-0013: design-system mirrors DESIGN.md (UX-loop)

- BR-Ref: BR-0017-0009
- Given a fresh `/qfai-prototyping` run starting cycle 0 with a frozen `DESIGN.md`.
- When the contracts are checked.
- Then `.qfai/contracts/design/design-system.yaml` does NOT exist pre-loop. Post-handoff, it is generated as a deterministic byte-equivalent mirror of `DESIGN.md` token tables (color / font / radius / shadow). It does not depend on the final iter HTML measurements. (UX-loop redesign: replaces the prior "extract from final iter HTML" semantics — see 09_delta.md OP-0004.)

## EX-0017-0014: DESIGN.md frozen at SDD Phase 0

- BR-Ref: BR-0017-0013
- Given a `/qfai-discussion` pack that produces a draft `DESIGN.md` accepted by the user.
- When `/qfai-sdd` Phase 0 runs.
- Then validator DCON-030 confirms DESIGN.md structure (color/font/radius/shadow token tables present), and `.qfai/contracts/design/DESIGN.md.lock.yaml` is written with `sha256: <hex>` matching `sha256(DESIGN.md)`. If `DESIGN.md` is missing, Phase 0 raises `QFAI-PROT2-030` and halts.

## EX-0017-0015: cycle ≥1 hash mismatch forces re-run

- BR-Ref: BR-0017-0013
- Given `prototyping.json#designMdSha256 === "abc123..."` recorded at cycle 0, and the user manually edits `DESIGN.md` between cycles, changing the hash to `"def456..."`.
- When `qfai prototyping iterate --cycle 1` runs.
- Then exit code is `2`, stderr contains `"DESIGN.md hash mismatch — re-run from cycle 0"`, `QFAI-PROT2-031` is emitted, and no iter-01 directory is created.

## EX-0017-0016: designMdViolations from a non-compliant iter

- BR-Ref: BR-0017-0015
- Given an iter HTML that uses `color: #FF00FF` while `DESIGN.md` lists only `#0F172A` and `#3B82F6` as approved colors.
- When `findDesignMdViolations(html, designMd)` is called.
- Then it returns `[{category: "color", expected: "#0F172A or #3B82F6", found: "#FF00FF", location: "css selector .header"}]` deterministically (same input → same output, no I/O), and the reviewer copies this verbatim into `review.json#designMdViolations`.

## EX-0017-0017: convergence blocked by designMdViolations

- BR-Ref: BR-0017-0007
- Given iter-09 with all 4 UX axes `exceptional` and `layoutAntiPatternsDetected: []` but `designMdViolations: [{category: "shadow", ...}]`.
- When `qfai prototyping iterate --cycle 10` runs.
- Then exit code is `0` (continue), convergence is not declared, and the reviewer is expected to fix the shadow token in iter-10.

## EX-0017-0018: pivot triggered by 3-low-IA + latest lap-*

- BR-Ref: BR-0017-0006
- Given iter-05/06/07 each with `informationArchitecture: "acceptable"` and iter-07 with `layoutAntiPatternsDetected: ["lap-002-deadend-flow"]`.
- When `computePivotDirective(history)` runs.
- Then it returns `"pivot"`. If iter-07 had `layoutAntiPatternsDetected: []`, it would return `"refine"` instead (no actionable structural signal).

## EX-0017-0019: lap catalog detection on a deadend flow

- BR-Ref: BR-0017-0014
- Given an iter HTML rendering a 3-step checkout where the final step has neither a "Place order" CTA nor a "Cancel" affordance (deadend).
- When the reviewer evaluates the iter.
- Then `layoutAntiPatternsDetected` includes `"lap-002-deadend-flow"`. `informationArchitecture` is capped at `acceptable`. lap-006 / lap-008 are also recorded if applicable. Unknown tokens (e.g. `"lap-999-fake"`) raise `QFAI-PROT2-032`.

## EX-0017-0020: legacy slop tokens are inactive

- BR-Ref: BR-0017-0016
- Given a reviewer prompt that historically contained `slop-001-shadcn-zinc` and `slop-008-glass-card` as active anti-patterns.
- When the post-redesign prompt is scanned.
- Then those tokens are absent from the active anti-pattern catalog. They appear only in `09_delta.md` history rows. Reintroducing them as active tokens fails the skill validator assertion.

## EX-0017-0021: DCON-030/031/032 active, DCON-005..016 retired

- BR-Ref: BR-0017-0016
- Given the post-redesign validator registry.
- When the active design-contract validator IDs are listed.
- Then the active set is `{DCON-030, DCON-031, DCON-032}` (and legacy `DCON-008` for prototype-handoff). Old `DCON-005..016` series are not registered as active validators; their numbers are not reused (gap-allowed renumber).
