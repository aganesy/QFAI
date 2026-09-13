# Evidence: /qfai-sdd (spec-0015)

## Objective

- Spec target: spec-0015.
- Objective: bound optional pattern review to concrete coverage, without numeric targets or demands for additional abstractions. Preserve adopter manifests and mandatory obligations.

## Inputs reviewed

- `.qfai/specs/spec-0015/` and `_policies/08_Decisions.md`, including DR-0012-002.
- `.qfai/decisions/CR-20260913-0007-concrete-pattern-review.md`; current-session delegated implementation scope.
- `.qfai/discussion/discussion-20260913135257933/`: provenance only, including DUS-004 and DAC-004-05.
- `packages/qfai/package.json`, `package.json`, `.instruction/02_project/{architecture,development,tech-stack}.md`: repository facts under the source/mirror boundary.
- `tmp/issue-1792/{planner-review-1812,architect-author-1812,tests-author-1812}.md`.
- `tmp/issue-1792/{tests-phase2-1812,architect-plan-1812,requirements-phase4-1812}.md`; actual producer responses and owner execution logs.

## Preflight summary path

- `.qfai/report/preflight/run-20260913233536479/preflight_summary.md` (run id: run-20260913233536479): ready, 16 imported requirements, no blockers or open questions.

## Triage decisions

| Source                                | Subject                                           | Operation | Sub-op | Approved By | Rationale                                                                                                     |
| ------------------------------------- | ------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| discussion-20260913135257933#REQ-0013 | Bound optional pattern review in spec-0015        | UPDATE    | MODIFY | -           | Retain IDs and advisory review; require rationale for concrete additions without numeric targets.             |
| discussion-20260913135257933#REQ-0013 | Bound DR-0012-002 and preserved manifest settings | UPDATE    | MODIFY | -           | Retain cross-skill availability and adopter manifests; catalog bounds render old numeric targets ineffective. |

## Open questions

- none

## Decisions made

- CR-20260913-0007: option 1 selected under the user's existing delegated scope, not an individual option answer. Keep optional advisory review and all independently required pairings and gates.
- DR-0012-002: concrete-only proposals remain available across skills; numeric targets in preserved manifests do not override catalog bounds.

## Work performed

- Stage 1: persisted primary and policy Triage plus the scoped CR. The independent delivery-planner passed this Triage gate only.
- Phase 0: checked contract impact; no CLI, API, DB or UI contract changes.
- Phase 1: solution-architect updated DR-0012-002 and the two source YAML assets; primary synchronized operating copies.
- Phase 2 requirements: updated `01_Spec.md`, US-0015-0005, AC-0015-0006/0007/0009 and BR-0015-0005. Retained IDs and corrected BR-0015-0005's own AC references.
- Test author observed RED: 3 failing assertions and 14 passing controls. Primary subsequently observed GREEN: 17/17 integration tests and 44/44 related tests.
- Phase 2 test design retained EX-0015-0004 and TC-0015-0006/0007; TC-0015-0009 retains its routing meaning. Phase 2b consolidated 37 existing rows into one canonical table and appended 16 todo seeds, for 53 rows. Only TDD-0007's selector narrows to its original boundary. Phase 2c reconciled the affected AC/BR to the existing profile, catalog and init preservation contract; API-row delta is zero.
- The executing owner reset only spec-0015/TDD-0006 and TDD-0007 to todo, set CR-20260913-0007 in DR-ID and cleared Blocked-By. Prior Evidence remains verbatim. TDD-0038 seeds already-active TC-0015-0034; TDD-0039 seeds the new TC7 compatibility boundary; TDD-0040..0053 seed fourteen missing active US obligations. No other row is reset or retired.
- Phase 3 solution-architect finalized the existing plan. Phase 4 requirements author records the physical application and pending gates in the two deltas and CR. CR Applied at remains unset.

## Contract executability

- none

## Commands executed

