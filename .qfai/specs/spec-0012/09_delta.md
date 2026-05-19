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

| Source                   | Subject                                                                | Existing Spec | Operation     | Approved By   | Rationale                                                                            |
| ------------------------ | ---------------------------------------------------------------------- | ------------- | ------------- | ------------- | ------------------------------------------------------------------------------------ |
| spec-0017 (full content) | Prototyping v2.0 single-thread / UX-loop redesign                      | spec-0012     | MERGE         | yusuke_senaga | spec-0012 is the canonical `/qfai-prototyping` skill spec; CAP-0012 absorbs CAP-0017 |
| spec-0017 (validator)    | DCON-030/031/032 / prototypingEvidenceV3 / lap-\* / designMdViolations | spec-0004     | UPDATE:APPEND | yusuke_senaga | validate gate is owned by the qfai-validate spec                                     |
| spec-0017 (discussion)   | DESIGN.md draft + sidecar drop                                         | spec-0010     | UPDATE:APPEND | yusuke_senaga | discussion authoring is owned by the qfai-discussion spec                            |
| spec-0017 (implement)    | simplified handoff schema + design-system as input                     | spec-0011     | UPDATE:APPEND | yusuke_senaga | implement skill is owned by the qfai-implement spec                                  |
| spec-0017 (sdd)          | Phase 0 DESIGN.md sha256 lock + legacy contract drop                   | spec-0013     | UPDATE:APPEND | yusuke_senaga | SDD Phase 0 is owned by the qfai-sdd spec                                            |
| spec-0017 (verify)       | evidence path + full-harness language drop                             | spec-0014     | UPDATE:APPEND | yusuke_senaga | verify gate is owned by the qfai-verify spec                                         |
| spec-0017 (steering)     | agent-routing.yml prototyping rebuild + review-profiles.yml drop       | spec-0015     | UPDATE:APPEND | yusuke_senaga | agent routing is owned by the agent-routing spec                                     |

### CHG-001 — purge operations on spec-0012

| Op ID        | Op Type       | Target                                                          | Summary                                                                                                                                                                                                                                                                                                |
| ------------ | ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OP-PURGE-001 | UPDATE:REMOVE | 02_User-stories.md US-0012-0091                                 | Lighthouse evidence narrative — purged                                                                                                                                                                                                                                                                 |
| OP-PURGE-002 | UPDATE:REMOVE | 02_User-stories.md US-0012-0092                                 | design-system.yaml compliance recording narrative — purged                                                                                                                                                                                                                                             |
| OP-PURGE-003 | UPDATE:REMOVE | 02_User-stories.md US-0012-0093                                 | calibration overrides narrative — purged                                                                                                                                                                                                                                                               |
| OP-PURGE-004 | UPDATE:REMOVE | 02_User-stories.md US-0012-0094                                 | reviewerScores[] / allReviewerAxesPerfect100 narrative — purged                                                                                                                                                                                                                                        |
| OP-PURGE-005 | UPDATE:REMOVE | 02_User-stories.md US-0012-0095                                 | scoringTrace[] derivation narrative — purged                                                                                                                                                                                                                                                           |
| OP-PURGE-006 | UPDATE:REMOVE | 02_User-stories.md US-0012-0096                                 | iterationBudget output narrative — purged                                                                                                                                                                                                                                                              |
| OP-PURGE-007 | UPDATE:REMOVE | 02_User-stories.md US-0012-0097                                 | allReviewerAxesPerfect100 termination narrative — purged                                                                                                                                                                                                                                               |
| OP-PURGE-010 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0011                          | Internal mode budgets (low-cost=1/standard=3/full-harness=20) — purged                                                                                                                                                                                                                                 |
| OP-PURGE-011 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0012..0019                    | fullHarness / scoringTrace / iterationBudget / allReviewerAxesPerfect100 / 95-vs-100 / completion certificate v1 / r3-r5 hard-floor — purged                                                                                                                                                           |
| OP-PURGE-020 | UPDATE:REMOVE | 04_Business-Rules.md BR-0012-0011..0016                         | Internal Mode Budgets / Reviewer-Score Iteration Schema / Scoring Trace / Termination Rule (95→100) / Result Writer / Hard-Floor — purged                                                                                                                                                              |
| OP-PURGE-030 | UPDATE:REMOVE | 05_Examples.md EX-0012-0090..0097, 0108..0109                   | Initial Funnel 5→3→2→1 / Lighthouse Gate / Reviewer-Score / Scoring Trace / Iteration Budget / Termination / 95-vs-100 / Hard-Floor — purged. EX-0012-0098..0102 (Delegation Scope, Validate/Verify Gates, Non-UI Exclusion, Legacy Traceability Space) remain active under v2.0 and are NOT included. |
| OP-PURGE-040 | UPDATE:REMOVE | 06_Test-Cases.md TC-0012-0287..0288                             | executionPlan validator legacy test cases — purged                                                                                                                                                                                                                                                     |
| OP-PURGE-041 | UPDATE:REMOVE | 06_Test-Cases.md TC-0012-0297..0309                             | Lighthouse / designSystemCompliance / calibration / reviewerScores / scoringTrace / iterationBudget / mode budget / termination — purged                                                                                                                                                               |
| OP-PURGE-042 | UPDATE:REMOVE | 06_Test-Cases.md TC-0012-0314..0318                             | perfect-100 validator / completion certificate gate / hard-floor enforcement — purged                                                                                                                                                                                                                  |
| OP-PURGE-050 | UPDATE:REMOVE | 07_Decisions.md DR-0012-0004 / 0006 / 0007 / 0008 / 0009 / 0011 | Legacy v1.x decisions (Legacy Validator Slice / Reviewer-Score Evidence Model / Snapshot Scoring Trace / Budget-Driven Termination / Perfect 100 Completion Gate / Hard-Floor Enforcement) — purged                                                                                                    |
| OP-PURGE-060 | UPDATE:REMOVE | tdd/test-list.md TDD-0317..0333                                 | Absorbed legacy spec-0017 (Playwright CLI / round absorption) test ledger rows — purged                                                                                                                                                                                                                |

