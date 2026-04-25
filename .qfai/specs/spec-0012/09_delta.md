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

## Migration / Follow-ups (compat=Change)

- **library-export removal**: commit `3ef3b135 chore!: remove Node Playwright adapters, capture-screenshots.js, MCP remnants` deleted `createPlaywrightRenderAdapter` and `createPlaywrightBrowserQaProvider` from `packages/qfai/src/core/index.ts`. External consumers that imported these symbols directly must migrate to the Playwright CLI path:
  - prefer `qfai prototyping round-start ...` for the supported entry point;
  - or build command plans via `buildPlaywrightCliCommandPlan` (still exported) and run them through the user's own Playwright CLI invocation.
  - rationale: spec-0017 retired the Node Playwright runtime + playwright-mcp residue in favor of a single Playwright CLI surface.
- **runtime evidence schema**: V1 (`iterations[]`) records remain valid against the validator. Re-running `qfai init --force` only refreshes skill assets and the shipped `.github/workflows/qfai-validate.yml`; no data migration required.
- **CI workflow**: the shipped `qfai-validate.yml` pins `node-version: "20"` and uses `npm ci`. Projects on pnpm/yarn keep the file but swap the install step (a comment in the file points to this).
- **deferred** (tracked under PR Open Questions / Follow-ups): pnpm/yarn variants of the shipped workflow, full-removal timing for V1 lifecycle paths.