- Canonical preflight: `node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error --format json` — ready; run-scoped path above.
- Primary baseline validation: SDD profile over all specs — FAIL, 96 errors; scoped full profile — FAIL, 61 errors. Run-scoped paths below; neither is a whole-workflow PASS.
- Test author: `pnpm -C packages/qfai exec vitest run tests/integration/agentDelegationSpec0015.test.ts --silent` — exit 1, RED at 2026-09-13T14:42:31Z.
- Primary: `pnpm sync:ssot` — exit 0, 202 copies.
- Primary: `pnpm -C packages/qfai exec vitest run tests/integration/agentDelegationSpec0015.test.ts --silent` — exit 0, 17/17 at 2026-09-13T14:48:15Z.
- Primary: Vitest for `tests/validators/agentCatalogDrift.test.ts`, `tests/assets/agentCardRequiredInputs.test.ts`, `tests/integration/codexAgentWrappers.test.ts` — exit 0, 3 files, 44/44 at 2026-09-13T14:48:46Z.
- Requirements author: `pnpm exec prettier --check` over the four changed spec files — exit 0. Evidence uses an explicit ignore-path override because historical evidence is excluded by the repository default.
- Requirements author: `git diff --check` over the changed spec files — exit 0. `pnpm exec prettier --check .qfai/evidence/sdd-spec-0015.md --ignore-path .git/info/exclude` — exit 0. `git diff --no-index --check -- NUL .qfai/evidence/sdd-spec-0015.md` — exit 1 for the added file, with no whitespace diagnostics.
- Requirements author: inline Node structural check — exit 0; declaration IDs retained, evidence H2 order matches the template, and DUS-004/DAC-004-05 resolve in the source pack.
- Phase 2 test author: the existing integration suite — exit 0, 17/17; `green-phase2-1812.log`, start 2026-09-13T15:02:01Z.
- Primary: preserved-ledger comparison — exit 0, 37 existing rows preserved within the approved reset/selector delta, 16 seeds, 53 total, one table; `preserved-ledger-1812.log`.
- Primary: narrowed TDD-0007 selector — exit 0, one passed and 16 intentionally skipped; `selector-1812.log`, start 2026-09-13T15:04:01Z.
- Primary: ledger/evidence structural oracles — exit 0, five files, 174/174; `ledger-oracles-1812.log`, start 2026-09-13T14:57:36Z.
- Phase 3 architect: scoped plan Prettier and diff checks — exit 0. Phase 4 requirements author: scoped Prettier over both deltas, CR, evidence and scratch response — exit 0; delta diff whitespace check — exit 0; inline structural check — exit 0, with 14 canonical evidence headings, two five-column CR references, retained seven-column Triage and approved/unapplied CR.

## Validate evidence paths

