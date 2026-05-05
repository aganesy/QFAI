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

## 2026-04-26

- Added: REQ-0029 hard-floor enforcement (originality drop guard for absorption rounds)
- Added: BR-0012-0016, AC-0012-0019, EX-0012-0108, EX-0012-0109, TC-0012-0317, TC-0012-0318, TDD-0334, TDD-0335, DR-0012-0011
- Added: new validator `validateEvaluatorReviewHardFloor` (`packages/qfai/src/core/validators/evaluatorReviewHardFloor.ts`) wired into `runPrototypingValidators`
- Added: new issue code `QFAI-PROT-AXIS-FLOOR-001` (per-axis score below rubric `hard_floors[].min_score`)
- Added: default rubric sample (`packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/evaluation-rubric.sample.yaml`) now ships an `originality` floor at `min_score: 80`
- Scope: enforcement applies to absorption rounds (`r3|r2|r1`); `r5` is exempt because the divergent stage should not be hard-floor gated
- Rationale: protect funnel distinctness against gradual originality drift across r5→r1 absorption; previously originality was the highest-weighted axis (3) but had no absolute floor

## Migration / Follow-ups (compat=Change)

- **library-export removal**: commit `3ef3b135 chore!: remove Node Playwright adapters, capture-screenshots.js, MCP remnants` deleted `createPlaywrightRenderAdapter` and `createPlaywrightBrowserQaProvider` from `packages/qfai/src/core/index.ts`. External consumers that imported these symbols directly must migrate to the Playwright CLI path:
  - prefer `qfai prototyping round-start ...` for the supported entry point;
  - or build command plans via `buildPlaywrightCliCommandPlan` (still exported) and run them through the user's own Playwright CLI invocation.
  - rationale: spec-0017 retired the Node Playwright runtime + playwright-mcp residue in favor of a single Playwright CLI surface.
- **runtime evidence schema**: V1 (`iterations[]`) records remain valid against the validator. Re-running `qfai init --force` only refreshes skill assets and the shipped `.github/workflows/qfai-validate.yml`; no data migration required.
- **CI workflow**: the shipped `qfai-validate.yml` pins `node-version: "20"` and uses `npm ci`. Projects on pnpm/yarn keep the file but swap the install step (a comment in the file points to this).
- **deferred** (tracked under PR Open Questions / Follow-ups): pnpm/yarn variants of the shipped workflow, full-removal timing for V1 lifecycle paths.

## 2026-05-06 — CHG-001 — Absorb spec-0017 (CAP-0017 v2.0 / UX-loop) into CAP-0012; purge legacy v1.x AC/BR/EX/TC/DR

- Trigger: spec-0017 violates `_policies/11_Slice-Policy.md` (1 spec = 1 CAP, 1 skill = 1 spec); content fully decomposed into spec-0012 (primary) + spec-0004 / 0010 / 0011 / 0013 / 0014 / 0015 / 0007 (cascade).
- Posture: destructive. Backward compatibility / existing-user impact intentionally disregarded per user instruction.

### Triage

| Source                        | Subject                                                               | Existing Spec | Operation     | Approved By   | Rationale                                                                            |
| ----------------------------- | --------------------------------------------------------------------- | ------------- | ------------- | ------------- | ------------------------------------------------------------------------------------ |
| spec-0017 (full content)      | Prototyping v2.0 single-thread / UX-loop redesign                     | spec-0012     | MERGE         | yusuke_senaga | spec-0012 is the canonical `/qfai-prototyping` skill spec; CAP-0012 absorbs CAP-0017 |
| spec-0017 (validator)         | DCON-030/031/032 / prototypingEvidenceV3 / lap-* / designMdViolations | spec-0004     | UPDATE:APPEND | yusuke_senaga | validate gate is owned by the qfai-validate spec                                     |
| spec-0017 (discussion)        | DESIGN.md draft + sidecar drop                                        | spec-0010     | UPDATE:APPEND | yusuke_senaga | discussion authoring is owned by the qfai-discussion spec                            |
| spec-0017 (implement)         | simplified handoff schema + design-system as input                    | spec-0011     | UPDATE:APPEND | yusuke_senaga | implement skill is owned by the qfai-implement spec                                  |
| spec-0017 (sdd)               | Phase 0 DESIGN.md sha256 lock + legacy contract drop                  | spec-0013     | UPDATE:APPEND | yusuke_senaga | SDD Phase 0 is owned by the qfai-sdd spec                                            |
| spec-0017 (verify)            | evidence path + full-harness language drop                            | spec-0014     | UPDATE:APPEND | yusuke_senaga | verify gate is owned by the qfai-verify spec                                         |
| spec-0017 (steering)          | agent-routing.yml prototyping rebuild + review-profiles.yml drop      | spec-0015     | UPDATE:APPEND | yusuke_senaga | agent routing is owned by the agent-routing spec                                     |

### CHG-001 — purge operations on spec-0012