### CHG-001 — append operations on spec-0012

| Op ID         | Op Type       | Target                                       | Summary                                                                             |
| ------------- | ------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| OP-APPEND-001 | UPDATE:APPEND | 02_User-stories.md US-0012-0098..0108        | spec-0017 US-0017-0001..0015 の v2.0 / UX-loop active 部分を spec-0012 番号で再採番 |
| OP-APPEND-002 | UPDATE:APPEND | 03_Acceptance-Criteria.md AC-0012-0020..0036 | spec-0017 AC-0017-0001..0024 の v2.0 / UX-loop active 部分                          |
| OP-APPEND-003 | UPDATE:APPEND | 04_Business-Rules.md BR-0012-0017..0027      | spec-0017 BR-0017-0001..0016 の v2.0 / UX-loop active 部分                          |
| OP-APPEND-004 | UPDATE:APPEND | 05_Examples.md EX-0012-0110..0114            | spec-0017 EX-0017 の v2.0 / UX-loop active 部分                                     |
| OP-APPEND-005 | UPDATE:APPEND | 06_Test-Cases.md TC-0012-0319..0353          | spec-0017 TC-0017-0001..0040 の v2.0 / UX-loop active 部分                          |
| OP-APPEND-006 | UPDATE:APPEND | 07_Decisions.md DR-0012-0012..0025           | spec-0017 D-0017-0001..0022 の v2.0 / UX-loop active 部分                           |

### Notes

- `QFAI-PROT2-NNN` error prefix references in the absorbed spec-0017 content are **rewritten** during APPEND to use the actually-implemented prefixes `QFAI-PROT-NNN` / `QFAI-DCON-NNN` (per `packages/qfai/src/core/validators/prototypingEvidence.ts` and `designContractReadiness.ts`), since `QFAI-PROT2-` is on the distributed-surface forbidden list.
- spec-0017 番号は永久 gap として予約。再利用禁止 (`_policies/11_Slice-Policy.md` §ID 安定性ルール 5)。
- New v2.0 / UX-loop content references REQ-0012-0030..0041 added to `01_Spec.md`.

