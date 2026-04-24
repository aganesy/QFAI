# 09 delta

## 2026-04-22

- Adopted: reviewer-score centered full-harness evidence schema
- Superseded:
  - `weightedTotal` / `deltaFromPrevious` wording as active contract
  - `previousScore` as the canonical convergence artifact
- Added:
  - `reviewerScores[]` / `allReviewerAxesPerfect100` iteration wording

## Change Summary - Perfect 100 Completion Gate

- The former 95-point completion field semantics were replaced by `allReviewerAxesPerfect100`.
- Completion now requires post-selection polish, breakthrough check, completion certificate, and every reviewer axis score at 100.
- 95-point wording remains valid only as a quality-scale explanation, not as a completion border.
  - snapshot-based `scoringTrace[]`
  - `iterationBudget.maxIterations` / `remainingIterations`
  - budget-driven termination semantics
