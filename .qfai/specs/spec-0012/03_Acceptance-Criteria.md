# 03 Acceptance Criteria

## AC-0012-0001

- `/qfai-prototyping` documents Step 0 execution planning before the first capture/evaluation cycle.
- Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
- Delegation scope and invalid role handling are documented in the same execution-planning posture.

## AC-0012-0002

- Declared screen evidence uses the canonical screenshot and HTML snapshot paths.
- Documentation names the canonical paths explicitly.

## AC-0012-0003

- Missing screenshot or HTML evidence is fail-closed.
- Capture guidance does not allow fake evidence generation.

## AC-0012-0004

- Evaluator/reviewer role ownership is documented.
- The skill spells out which roles own implementation, screenshot capture, evaluation scoring, and build.

## AC-0012-0005

- Evaluator input guidance names screenshots, HTML snapshots, rubric/calibration inputs, prior reviewer-score context, and design-system input.
- Review guidance also names the visual checklist categories used during scoring.

## AC-0012-0006

- `qfai validate --fail-on error` is documented as the machine gate before completion.

## AC-0012-0007

- `/qfai-verify` is documented as the final review gate.
- Completion remains blocked on `REVISE`.

## AC-0012-0008

- Legacy validation slices may still require `executionPlan`, Lighthouse evidence, design-system compliance, and calibration overrides.
- These requirements are documented as validator/reference behavior, not as a public mode contract.

## AC-0012-0009

- `ui_bearing: false` specs are excluded from prototyping execution.
- Missing screen contracts do not over-fire UI-only requirements for non-UI specs.

## AC-0012-0010

- Legacy traceability identifier space remains reserved.
- Active wording does not reintroduce superseded weighted-total narratives.

## AC-0012-0020: Single-Thread Serial Iteration

- Given `/qfai-prototyping` is invoked with a frozen root `DESIGN.md`,
- When the iteration loop runs,
- Then exactly one prototype lineage is evolved across cycles 0..14 (max 15 iterations) with no parallel candidate funnel.

## AC-0012-0021: 4 UX Axes Ordinal Schema

- Given any `iter-NN/review.json`,
- When validated,
- Then `scores` contains exactly the keys `informationArchitecture`, `navigationFlow`, `usability`, `functionality`, each ordinal in `{weak, acceptable, strong, exceptional}`. Missing or extra keys raise `QFAI-PROT-020`.

## AC-0012-0022: Prose Critique Length

- Given any `iter-NN/review.json`,
- When validated,
- Then `critique` is a single string between 200 and 500 words inclusive. Out-of-range raises `QFAI-PROT-022`.

## AC-0012-0023: pivotDirective Enum

- Given any `iter-NN/review.json`,
- When validated,
- Then `pivotDirective` is exactly one of `"continue" | "refine" | "pivot"`. Other values raise `QFAI-PROT-023`.

## AC-0012-0024: Layout-Anti-Pattern IA Cap

- Given any `iter-NN/review.json` where `layoutAntiPatternsDetected.length > 0`,
- When validated,
- Then `scores.informationArchitecture` is in `{weak, acceptable}`. `strong` or `exceptional` raises `QFAI-PROT-021`.

## AC-0012-0025: lap-\* Whitelist

- Given any `iter-NN/review.json`,
- When validated,
- Then every entry in `layoutAntiPatternsDetected[]` is one of `lap-001-orphan-page`, `lap-002-deadend-flow`, `lap-003-hidden-state`, `lap-004-broken-back`, `lap-005-mystery-meat-nav`, `lap-006-no-empty-state`, `lap-007-no-error-state`, `lap-008-no-back-affordance`. Unknown tokens raise `QFAI-PROT-025`.

## AC-0012-0026: pivotDirective Rule — pivot

- Given the latest 3 iters each have `informationArchitecture ∈ {weak, acceptable}` and the latest iter has `layoutAntiPatternsDetected.length > 0`,
- When `computePivotDirective(history)` runs,
- Then it returns `"pivot"`.

## AC-0012-0027: pivotDirective Rule — continue

- Given the latest iter has `≥ 2` of the 4 UX axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter,
- When `computePivotDirective(history)` runs,
- Then it returns `"continue"`. Otherwise (and not `pivot`) it returns `"refine"`.

## AC-0012-0028: Deterministic Stop on Convergence

- Given the latest iter has all 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0`,
- When `qfai prototyping iterate --cycle <n+1>` runs,
- Then it exits with code `64` and prints "convergence reached".

## AC-0012-0029: Deterministic Stop on Max Iterations

- Given the latest iter has `index === 14`,
- When `qfai prototyping iterate --cycle 15` runs,
- Then it exits with code `65` and prints "max iterations reached".

## AC-0012-0030: Per-Iter Evidence Layout

- Given `.qfai/evidence/prototyping/iter-NN/`,
- When listed,
- Then it contains exactly the files matching `<screen>.png`, `<screen>.html`, `review.json`. Extra files (e.g., `screenshots/`, `html/` subdirs, `breakthrough.json`, `concept.json`) raise `QFAI-PROT-030`.

## AC-0012-0031: SKILL.md Size Budget

- Given `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`,
- When line-counted,
- Then total lines ≤ 130. The 5 references files combined ≤ 410.

## AC-0012-0032: CLI iterate exit codes

- Given `qfai prototyping iterate --cycle <n>` runs,
- When the cycle completes,
- Then exit code is one of `0` (continue, read pivotDirective), `64` (axes-exceptional convergence), `65` (max-iterations reached), `2` (input error or DESIGN.md hash mismatch). No other exit codes are emitted.

## AC-0012-0033: CLI certify exit codes

- Given `qfai prototyping certify --check`,
- When run after the loop terminates,
- Then exit code `0` indicates DONE; non-zero indicates failure with diagnostic output naming the missing artifact.

## AC-0012-0034: Cycle 0 Records designMdSha256

- Given `qfai prototyping iterate --cycle 0`,
- When it completes,
- Then `prototyping.json#designMdSha256` is set to `sha256(DESIGN.md bytes)` and matches `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256` exactly.

## AC-0012-0035: Cycle ≥1 hash gate

- Given `prototyping.json#designMdSha256 === H_recorded`,
- When `qfai prototyping iterate --cycle <n>` (n ≥ 1) runs and on-disk `sha256(DESIGN.md) !== H_recorded`,
- Then it exits with code `2` and stderr contains `"DESIGN.md hash mismatch"`. The user must restore `DESIGN.md` or re-run the SDD freeze and restart from cycle 0.

## AC-0012-0036: design-system as DESIGN.md Mirror

- Given `.qfai/contracts/design/design-system.yaml` is generated post-loop,
- When its token tables are compared to root `DESIGN.md`,
- Then color / typography / radius / shadow are byte-equivalent. Drift raises `QFAI-DCON-032`.

## Completion Gate

- `/qfai-prototyping` completion requires `qfai validate --fail-on error` pass.
- Declared screen evidence must include both screenshot and HTML snapshot.
- `/qfai-verify` must leave a review artifact with `PASS` or `REVISE`.

## Superseded Contract Notes

- Active docs must not present `qfai prototyping` as a valid public orchestration command (only `iterate` / `certify` / `show-spec` are public).
- Active docs must not present weighted-total scoring or `allReviewerAxesPerfect100` as the current evidence contract.
- Internal mode helpers / fullHarness / scoringTrace / iterationBudget references have been purged from the active spec surface (see `09_delta.md` CHG-001).
