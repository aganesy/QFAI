# 04 Business Rules

## BR-0012-0001: Skill-First Interface

- AC-Refs: AC-0012-0001
- `/qfai-prototyping [--auto]` が active interface である。
- `qfai prototyping` は active public command ではない。

## BR-0012-0002: Mandatory UI Evidence

- AC-Refs: AC-0012-0002
- Every declared screen in `.qfai/contracts/ui/*.yaml` must have:
  - `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
  - `.qfai/evidence/prototyping/html/<screen-id>.html`

## BR-0012-0003: Missing Evidence Is Fail-Closed

- AC-Refs: AC-0012-0003
- If either the screenshot or HTML snapshot is missing, the screen is treated as incomplete.
- The iteration cannot be accepted until evidence is re-captured.

## BR-0012-0004: Evaluator Roles

- AC-Refs: AC-0012-0004
- L1 evaluates implementation fidelity and blocking UI failures.
- L2 evaluates product experience, exploration rubric, and design-system alignment.
- L3 performs reviewer / verify gate auditing.

## BR-0012-0005: Evaluator Inputs

- AC-Refs: AC-0012-0005
- L1/L2 evaluation uses screenshots, HTML snapshots, evaluation rubric, evaluator calibration, prior reviewer-score context, and finalized design system.
- Reviewer findings must explicitly name missing mandatory inputs.

## BR-0012-0006: Validate Gate

- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is the machine gate for schema/evidence integrity.
- Validate does not replace human/sub-agent evaluation.

## BR-0012-0007: Verify Gate

- AC-Refs: AC-0012-0007
- `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings.
- Completion is blocked on `REVISE`.

## BR-0012-0008: Legacy Validation Slice

- AC-Refs: AC-0012-0008
- The following artifacts may still be validated when present:
  - `executionPlan`
  - Lighthouse evidence for legacy web validation
  - `designSystemCompliance`
  - calibration overrides
- These checks are validator/reference behavior only and must not be interpreted as a public runtime contract.

## BR-0012-0009: Non-UI Exclusion

- AC-Refs: AC-0012-0009
- `ui_bearing: false` specs are excluded from prototyping execution.
- Validate must not over-fire UI evidence rules when there is no screen contract.

## BR-0012-0010: Legacy Traceability IDs

- AC-Refs: AC-0012-0010
- Existing user-story IDs and legacy test-case identifier space remain reserved.
- New wording may supersede old runtime narratives without renumbering historical coverage IDs.

## BR-0012-0011: Internal Mode Budgets

- AC-Refs: AC-0012-0011
- Internal mode helper budgets are low-cost=1, standard=3, full-harness=20.
- These values guide iteration limits but are not a public user-facing negotiation contract.

## BR-0012-0012: Reviewer-Score Iteration Schema

- AC-Refs: AC-0012-0012
- `fullHarness.iterations[]` records `reviewerScores[]`, `allReviewerAxesPerfect100`, evidence refs, limitations, and change summary.
- Per-axis evidence is attached through reviewer score entries, not a weighted-total aggregate.

## BR-0012-0013: Snapshot Scoring Trace

- AC-Refs: AC-0012-0013
- `fullHarness.scoringTrace[]` is derived from iteration snapshots.
- Each snapshot stores reviewer count, axis count, min score, average score, `allReviewerAxesPerfect100`, and commit SHA.

## BR-0012-0014: Termination Rule

- AC-Refs: AC-0012-0014
- If the latest iteration has `allReviewerAxesPerfect100=true`, termination reason is `converged`.
- If any reviewer axis is below 100, completion is blocked even when the score is 95 or higher.
- Winner selection is not completion; stage completion requires post-selection polish and a completion certificate.
- Otherwise, reaching the configured max iteration budget yields `max-iterations`.

## BR-0012-0015: Result Writer Summary

- AC-Refs: AC-0012-0015
- Full-harness result output reports the latest snapshot summary.
- Result output reports `iterationBudget.maxIterations` and `iterationBudget.remainingIterations`.

## BR-0012-0016: Originality and Hard-Floor Enforcement in Absorption Rounds

- AC-Refs: AC-0012-0019
- For each candidate present in an absorption round (`r3|r2|r1`), every `perAxis[].score` recorded in `<round>/evaluator-reviews/<candidate-id>.json` MUST be greater than or equal to the `min_score` declared in `evaluation-rubric.yaml` `hard_floors[]` for the matching `axisId`.
- Violations MUST emit `QFAI-PROT-AXIS-FLOOR-001` at error severity. The round MUST NOT be considered ready for narrow advance until violations are resolved.
- `r5` (initial divergent generation) is excluded so that exploration is not gated by hard floors before absorption begins.
- `hard_floors[].id` whose value is not present in `perAxis` (例: `conceptFit`) is skipped here and is enforced through other gates.
- Compatibility: `axisId` matching is exact-string against `axes[].id`; case or hyphen normalization is not performed.