## 2026-05-18 — CHG-002 — Redefine `/qfai-prototyping` per discussion-20260516144141078 (multi-spec / 10-cycle / reviewer-driven Playwright / qualitative-only / stock-photo license)

- Trigger: User directive 2026-05-16 (SRC-0001) and follow-up SRC-0007 redefine the skill to a single-command, project-wide, autonomous loop with reviewer-driven Playwright per spec × screen and qualitative-only convergence. Discussion pack `discussion-20260516144141078` resolved OQ-0001..0009 (OQ-0003 deferred to ops).
- Posture: destructive. Backward compatibility with the v2.0 / UX-loop posture (single-spec, 15-cycle, PNG/HTML capture, quantitative AC-pass thresholds, flat iter dirs) is intentionally broken per user instruction 2026-05-18. The triage closes the QFAI-TRIAGE-001 warning previously raised against this file.

### Triage

| REQ-ID   | Title                                                       | Operation                       | Existing rows touched                                                                                                                       | New rows added                                                                                                | Approved-by    | Approved-at |
| -------- | ----------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------- | ----------- |
| REQ-0001 | Resolve all UI-bearing specs per invocation                 | UPDATE:MODIFY + UPDATE:APPEND   | DR-0012-0014 (15-cycle posture revised in context); existing primary-spec-selection narrative in absorbed spec-0017 content                 | US-0012-0109, AC-0012-0037, BR-0012-0028, DR-0012-0026                                                       | user@2026-05-18 | 2026-05-18  |
| REQ-0002 | 10-cycle iteration budget                                   | UPDATE:MODIFY                   | AC-0012-0020 (max 15), AC-0012-0029 (`index === 14`), BR-0012-0017 (cycles 0..14), BR-0012-0024 (max-iterations exit), DR-0012-0014         | US-0012-0118, AC-0012-0038, AC-0012-0039, BR-0012-0029, DR-0012-0028                                         | user@2026-05-18 | 2026-05-18  |
| REQ-0003 | Reviewer-driven Playwright session per spec × screen        | UPDATE:MODIFY + UPDATE:REMOVE   | BR-0012-0004 (capture role removed), BR-0012-0005 (capture inputs removed), DR-0012-0018 (per-iter contents revised)                        | US-0012-0110, AC-0012-0040, BR-0012-0030, DR-0012-0026                                                       | user@2026-05-18 | 2026-05-18  |
| REQ-0004 | Qualitative reviewer review payload per spec × screen       | UPDATE:MODIFY                   | AC-0012-0021 (scores schema), AC-0012-0022 (critique), BR-0012-0019 (review.json schema)                                                    | US-0012-0111, AC-0012-0041, BR-0012-0031                                                                      | user@2026-05-18 | 2026-05-18  |
| REQ-0005 | Qualitative ordinal-only convergence                        | UPDATE:REMOVE                   | AC-0012-0028 (convergence — superseded by AC-0012-0042), BR-0012-0024 (stop condition — superseded by BR-0012-0032)                         | AC-0012-0042, BR-0012-0032, DR-0012-0030                                                                     | user@2026-05-18 | 2026-05-18  |
| REQ-0006 | License-permitted stock-photo fill with per-image record    | UPDATE:APPEND                   | (none)                                                                                                                                       | US-0012-0112, AC-0012-0043, BR-0012-0033                                                                      | user@2026-05-18 | 2026-05-18  |
| REQ-0007 | Autonomous run with deterministic hard-stops                | UPDATE:MODIFY + UPDATE:APPEND   | DR-0012-0016 (completion gate exit codes); BR-0012-0024 (stop condition class set extended)                                                 | US-0012-0113, AC-0012-0044, AC-0012-0045, BR-0012-0034                                                        | user@2026-05-18 | 2026-05-18  |
| REQ-0008 | Per-spec iter-dir namespacing                               | UPDATE:MODIFY + UPDATE:REMOVE   | AC-0012-0030 (iter layout — superseded by AC-0012-0046), BR-0012-0002 (PNG+HTML mandatory — superseded by BR-0012-0030), DR-0012-0018       | US-0012-0114, AC-0012-0046, BR-0012-0035                                                                      | user@2026-05-18 | 2026-05-18  |
| REQ-0009 | Certify aggregates per-spec coverage                        | UPDATE:MODIFY                   | AC-0012-0033 (certify exit codes per-spec aggregation)                                                                                       | US-0012-0115, AC-0012-0047, BR-0012-0036                                                                      | user@2026-05-18 | 2026-05-18  |
| REQ-0010 | Menu reachability exercised at least once per run           | UPDATE:APPEND                   | (none)                                                                                                                                       | AC-0012-0048, BR-0012-0037                                                                                    | user@2026-05-18 | 2026-05-18  |
| REQ-0011 | Spec-set frozen at cycle 0; mid-run additions deferred      | UPDATE:APPEND                   | (none)                                                                                                                                       | US-0012-0116, AC-0012-0049, BR-0012-0038, DR-0012-0026                                                       | user@2026-05-18 | 2026-05-18  |
| REQ-0012 | Per-spec time-budget cap with soft-warning                  | UPDATE:APPEND                   | (none)                                                                                                                                       | AC-0012-0050, BR-0012-0039                                                                                    | user@2026-05-18 | 2026-05-18  |
| REQ-0013 | Cycle-0 freezes spec set + license catalog                  | UPDATE:APPEND                   | (none)                                                                                                                                       | US-0012-0117, AC-0012-0051, BR-0012-0040                                                                      | user@2026-05-18 | 2026-05-18  |

