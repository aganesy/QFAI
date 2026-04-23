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

## AC-0012-0011

- Internal mode budgets are documented as low-cost=1, standard=3, and full-harness=20.
- These values are framed as implementation detail rather than a negotiated public runtime interface.

## AC-0012-0012

- `fullHarness.iterations[]` stores `reviewerScores[]` and `allItemsPass95`.
- Weighted-total-only summaries are not the active schema.

## AC-0012-0013

- `fullHarness.scoringTrace[]` is derived from iteration snapshots.
- Snapshots record reviewer count, axis count, min score, average score, `allItemsPass95`, and commit SHA.

## AC-0012-0014

- Termination reason is `converged` when the latest iteration has `allItemsPass95=true`.
- Termination reason is `max-iterations` when the configured budget is exhausted without convergence.

## AC-0012-0015

- Full-harness result output includes `iterationBudget.maxIterations` and `iterationBudget.remainingIterations`.

## Completion Gate

- `/qfai-prototyping` completion requires `qfai validate --fail-on error` pass.
- Declared screen evidence must include both screenshot and HTML snapshot.
- `/qfai-verify` must leave a review artifact with `PASS` or `REVISE`.

## Superseded Contract Notes

- Active docs must not present `qfai prototyping` as a valid command.
- Active docs must not present weighted-total scoring as the current evidence contract.
- Internal mode helpers may still exist, provided they are clearly scoped as implementation detail.
