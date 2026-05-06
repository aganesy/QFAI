# 05 Examples

## EX-0012-0001: Declared Screen Has Complete Evidence

- BR-Ref: BR-0012-0002
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And `.qfai/evidence/prototyping/iter-NN/orders-dashboard.png` exists
- And `.qfai/evidence/prototyping/iter-NN/orders-dashboard.html` exists
- Then validate does not emit `QFAI-UIE-001/002` for that screen

## EX-0012-0002: Screenshot Missing

- BR-Ref: BR-0012-0003
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the HTML snapshot exists
- And the screenshot does not exist
- Then validate emits `QFAI-UIE-001`
- And the skill must rerun capture before completion

## EX-0012-0003: HTML Missing

- BR-Ref: BR-0012-0003
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the screenshot exists
- And the HTML snapshot does not exist
- Then validate emits `QFAI-UIE-002`
- And the skill must rerun capture before completion

## EX-0012-0086: Step 0 Planning

- BR-Ref: BR-0012-0001
- Given `/qfai-prototyping` starts a new iteration
- When the skill prepares execution planning
- Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`

## EX-0012-0089: Evaluator Inputs

- BR-Ref: BR-0012-0005
- Given screenshots and HTML snapshots are captured
- And root `DESIGN.md` is available as brand SSOT
- And the `lap-001..008` catalog is available
- And prior reviewer review.json context exists from a previous iter
- Then the reviewer (product-surface-reviewer) receives all input classes before scoring

## EX-0012-0098: Delegation Scope And Reviewer Roles

- BR-Ref: BR-0012-0004
- Given `/qfai-prototyping` declares a Delegation Scope Table
- Then UI implementation, screenshot capture, evaluation scoring, and build roles are named explicitly
- And invalid role assignments are surfaced as findings

## EX-0012-0099: Validate Gate Before Completion

- BR-Ref: BR-0012-0006
- Given prototyping evidence exists
- When completion is evaluated
- Then `qfai validate --fail-on error` is required before the run can be accepted

## EX-0012-0100: Verify Gate Blocks On REVISE

- BR-Ref: BR-0012-0007
- Given `/qfai-verify` leaves a `REVISE` review artifact
- Then prototyping completion remains blocked

## EX-0012-0101: Non-UI Exclusion

- BR-Ref: BR-0012-0009
- Given a spec is classified as `ui_bearing: false`
- When prototyping execution scope is determined
- Then the spec is excluded from prototyping execution
- And missing screen contracts do not over-fire UI evidence requirements

## EX-0012-0102: Legacy Traceability Space Retained

- BR-Ref: BR-0012-0008, BR-0012-0010
- Given legacy traceability IDs remain present in historical ledgers
- And legacy validator slices (executionPlan / Lighthouse / designSystemCompliance / calibration overrides) remain available as validator/reference behavior only
- Then current documentation keeps the identifier space reserved
- And it does not restore weighted-total-only runtime narratives
- And the legacy validation slice is not surfaced as a public mode contract

## EX-0012-0110: Convergence on iter-08

- BR-Ref: BR-0012-0024
- Given the run produces 9 iters where iter-08 has all 4 UX axes `exceptional`, `layoutAntiPatternsDetected: []`, and `designMdViolations: []`.
- When `qfai prototyping iterate --cycle 9` runs.
- Then it returns exit 64. `prototyping.json#stopReason` is `"axes-exceptional"`. `acceptedIterationIndex === 8`.

## EX-0012-0111: Pivot triggered by 3-low-IA + latest lap-\*

- BR-Ref: BR-0012-0021
- Given iter-05/06/07 each with `informationArchitecture: "acceptable"` and iter-07 with `layoutAntiPatternsDetected: ["lap-002-deadend-flow"]`.
- When `computePivotDirective(history)` runs.
- Then it returns `"pivot"`. With latest `layoutAntiPatternsDetected: []`, returns `"refine"`.

## EX-0012-0112: Cycle ≥1 hash mismatch forces re-run

- BR-Ref: BR-0012-0026
- Given `prototyping.json#designMdSha256 === "abc123..."` and the user edits `DESIGN.md` between cycles to hash `"def456..."`.
- When `qfai prototyping iterate --cycle 1` runs.
- Then exit code is `2`, stderr contains `"DESIGN.md hash mismatch — re-run from cycle 0"`.