### Change Summary

| CHG-ID  | Title                                                                                                                | Spec Files Touched                                                                                                  | Source                              |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| CHG-002 | Redefine `/qfai-prototyping` (multi-spec / 10-cycle / reviewer-driven Playwright / qualitative-only / stock-photo)   | 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md | discussion-20260516144141078 SRC-0001/0007 |

### CHG-002 — purge operations on spec-0012

| Op ID        | Op Type       | Target                                       | Summary                                                                                                                                              |
| ------------ | ------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-PURGE-070 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0020       | "Single-Thread Serial Iteration" — superseded by AC-0012-0038 (10-cycle multi-spec lineage)                                                          |
| OP-PURGE-071 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0021       | "4 UX Axes Ordinal Schema" — superseded by AC-0012-0041 (per spec × screen schema with `*Feel` prose fields)                                         |
| OP-PURGE-072 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0022       | "Prose Critique Length" — superseded by AC-0012-0041 (qualitative review payload supersedes single-`critique` 200..500-word rule)                    |
| OP-PURGE-073 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0028       | "Deterministic Stop on Convergence" — superseded by AC-0012-0042 (AND across all spec × screen pairs)                                                |
| OP-PURGE-074 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0029       | "Deterministic Stop on Max Iterations" — superseded by AC-0012-0038 / AC-0012-0039 (10-cycle terminator at `index === 9`)                            |
| OP-PURGE-075 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0030       | "Per-Iter Evidence Layout" — superseded by AC-0012-0046 (per-spec subdir; review.json only; no PNG/HTML)                                             |
| OP-PURGE-076 | UPDATE:REMOVE | 03_Acceptance-Criteria.md AC-0012-0033       | "CLI certify exit codes" — superseded by AC-0012-0047 (per-spec aggregation)                                                                         |
| OP-PURGE-077 | UPDATE:REMOVE | 04_Business-Rules.md BR-0012-0002            | "Mandatory UI Evidence" (PNG + HTML per declared screen) — superseded by BR-0012-0030 (reviewer-driven Playwright; no capture artifacts)             |
| OP-PURGE-078 | UPDATE:REMOVE | 04_Business-Rules.md BR-0012-0017            | "Single Lineage" cycles 0..14 — superseded by BR-0012-0029 (cycles 0..9, per-spec lineage under multi-spec)                                          |
| OP-PURGE-079 | UPDATE:REMOVE | 04_Business-Rules.md BR-0012-0019            | "4 UX Axes Ordinal Schema" review.json shape — superseded by BR-0012-0031 (per spec × screen `<screen>.review.json` with 4 axes + 6 `*Feel` prose)   |
| OP-PURGE-080 | UPDATE:REMOVE | 04_Business-Rules.md BR-0012-0024            | "Stop Condition" — superseded by BR-0012-0032 (qualitative AND aggregator) + BR-0012-0029 (10-cycle terminator) + BR-0012-0034 (hard-stop classes)   |
| OP-PURGE-081 | UPDATE:REMOVE | 07_Decisions.md DR-0012-0014                 | "MAX_ITERATIONS = 15" — superseded by DR-0012-0028 (MAX_ITERATIONS = 10)                                                                            |
| OP-PURGE-082 | UPDATE:REMOVE | 07_Decisions.md DR-0012-0018                 | "Per-Iter Evidence は最小構成" (PNG + HTML + review.json) — superseded by DR-0012-0029 (review.json only, per-spec subdir)                          |