| Op ID         | Op Type        | Target                                                       | Summary                                                                                                                                       |
| ------------- | -------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-PURGE-001  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0091                              | Lighthouse evidence narrative — purged                                                                                                        |
| OP-PURGE-002  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0092                              | design-system.yaml compliance recording narrative — purged                                                                                    |
| OP-PURGE-003  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0093                              | calibration overrides narrative — purged                                                                                                      |
| OP-PURGE-004  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0094                              | reviewerScores[] / allReviewerAxesPerfect100 narrative — purged                                                                               |
| OP-PURGE-005  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0095                              | scoringTrace[] derivation narrative — purged                                                                                                  |
| OP-PURGE-006  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0096                              | iterationBudget output narrative — purged                                                                                                     |
| OP-PURGE-007  | UPDATE:REMOVE  | 02_User-stories.md US-0012-0097                              | allReviewerAxesPerfect100 termination narrative — purged                                                                                      |
| OP-PURGE-010  | UPDATE:REMOVE  | 03_Acceptance-Criteria.md AC-0012-0011                       | Internal mode budgets (low-cost=1/standard=3/full-harness=20) — purged                                                                        |
| OP-PURGE-011  | UPDATE:REMOVE  | 03_Acceptance-Criteria.md AC-0012-0012..0019                 | fullHarness / scoringTrace / iterationBudget / allReviewerAxesPerfect100 / 95-vs-100 / completion certificate v1 / r3-r5 hard-floor — purged  |
| OP-PURGE-020  | UPDATE:REMOVE  | 04_Business-Rules.md BR-0012-0011..0016                      | Internal Mode Budgets / Reviewer-Score Iteration Schema / Scoring Trace / Termination Rule (95→100) / Result Writer / Hard-Floor — purged     |
| OP-PURGE-030  | UPDATE:REMOVE  | 05_Examples.md EX-0012-0090..0102, 0108..0109                | Initial Funnel 5→3→2→1 / Lighthouse Gate / Breakthrough Trigger / Reviewer-Score / Scoring Trace / Iteration Budget / Termination / 95-vs-100 / Hard-Floor — purged |
| OP-PURGE-040  | UPDATE:REMOVE  | 06_Test-Cases.md TC-0012-0287..0288                          | executionPlan validator legacy test cases — purged                                                                                            |
| OP-PURGE-041  | UPDATE:REMOVE  | 06_Test-Cases.md TC-0012-0297..0309                          | Lighthouse / designSystemCompliance / calibration / reviewerScores / scoringTrace / iterationBudget / mode budget / termination — purged      |
| OP-PURGE-042  | UPDATE:REMOVE  | 06_Test-Cases.md TC-0012-0314..0318                          | perfect-100 validator / completion certificate gate / hard-floor enforcement — purged                                                         |
| OP-PURGE-050  | UPDATE:REMOVE  | 07_Decisions.md DR-0012-0004 / 0006 / 0007 / 0008 / 0009 / 0011 | Legacy v1.x decisions (Legacy Validator Slice / Reviewer-Score Evidence Model / Snapshot Scoring Trace / Budget-Driven Termination / Perfect 100 Completion Gate / Hard-Floor Enforcement) — purged |
| OP-PURGE-060  | UPDATE:REMOVE  | tdd/test-list.md TDD-0317..0333                              | Absorbed legacy spec-0017 (Playwright CLI / round absorption) test ledger rows — purged                                                       |

### CHG-001 — append operations on spec-0012

| Op ID         | Op Type        | Target                                       | Summary                                                                                  |
| ------------- | -------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| OP-APPEND-001 | UPDATE:APPEND  | 02_User-stories.md US-0012-0098..0108        | spec-0017 US-0017-0001..0015 の v2.0 / UX-loop active 部分を spec-0012 番号で再採番      |
| OP-APPEND-002 | UPDATE:APPEND  | 03_Acceptance-Criteria.md AC-0012-0020..0036 | spec-0017 AC-0017-0001..0024 の v2.0 / UX-loop active 部分                               |
| OP-APPEND-003 | UPDATE:APPEND  | 04_Business-Rules.md BR-0012-0017..0027      | spec-0017 BR-0017-0001..0016 の v2.0 / UX-loop active 部分                               |
| OP-APPEND-004 | UPDATE:APPEND  | 05_Examples.md EX-0012-0110..0114            | spec-0017 EX-0017 の v2.0 / UX-loop active 部分                                          |
| OP-APPEND-005 | UPDATE:APPEND  | 06_Test-Cases.md TC-0012-0319..0353          | spec-0017 TC-0017-0001..0040 の v2.0 / UX-loop active 部分                               |
| OP-APPEND-006 | UPDATE:APPEND  | 07_Decisions.md DR-0012-0012..0025           | spec-0017 D-0017-0001..0022 の v2.0 / UX-loop active 部分                                |

### Notes

- `QFAI-PROT2-NNN` error prefix references in the absorbed spec-0017 content are **rewritten** during APPEND to use the actually-implemented prefixes `QFAI-PROT-NNN` / `QFAI-DCON-NNN` (per `packages/qfai/src/core/validators/prototypingEvidence.ts` and `designContractReadiness.ts`), since `QFAI-PROT2-` is on the distributed-surface forbidden list.
- spec-0017 番号は永久 gap として予約。再利用禁止 (`_policies/11_Slice-Policy.md` §ID 安定性ルール 5)。
- New v2.0 / UX-loop content references REQ-0012-0030..0041 added to `01_Spec.md`.