## EX-0012-0113: convergence blocked by designMdViolations

- BR-Ref: BR-0012-0024
- Given iter-09 with all 4 UX axes `exceptional` and `layoutAntiPatternsDetected: []` but `designMdViolations: [{category: "shadow", expected: "0 1px 2px rgba(0,0,0,0.06)", found: "0 8px 24px rgba(0,0,0,0.20)", location: "card.tsx:32"}]`.
- When `qfai prototyping iterate --cycle 10` runs.
- Then exit code is `0` (continue); convergence is not declared.

## EX-0012-0114: design-system mirrors DESIGN.md post-loop

- BR-Ref: BR-0012-0027
- Given a fresh run starting cycle 0 with frozen `DESIGN.md`.
- When the contracts are checked.
- Then `.qfai/contracts/design/design-system.yaml` does NOT exist pre-loop. Post-handoff, it is generated as a deterministic byte-equivalent mirror of `DESIGN.md` token tables.

## EX-0012-0115: Single lineage at run start

- BR-Ref: BR-0012-0017
- Given a fresh `/qfai-prototyping` run.
- When `qfai prototyping iterate --cycle 0` is called.
- Then exactly one `iter-00/` directory is created, and no parallel `candidates/` directory is produced.
- And subsequent `iterate --cycle <n>` continue the same lineage as `iter-NN/` siblings under the same run.

## EX-0012-0116: Latest-accepted policy holds across cycles

- BR-Ref: BR-0012-0018
- Given `prototyping.json#iterations[]` has 7 entries with indices 0..6.
- When `acceptedIterationIndex` is read.
- Then it equals `iterations.length - 1` (i.e. 6), regardless of any prior iter having higher ordinal scores; no best-of-history selection is applied.

## EX-0012-0117: review.json schema enforces 4 UX axes ordinal

- BR-Ref: BR-0012-0019
- Given an `iter-NN/review.json` with `scores` containing only `informationArchitecture: "strong"`, `navigationFlow: "strong"`, `usability: "strong"`, `functionality: "exceptional"`.
- When validate runs.
- Then no schema finding is raised. With a missing axis or an extra key, `QFAI-PROT-020` is emitted; with a `critique` of 50 words, `QFAI-PROT-022` is emitted; with `pivotDirective: "stop"`, `QFAI-PROT-023` is emitted.

## EX-0012-0118: lap-\* whitelist and IA acceptable cap

- BR-Ref: BR-0012-0020
- Given `iter-NN/review.json` with `layoutAntiPatternsDetected: ["lap-001-orphan-page"]` and `informationArchitecture: "strong"`.
- When validate runs.
- Then `QFAI-PROT-021` is raised because the lap detection caps `informationArchitecture` at `acceptable`. With `informationArchitecture: "acceptable"` the finding is not raised.

## EX-0012-0119: ordinalIndex monotonic mapping

- BR-Ref: BR-0012-0022
- Given the ordinal scale `weak < acceptable < strong < exceptional`.
- When `ordinalIndex` is applied.
- Then `ordinalIndex(weak) === 0`, `ordinalIndex(acceptable) === 1`, `ordinalIndex(strong) === 2`, `ordinalIndex(exceptional) === 3`. Other inputs are rejected by the type guard.

## EX-0012-0120: Generator and evaluator are distinct sub-agents

- BR-Ref: BR-0012-0023
- Given `/qfai-prototyping` declares the delegation map.
- When the iteration loop dispatches generation and review.
- Then `product-experience-architect` performs generation and `product-surface-reviewer` performs evaluation as two distinct sub-agent identities; reusing the same identity for both raises a delegation finding (self-preference bias prevention).

## EX-0012-0121: SKILL.md size budget enforcement

- BR-Ref: BR-0012-0025
- Given the shipped `qfai-prototyping/SKILL.md` and its 5 reference files.
- When line counts are measured.
- Then `SKILL.md` ≤ 130 lines, and `iteration-loop.md` (≤ 80) + `generator-prompt.md` (≤ 60) + `reviewer-prompt.md` (≤ 100) + `handoff.md` (≤ 50) + `design-md-spec.md` (≤ 120) combined ≤ 410 lines.