- `.qfai/report/run-20260913234628207/summary.md` (run id: run-20260913234628207, status: fail, 96 errors).
- `.qfai/report/run-20260913234645842/summary.md` (run id: run-20260913234645842, status: fail, 61 errors).
- `tmp/issue-1792/{red-1812,green-1812,related-1812}.log`.
- `tmp/issue-1792/{green-phase2-1812,preserved-ledger-1812,selector-1812,ledger-oracles-1812}.log`.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at                     | Frontier                                                                                                                                       | Evidence                                                                            |
| ----- | ------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 0     | skipped | -        | -                            | empty: contract scope answered by CR-20260913-0007                                                                                             | tmp/issue-1792/architect-author-1812.md; checkpoint 2026-09-13T14:46:07Z            |
| 1     | skipped | -        | 2026-09-13T14:46:55Z         | empty: policy and catalog bounds answered by CR-20260913-0007                                                                                  | tmp/issue-1792/architect-author-1812.md; checkpoint 2026-09-13T14:46:07Z            |
| 2     | skipped | -        | 2026-09-13T14:53:02.9053876Z | empty: concrete scope, retained IDs and manifest precedence answered by CR-20260913-0007                                                       | tmp/issue-1792/requirements-phase2-1812.md; checkpoint 2026-09-13T14:51:34.3350917Z |
| 2c    | skipped | -        | 2026-09-13T15:01:12.7838750Z | empty: CR-20260913-0007, completed AC/BR and existing init preservation authority settle the reconciliation; no domain or API ownership choice | tmp/issue-1792/tests-phase2-1812.md; checkpoint 2026-09-13T15:00:35Z                |
| 3     | skipped | -        | 2026-09-13T15:04:11Z         | empty: CR-20260913-0007, completed TC and Phase 2c fix the plan; no new architecture                                                           | tmp/issue-1792/architect-plan-1812.md; checkpoint 2026-09-13T15:03:33Z              |

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance                  | Task title                                                 | Input (refs)                                         | Output (refs)                                                                                            | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst  | /root/sdd_1812_requirements     | Stage 1 Triage and scoped CR authoring                     | REQ-0013; existing spec and DR                       | spec-0015/09_delta.md; _policies/10_delta.md; CR-20260913-0007                                           | PASS                         |
| 2    | delivery-planner      | /root/sdd_1812_planner_review   | Independent Stage 1 Triage gate, not final review          | Persisted Triage and CR                              | tmp/issue-1792/planner-review-1812.md                                                                    | PASS                         |
| 3    | test-design-analyst   | /root/sdd_1812_tests            | Regression-test authoring: RED, 3 failures and 14 controls | CR; TC-0015-0006/0007                                | tmp/issue-1792/tests-author-1812.md; red-1812.log                                                        | PASS                         |
| 4    | solution-architect    | /root/sdd_1812_architect_author | Phase 0/1 author slice, not terminal review                | CR; existing contracts and policy                    | tmp/issue-1792/architect-author-1812.md                                                                  | PASS                         |
| 5    | orchestrator          | /root                           | Source synchronization and targeted GREEN                  | Source assets and regression tests                   | tmp/issue-1792/green-1812.log; related-1812.log                                                          | PASS                         |
| 6    | requirements-analyst  | /root/sdd_1812_requirements     | Phase 2 requirements author slice                          | CR; persisted SKIP checkpoint                        | spec-0015/01_Spec.md; 02_User-stories.md; 03_Acceptance-Criteria.md; 04_Business-Rules.md; this evidence | PASS                         |
| 7    | -                     | n/a                             | grilling(-/none): none                                     | -                                                    | -                                                                                                        | PASS                         |
| 8    | test-design-analyst   | /root/sdd_1812_tests            | Phase 2/2b/2c author slice, not terminal review            | CR; completed requirements; canonical producer rules | tmp/issue-1792/tests-phase2-1812.md; examples, TC and ledger                                             | PASS                         |
| 9    | solution-architect    | /root/sdd_1812_architect_author | Phase 3 plan author slice, not terminal review             | CR; completed TC and Phase 2c                        | tmp/issue-1792/architect-plan-1812.md; spec-0015/10_Plan.md                                              | PASS                         |
| 10   | orchestrator          | /root                           | Approved two-row reset and preservation/selector checks    | CR; Phase 2b ledger                                  | tmp/issue-1792/preserved-ledger-1812.log; selector-1812.log; ledger-oracles-1812.log                     | PASS                         |
| 11   | requirements-analyst  | /root/sdd_1812_requirements     | Phase 4 delta, CR and factual evidence author slice        | Actual owner actions and author handoffs             | Both deltas; CR-20260913-0007; this evidence; requirements-phase4-1812.md                                | PASS                         |
| 12   | -                     | -                               | Required final validation gates                            | Completed semantic snapshot                          | Pending primary execution; baseline failures are not waived                                              | PENDING                      |
| 13   | architecture-reviewer | -                               | Independent final architecture review                      | Semantic snapshot and evidence                       | Pending delegated review                                                                                 | PENDING                      |
| 14   | completion-reviewer   | -                               | Independent final completion review                        | Semantic snapshot and evidence                       | Pending delegated review                                                                                 | PENDING                      |
| 15   | qa-gatekeeper         | -                               | Independent final QA review                                | Actual validation, coverage and command evidence     | Pending delegated review                                                                                 | PENDING                      |

## Gaps / Open risks

- Stage 0 operating-memory refresh is unapplied, not refreshed or PASS. The repository requires package-source improvements and byte-mirrors shipped consumer catalogs. Filling those templates with private repository facts or changing the mirror invariant is outside this change. Repository facts are grounded in the inputs above; placeholder validation findings remain.
- Global SDD baseline has 96 errors, including legacy ledgers outside this CR. Scoped full baseline has 61 errors, including catalog placeholders and missing historical evidence. These are observed failures, not waived gates.
- Physical example/TC, ledger and plan changes are applied; required final validation and independent reviewers remain pending. The two reset rows and all 16 new seeds are todo, not credited as completed executing-owner cycles. The global surface-typing predicate is absent, so every active US retains its obligation.

## Final status

- Final status: REVISE
- Rationale: scoped physical author changes and targeted GREEN do not clear the observed baseline failures or complete required final validation and independent review gates.