### CHG-002 — append operations on spec-0012

| Op ID         | Op Type       | Target                                            | Summary                                                                                                                |
| ------------- | ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| OP-APPEND-070 | UPDATE:APPEND | 02_User-stories.md US-0012-0109..0118             | Multi-spec, reviewer-driven Playwright, qualitative payload, stock-photo, autonomy hard-stops, namespacing, certify, freeze, 10-cycle stories |
| OP-APPEND-071 | UPDATE:APPEND | 03_Acceptance-Criteria.md AC-0012-0037..0051      | Multi-spec resolver, 10-cycle terminator, reviewer-driven Playwright, qualitative review payload, AND-aggregator, stock-photo license, hard-stops, namespacing, certify, menu reachability, freeze, time-budget |
| OP-APPEND-072 | UPDATE:APPEND | 04_Business-Rules.md BR-0012-0028..0040           | Multi-spec semantics, 10-cycle SSOT, reviewer-driven Playwright, qualitative review payload, AND-aggregator, license catalog, autonomy / hard-stops, per-spec iter namespacing, certify per-spec, menu reachability, frozen spec set, soft warnings, cycle-0 freeze |
| OP-APPEND-073 | UPDATE:APPEND | 07_Decisions.md DR-0012-0026..0030               | Five canonical decisions (multi-spec; reviewer-driven Playwright; 10-cycle; no PNG/HTML; AC quantitative thresholds dropped) |
| OP-APPEND-074 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0001                 | Airgapped run support (mirrors discussion-pack OQ-0003 deferral)                                                       |
| OP-APPEND-075 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0006                 | Per-spec iter-dir migration wiring in `prototypingIterate.ts` (couples with OQ-0012-0002; TDD-0384 deferred)            |
| OP-APPEND-076 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0007                 | Reviewer dispatch wiring in `prototypingIterate.ts` (`dispatchReviewerToPair` interface stub awaiting Playwright runner) |
| OP-APPEND-077 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0008                 | `parseEvaluatorReview` runtime wire-in at per-cycle review.json loader (parser shipped without an invoker)             |
| OP-APPEND-078 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0009                 | `validateImageSources` runtime wire-in at certify gate (handoff-yaml population path deferred)                          |
| OP-APPEND-079 | UPDATE:APPEND | 08_Open-questions.md OQ-0012-0010                 | `DEFAULT_LICENSE_CATALOG` configurability — wire-in via `QfaiConfig.prototyping.licenseCatalog` (7th late-review wave codex r3264977114 P3; closes the untracked TODO at `prototypingIterate.ts#DEFAULT_LICENSE_CATALOG`) |

### Notes

