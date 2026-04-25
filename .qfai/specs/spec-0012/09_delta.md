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

## 2026-04-25

- Absorbed:
  - former `spec-0017` Playwright CLI harness requirements, decisions, and test-case IDs
  - former `spec-0018` round / candidate / absorption harness requirements, decisions, and implemented test-case IDs
- Added:
  - absorbed legacy registries for `REQ-0017-*`, `REQ-0018-*`, `AC-0017-*`, `AC-0018-*`, `BR-0017-*`, `BR-0018-*`, `DEC-0017-*`, `DEC-0018-*`, `TC-0017-*`, and implemented `TC-0018-*`
  - round-based examples and traceability notes directly in `spec-0012`
- Removed:
  - parallel active prototyping spec packs `spec-0017/` and `spec-0018/`
- Rationale:
  - implementation is the SSOT; specs now describe the codebase instead of pulling code back toward superseded drafts