- 01_Spec.md (Scope), `_policies/03_Capabilities.md` (CAP-0012 statement), `_policies/05_Contracts.md` (Contract Index), `_policies/10_delta.md` (cross-spec CHG-002), and `.qfai/contracts/cli/qfai-prototyping.md` were landed by solution-architect as a separate hand-off informed by this delta (`Relevant Requirements` extended with REQ-0012-0042..0054).
- 05_Examples.md (EX-0012-0122..0144), 06_Test-Cases.md (TC-0012-0354..0395), and 16_Traceability-ledger.md (TDD-0371..0412) were landed by test-design-analyst; `AC-Refs` for the new TC block were stitched against AC-0012-0037..0051 during integration on 2026-05-18 (REQ→TC→AC mapping in 10_Plan.md is the SSOT for code/test wiring).
- 10_Plan.md was rewritten on 2026-05-18 to describe the new model and to enumerate the code-landing checklist for the implement phase.
- DEC-0012-0026..0030 (initial draft prefix from CHG-002) were renamed to DR-0012-0026..0030 during integration on 2026-05-18 to match the existing DR-0012-NNNN namespace convention; the integer range is gap-free and append-only above the prior DR-0012-0025 ceiling.
- CHG-002 follow-up open questions (OQ-0012-0002..0005) capture four integration items raised by requirements-analyst that solution-architect / implement gate must resolve before code landing: per-spec `prototyping.json` shape; `pivotDirective` retention; `critique` field cleanup; capture role removal in steering / agent-routing.
- Discussion-pack OQ-0003 is mirrored into 08_Open-questions.md as OQ-0012-0001 (airgapped run support, deferred to ops gate).
- Exit codes: Reviewer Playwright-session failure (hard-stop class b) reuses exit `64` with a `sessionStatus` discriminator on `<screen>.review.json`; mid-run spec-set change (hard-stop class d) reuses exit `2` (same class as DESIGN.md lock drift per OC-4 / AC-0012-0035). License-verify failure (hard-stop class c) uses new exit `66`. Confirmed by user@2026-05-18.
- Internal IDs (`spec-0012`, `DR-0012-NNNN`, etc.) are used here because `.qfai/specs/**` is the authoring zone and not part of the distributed surface (`packages/qfai/dist/`, `packages/qfai/assets/`). See `.agents/rules/distributed-surface.md`.

### CHG-002 Cascade — Cycle-0 Bypass Regression + Traceability Stitch (2026-05-19)

Late-review fixes on PR #208:

- **codex r3264500818 (P2)** — section-0 no-op gate now honours the legacy `# … Prototyping …` title marker (helper `findTitleMarkerSpecs` composed into `evaluateZeroUiBearingPrecheck`). Prevents title-marker-only projects from silently no-opping. Test: TC-0012-0398 (TDD-0417).
- **codex r3264507311 (MAJOR)** — primarySpecId-bypass at cycle 0 now expands `earlyUiBearing` to `[configuredPrimarySpecId]`, so the cycle-0 frozen write seeds `frozenSpecsCovered: [primary]` (was `[]`). Without this, cycle ≥1 `checkSpecsCoveredDrift` reliably tripped with `removed: [primary]` → exit 2. Test: TC-0012-0397 (TDD-0416).
- **codex r3264508578 (MINOR)** — `specDirExists` bare `catch {}` replaced with ENOENT discrimination; EACCES / EIO / ENOTDIR propagate. Source TDD-0420.
- **architecture-reviewer r3264511589 + completion-reviewer r3264512364 (HIGH / major)** — the three `it` blocks added in commit `6291b432` are registered as TC-0012-0396 / 0399 / 0400 with matching TDD-0415 / 0418 / 0419 entries; the two certify-side tests previously lodged under the TC-0012-0381 describe are moved into their own TC describes to disentangle the acceptance axes.
- **4th late-review wave (CRITICAL r3264654080)** — the cascade TDD IDs above were originally registered as TDD-0409..0414 in commit `cf5ee09d`, which collided with the v2.1 planned block (`TDD-0409 | TC-0012-0392`..`TDD-0412 | TC-0012-0395`) already recorded in `16_Traceability-ledger.md` lines 108-111. The cascade IDs are renumbered to TDD-0415..0420 to clear the collision; the v2.1 planned IDs remain reserved. Added TDD-0421 / TC-0012-0401 (codex r3264653396, MAJOR) as the symmetric cycle-1 drift regression test for the title-marker bypass — TC-0012-0397 (primarySpecId) had a cycle-1 test but the title-marker path (TC-0012-0398) did not. TDD-0421 closes that gap.
- **codex r3264630513 (P1)** — `prototypingCertify`'s per-(spec × screen) review.json presence gate added in TDD-0387 only enforces when the accepted iter actually contains per-spec subdirs (`iter-NN/spec-*/`). Flat-iter projects (the legacy `iter-NN/index.html` shape that `prototypingIterate` and the shipped SKILL.md still emit) skip the gate with a one-line stderr info note. This unblocks the long-standing flat-iter test fixtures (and any flat-iter consumer project) while keeping the gate hard for projects that have migrated to the per-spec layout. The deferred migration is tracked under TDD-0384 / OQ-0012-0006.
- **codex r3264651323 (MAJOR)** — extracted `TITLE_MARKER_RE` and the title-marker resolver function from `cli/commands/prototypingIterate.ts` into `core/prototyping/specResolution.ts` (exported as `resolveTitleMarkerSpecs`). Eliminates the string-duplicate regex / function pair flagged by review. The legacy `PROTOTYPING_MARKER_RE` is now composed from `UI_BEARING_MARKER_RE.source + "|" + TITLE_MARKER_RE.source`, making the SSOT relationship explicit.
- **codex r3264490653 (MINOR)** — JSDoc note added above `UI_BEARING_MARKER_RE` explaining the intentional asymmetry vs. the legacy composite regex and pointing readers at `resolveTitleMarkerSpecs` for the title-marker scan. No internal IDs leak (distributed-surface discipline preserved).
- **codex r3264563268 (required)** — new OQ-0012-0006..0009 rows in `08_Open-questions.md` now have matching OP-APPEND-075..078 entries in the CHG-002 append-operations table below, mirroring the OP-APPEND-074 pattern established for OQ-0012-0001.
- **6th late-review wave (codex r3264765749 P2, r3264765754 P2, aganesy r3264777188 MAJOR, aganesy r3264798065 P1)** — four follow-up fixes layered on the prior wave:
  - r3264765749 (P2): `evaluateZeroUiBearingPrecheck` now always returns the UNION of strict + title-marker + configured-primarySpecId-on-disk, regardless of whether the strict scan returned non-empty. Pre-fix the title-marker / primarySpecId bypass branch was unreachable when any strict marker existed, so a mixed project (strict=[A], primarySpecId=B) froze `frozenSpecsCovered = [A]` and let certify validate the wrong scope. Test: TC-0012-0404 (TDD-0424).
  - r3264765754 (P2): `dispatchReviewerToPair` now propagates the runner's in-memory `reviewJson` payload on `finalStatus: "ok"` and accepts an optional `persistReviewJson` callback that, when injected, writes `<screen>.review.json` and records the returned path on `outcome.reviewJsonPath`. Pre-fix the payload was dropped on the floor and `reviewJsonPath` was never set either. Persister failures are recorded as a synthetic failed attempt and the outcome falls to `retryExhausted` (symmetric with the runner-throw + sleeper-throw paths). Tests: 5 new `it` blocks in `reviewerDispatch.test.ts` (payload-on-first-success / payload-after-retry / no-payload-on-failure / persister-success / persister-failure).
  - aganesy r3264777188 (MAJOR): the flat-iter `it` block from the 5th late-review wave (codex r3264630513) was authored without a TC binding. Annotated with `// QFAI:SPEC-0012:TC-0012-0402`, narrowed to single-spec frozen set, and registered as TDD-0422.
  - aganesy r3264798065 (P1): tightened the flat-iter skip in `prototypingCertify.ts`. Pre-fix the skip was unconditional, so a multi-spec frozen set on a flat iter silently no-op'd the per-(spec × screen) gate — re-opening the TDD-0387 vulnerability (a frozen secondary spec ships a sealed cert with zero review.json files). Post-fix the skip is CONDITIONAL on `frozenSpecsPreview.length <= 1`; multi-spec frozen sets on a flat iter ERROR non-zero with a message naming the multi-spec/per-spec incompatibility and the deferred-migration hint (TDD-0384 / OQ-0012-0006). Tests: TC-0012-0402 (single-spec info-skip, TDD-0422) + TC-0012-0403 (multi-spec hard error, TDD-0423).
