# Evidence: /qfai-sdd (spec-0015)

## Objective

- Spec target: spec-0015.
- Objective: bound optional pattern review to concrete coverage, without numeric targets or demands for additional abstractions. Preserve adopter manifests and mandatory obligations.

## Inputs reviewed

- `.qfai/specs/spec-0015/` and `_policies/08_Decisions.md`, including DR-0012-002.
- `.qfai/decisions/CR-20260913-0007-concrete-pattern-review.md`: tracked requirement capture, acceptance signals and current-session delegated implementation scope.
- `packages/qfai/package.json`, `package.json`, `.instruction/02_project/{architecture,development,tech-stack}.md`: repository facts under the source/mirror boundary.
- `tmp/concrete-pattern-review/{planner-review,architect-author,tests-author}.md`.
- `tmp/concrete-pattern-review/{requirements-phase2,tests-phase2,architect-plan,requirements-phase4,legacy-upgrade-author,catalog-key-author}.md`: actual producer responses and owner execution logs.
- `tmp/concrete-pattern-review/{architecture-review-round-one,completion-review-round-one,completion-review-round-two,qa-review-round-two}.md`: historical independent responses at the revisions recorded below.

## Preflight summary path

- `.qfai/report/preflight/run-20260913233536479/preflight_summary.md` (run id: run-20260913233536479): ready, 16 imported requirements, no blockers or open questions.
- This is the actual run-scoped local record. The tracked latest pointer retains its baseline fields and publishes no new private user path.

## Triage decisions

| Source                                                                         | Subject                                           | Operation | Sub-op | Approved By | Rationale                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| .qfai/decisions/CR-20260913-0007-concrete-pattern-review.md#requirement-source | Bound optional pattern review in spec-0015        | UPDATE    | MODIFY | -           | Retain IDs and advisory review; require rationale for concrete additions without numeric targets.             |
| .qfai/decisions/CR-20260913-0007-concrete-pattern-review.md#requirement-source | Bound DR-0012-002 and preserved manifest settings | UPDATE    | MODIFY | -           | Retain cross-skill availability and adopter manifests; catalog bounds render old numeric targets ineffective. |

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
- Phase 3 solution-architect finalized the existing plan. Phase 4 records the physical application in both deltas and the CR. CR Applied at remains unset.
- The catalog bound uses the registered `pattern-doubler` key; primary synchronized its operating mirror. The existing compatibility oracle seeds an actual older catalog and its prior receipt. Normal reinit retains that catalog; forced reinit adopts the shipped bound while preserving the adopter manifest. The wrong-receipt control fails, the restored selector passes and the full suite passes all 17 tests.
- Tracked requirement and acceptance provenance resolves to the CR. The latest concrete-pattern delta precedes unchanged older entries. Evidence scratch names are semantic; actual historical responses retain their original revisions and hashes.

## Contract executability

- none

## Commands executed

- Canonical preflight: `node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error --format json` — ready; run-scoped path above.
- Primary baseline validation: SDD profile over all specs — FAIL, 96 errors; scoped full profile — FAIL, 61 errors. Run-scoped paths below; neither is a whole-workflow PASS.
- Test author: `pnpm -C packages/qfai exec vitest run tests/integration/agentDelegationSpec0015.test.ts --silent` — exit 1, RED at 2026-09-13T14:42:31Z.
- Primary: `pnpm sync:ssot` — exit 0, 202 copies.
- Primary: `pnpm -C packages/qfai exec vitest run tests/integration/agentDelegationSpec0015.test.ts --silent` — exit 0, 17/17 at 2026-09-13T14:48:15Z.
- Primary: Vitest for `tests/validators/agentCatalogDrift.test.ts`, `tests/assets/agentCardRequiredInputs.test.ts`, `tests/integration/codexAgentWrappers.test.ts` — exit 0, 3 files, 44/44 at 2026-09-13T14:48:46Z.
- Phase 2 test author: the existing integration suite — exit 0, 17/17; `tmp/concrete-pattern-review/green-phase2.log`, start 2026-09-13T15:02:01Z.
- Primary: preserved-ledger comparison — exit 0, 37 existing rows preserved within the approved reset/selector delta, 16 seeds, 53 total, one table; `tmp/concrete-pattern-review/preserved-ledger.log`.
- Primary: narrowed TDD-0007 selector — exit 0, one passed and 16 intentionally skipped; `tmp/concrete-pattern-review/selector.log`, start 2026-09-13T15:04:01Z.
- Primary: ledger/evidence structural oracles — exit 0, five files, 174/174; `tmp/concrete-pattern-review/ledger-oracles.log`, start 2026-09-13T14:57:36Z.
- Historical repository format/lint/types — exit 0. The original log captured only check-types; `tmp/concrete-pattern-review/frozen-gates.log` captures all three commands at c56caf1ab6d085eea439d4745245cef99ef6ab1f. Default Prettier excludes operating specs and is not evidence that those Markdown files were formatted.
- Historical broad frozen assets — 3818 passed, four skipped and one failed; `tmp/concrete-pattern-review/frozen-assets.log`. The archive lacks its own Git metadata, so the Git-ignore negative control sees the parent's ignored tmp boundary. This is not a full-suite PASS. The original Git-aware controls pass all five cases in `tmp/concrete-pattern-review/git-aware-assets.log`.
- Primary final scoped SDD validation — PASS, zero errors, 16 warnings and four info; run-20260914001125022. Scoped full validation — FAIL, 61 errors, 67 warnings and six info; run-20260914001126669. Global SDD validation — FAIL, 96 errors, 77 warnings and five info; run-20260914001402839.
- Primary validation comparison — exit 0; `tmp/concrete-pattern-review/validation-delta.log` records identical 61 scoped full error obligations, with no new or removed errors.
- Legacy test author: the existing compatibility selector — exit 0 with the correct older-catalog receipt, exit 1 with the deliberately incorrect receipt, then exit 0 after restoration. The full existing integration suite passes 17/17. Commands and raw results are in `tmp/concrete-pattern-review/legacy-upgrade-author.md` and its four logs.
- Primary current author-round repository gates: `pnpm format:check`, `pnpm lint`, `pnpm check-types` — all exit 0, captured together in `tmp/concrete-pattern-review/current-gates.log`. Current related three-file checks pass 44/44 in `tmp/concrete-pattern-review/current-related.log`. Final post-metadata validation and independent attestations remain pending.
- Primary current ledger oracles — exit 0, six files and 179/179 in `tmp/concrete-pattern-review/current-ledger-oracles.log`. The current preservation comparison exits 0 with 37 retained rows, 16 seeds and 53 total in `tmp/concrete-pattern-review/current-preserved-ledger.log`.
- Current metadata author: `pnpm exec prettier --check` over the seven owned Markdown paths with `--ignore-path .git/info/exclude` — exit 0. Owned-path `git diff --check` and the inline Node structural check — exit 0. Declaration IDs, prior Source pairs, tracked CR links, older delta histories and all 14 evidence headings are retained. Full commands are in `tmp/concrete-pattern-review/metadata-author.md`; this producer sign-off is not an independent verdict.

- Primary post-metadata validation: scoped SDD PASS, zero errors, 16 warnings and four info; `run-20260914004835925`. Scoped full FAIL, 61 errors, 67 warnings and six info; `run-20260914004837695`. Global SDD FAIL, 96 errors, 76 warnings and five info; `run-20260914004842675`. Both error sets are identical to the previous observed records; `tmp/concrete-pattern-review/post-metadata-validation-delta.log`.
- Primary explicit-ignore-path Prettier over all changed Markdown and `git diff --check`: exit 0. The preservation comparator still passes after formatting. Logs: `tmp/concrete-pattern-review/current-markdown-{format,check}.log`.

## Validate evidence paths

- `.qfai/report/run-20260913234628207/summary.md` (run id: run-20260913234628207, status: fail, 96 errors).
- `.qfai/report/run-20260913234645842/summary.md` (run id: run-20260913234645842, status: fail, 61 errors).
- `.qfai/report/run-20260914001125022/summary.md`: scoped SDD PASS, zero errors, 16 warnings and four info.
- `.qfai/report/run-20260914001126669/summary.md`: scoped full FAIL, 61 errors, 67 warnings and six info.
- `.qfai/report/run-20260914001402839/summary.md`: global SDD FAIL, 96 errors, 77 warnings and five info.
- `tmp/concrete-pattern-review/{red,green,related,green-phase2,preserved-ledger,selector,ledger-oracles}.log`.
- `tmp/concrete-pattern-review/{validate-final-sdd,validate-final-full,validate-final-global-sdd,validation-delta,git-aware-assets,frozen-assets,frozen-gates,current-gates,current-related}.log`.
- `tmp/concrete-pattern-review/{legacy-upgrade-control,legacy-upgrade-mutant,legacy-upgrade-restored,legacy-upgrade-full}.log`.
- `tmp/concrete-pattern-review/{current-ledger-oracles,current-preserved-ledger}.log`.
- `.qfai/report/run-20260914004835925/summary.md`, `.qfai/report/run-20260914004837695/summary.md` and `.qfai/report/run-20260914004842675/summary.md`: actual post-metadata runs.
- `tmp/concrete-pattern-review/{post-metadata-sdd,post-metadata-full,post-metadata-global-sdd,post-metadata-validation-delta,current-markdown-format,current-markdown-check}.log`.

## Pre-draft Grilling

| Phase    | Session | Ended at | Wrote at                     | Frontier                                                                                                                                       | Evidence                                                                                    |
| -------- | ------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 0        | skipped | -        | -                            | empty: contract scope answered by CR-20260913-0007                                                                                             | tmp/concrete-pattern-review/architect-author.md; checkpoint 2026-09-13T14:46:07Z            |
| 1        | skipped | -        | 2026-09-13T14:46:55Z         | empty: policy and catalog bounds answered by CR-20260913-0007                                                                                  | tmp/concrete-pattern-review/architect-author.md; checkpoint 2026-09-13T14:46:07Z            |
| 2        | skipped | -        | 2026-09-13T14:53:02.9053876Z | empty: concrete scope, retained IDs and manifest precedence answered by CR-20260913-0007                                                       | tmp/concrete-pattern-review/requirements-phase2.md; checkpoint 2026-09-13T14:51:34.3350917Z |
| 2c       | skipped | -        | 2026-09-13T15:01:12.7838750Z | empty: CR-20260913-0007, completed AC/BR and existing init preservation authority settle the reconciliation; no domain or API ownership choice | tmp/concrete-pattern-review/tests-phase2.md; checkpoint 2026-09-13T15:00:35Z                |
| 3        | skipped | -        | 2026-09-13T15:04:11Z         | empty: CR-20260913-0007, completed TC and Phase 2c fix the plan; no new architecture                                                           | tmp/concrete-pattern-review/architect-plan.md; checkpoint 2026-09-13T15:03:33Z              |
| metadata | skipped | -        | -                            | empty: fixed approved CR supplies provenance and behavior; no new design decision                                                              | tmp/concrete-pattern-review/metadata-author.md                                              |

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance                     | Task title                                                 | Input (refs)                                         | Output (refs)                                                                                                                              | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ---------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1    | requirements-analyst  | /root/sdd_1812_requirements        | Stage 1 Triage and scoped CR authoring                     | Tracked CR; existing spec and DR                     | spec-0015/09_delta.md; _policies/10_delta.md; CR-20260913-0007                                                                             | PASS                         |
| 2    | delivery-planner      | /root/sdd_1812_planner_review      | Independent Stage 1 Triage gate, not final review          | Persisted Triage and CR                              | tmp/concrete-pattern-review/planner-review.md                                                                                              | PASS                         |
| 3    | test-design-analyst   | /root/sdd_1812_tests               | Regression-test authoring: RED, 3 failures and 14 controls | CR; TC-0015-0006/0007                                | tmp/concrete-pattern-review/tests-author.md; tmp/concrete-pattern-review/red.log                                                           | PASS                         |
| 4    | solution-architect    | /root/sdd_1812_architect_author    | Phase 0/1 author slice, not terminal review                | CR; existing contracts and policy                    | tmp/concrete-pattern-review/architect-author.md                                                                                            | PASS                         |
| 5    | orchestrator          | /root                              | Source synchronization and targeted GREEN                  | Source assets and regression tests                   | tmp/concrete-pattern-review/green.log; tmp/concrete-pattern-review/related.log                                                             | PASS                         |
| 6    | requirements-analyst  | /root/sdd_1812_requirements        | Phase 2 requirements author slice                          | CR; persisted SKIP checkpoint                        | spec-0015/01_Spec.md; 02_User-stories.md; 03_Acceptance-Criteria.md; 04_Business-Rules.md; this evidence                                   | PASS                         |
| 7    | -                     | n/a                                | grilling(-/none): none                                     | -                                                    | -                                                                                                                                          | PASS                         |
| 8    | test-design-analyst   | /root/sdd_1812_tests               | Phase 2/2b/2c author slice, not terminal review            | CR; completed requirements; canonical producer rules | tmp/concrete-pattern-review/tests-phase2.md; examples, TC and ledger                                                                       | PASS                         |
| 9    | solution-architect    | /root/sdd_1812_architect_author    | Phase 3 plan author slice, not terminal review             | CR; completed TC and Phase 2c                        | tmp/concrete-pattern-review/architect-plan.md; spec-0015/10_Plan.md                                                                        | PASS                         |
| 10   | orchestrator          | /root                              | Approved two-row reset and preservation/selector checks    | CR; Phase 2b ledger                                  | tmp/concrete-pattern-review/preserved-ledger.log; tmp/concrete-pattern-review/selector.log; tmp/concrete-pattern-review/ledger-oracles.log | PASS                         |
| 11   | requirements-analyst  | /root/sdd_1812_requirements        | Phase 4 delta, CR and factual evidence author slice        | Actual owner actions and author handoffs             | Both deltas; CR-20260913-0007; this evidence; tmp/concrete-pattern-review/requirements-phase4.md                                           | PASS                         |
| 12   | orchestrator          | /root                              | Observed validation gates before current metadata fixes    | Completed prior semantic snapshot                    | Scoped SDD zero errors; scoped full 61 and global SDD 96 errors                                                                            | REVISE                       |
| 13   | architecture-reviewer | /root/sdd_1812_architecture_review | Historical R01 architecture review                         | c56caf1ab6d085eea439d4745245cef99ef6ab1f             | tmp/concrete-pattern-review/architecture-review-round-one.md                                                                               | PASS                         |
| 14   | completion-reviewer   | /root/sdd_1812_completion_review   | Historical R01 completion review                           | c56caf1ab6d085eea439d4745245cef99ef6ab1f             | tmp/concrete-pattern-review/completion-review-round-one.md; stale note and whole-workflow blockers                                         | REVISE                       |
| 15   | completion-reviewer   | /root/sdd_1812_completion_review   | Historical R02 factual-note recheck                        | fa981919a4be88f30e01b90cdfbcf54a17000952             | tmp/concrete-pattern-review/completion-review-round-two.md; note resolved, whole-workflow blockers remain                                  | REVISE                       |
| 16   | qa-gatekeeper         | /root/sdd_1812_qa_review           | Historical R02 independent QA review                       | fa981919a4be88f30e01b90cdfbcf54a17000952             | tmp/concrete-pattern-review/qa-review-round-two.md; scoped acceptance PASS, whole workflow REVISE                                          | REVISE                       |
| 17   | solution-architect    | /root/sdd_1812_architect_author    | Registered catalog-key correction                          | Supported mode IDs and existing bound                | tmp/concrete-pattern-review/catalog-key-author.md                                                                                          | PASS                         |
| 18   | test-design-analyst   | /root/sdd_1812_tests               | Existing older-catalog receipt adoption oracle             | Registered key; EX-0015-0004; TC-0015-0007           | tmp/concrete-pattern-review/legacy-upgrade-author.md; controlled mutation and full 17-test results                                         | PASS                         |
| 19   | requirements-analyst  | /root/sdd_concrete_metadata_author | Tracked provenance, newest delta and factual evidence      | Fixed CR; observed commands and historical responses | Assigned metadata paths; tmp/concrete-pattern-review/metadata-author.md                                                                    | PASS                         |
| 20   | orchestrator          | /root                              | Final post-metadata validation and gate recording          | Current completed semantic snapshot                  | Scoped SDD zero errors; scoped full 61 and global SDD 96 unchanged errors; no baseline gate is waived                                      | REVISE                       |
| 21   | architecture-reviewer | -                                  | Current independent architecture attestation               | Current committed semantic snapshot                  | Pending delegated review                                                                                                                   | PENDING                      |
| 22   | completion-reviewer   | -                                  | Current independent completion attestation                 | Current committed semantic snapshot                  | Pending delegated review                                                                                                                   | PENDING                      |
| 23   | qa-gatekeeper         | -                                  | Current independent QA attestation                         | Current snapshot and fresh command evidence          | Pending delegated review                                                                                                                   | PENDING                      |

## Gaps / Open risks

- Stage 0 operating-memory refresh is unapplied, not refreshed or PASS. The repository requires package-source improvements and byte-mirrors shipped consumer catalogs. Filling those templates with private repository facts or changing the mirror invariant is outside this change. Repository facts are grounded in the inputs above; placeholder validation findings remain.
- Global SDD validation retains 96 baseline errors, including legacy ledgers outside this CR. Scoped full validation retains 61, including catalog placeholders and missing historical evidence. Scoped SDD zero errors is a partial-profile PASS, not a waiver or whole-workflow PASS.
- Physical example/TC, ledger, plan and current provenance changes are applied. Post-metadata validation retains the observed baseline errors; current independent attestations remain pending. Historical independent responses clear only their recorded revisions and scopes. The two reset rows and all 16 new seeds remain todo, not completed executing-owner cycles. The global surface-typing predicate is absent, so every active US retains its obligation.
- Frozen broad assets have one Git-ignore archive limitation. Original Git-aware controls pass; neither observation authorizes a guard change or a claim that the frozen broad run passed.

## Final status

- Final status: REVISE
- Rationale: the bounded behavioral checks pass, but R03 QA found a missing BR-0015-0005 to AC-0015-0009 edge. Required full scoped/global validation and Stage 0 refresh also remain incomplete. Observed GREEN and partial-profile PASS do not clear these obligations.
- Historical SDD review pack R01: `.qfai/review/review-20260913154239034`, revision `c56caf1ab6d085eea439d4745245cef99ef6ab1f`, seal `bd45ca609d97b9174661c998312972ee280aa19564a2a2d0a2e387c3a3a60c4f`, status FAIL for whole-workflow REVISE.
- Historical SDD review pack R02: `.qfai/review/review-20260913154239035`, revision `fa981919a4be88f30e01b90cdfbcf54a17000952`, seal `22daf8008489b4a660bddbf61c20017417ec864dda8eeaa6fae3e2e90301e4b5`, status FAIL for whole-workflow REVISE. These packs capture actual older responses without changing their revisions or hashes.
- Recorded validation: scoped SDD PASS; full scoped and global SDD REVISE with the same complete 61/96 error records. This is not whole-workflow completion.
- Collected sequential R03 pack: `.qfai/review/review-20260913155129301`, reviewed revision `a16657d8b43f96a973e79b228d292346d518ed51`, five-file seal `d5339b3afd384ab977701512b51532e49fec5e652f06a8252b3f5febc66039e2`, overall FAIL. Later fixes do not rewrite this immutable reviewed revision or its verdicts.
- Work Order 21 return: `/root/sdd_concrete_architecture_review`, `R03_architecture-reviewer.md`, bounded acceptance PASS; whole-workflow REVISE distinguished in the response. All writes STOPPED before the next role.
- Work Order 22 return: `/root/sdd_concrete_completion_review`, `R03_completion-reviewer.md`, REVISE with two required whole-workflow findings. All writes STOPPED before the next role.
- Work Order 23 return: `/root/sdd_concrete_qa_review`, `R03_qa-gatekeeper.md`, REVISE with three blocking and three advisory findings. Policy/catalog/runtime checks pass; the missing AC-to-BR edge blocks acceptance. All writes STOPPED before correction ownership proceeds.
- Each role independently recomputed audited evidence hash `6ad05d8440268e043274155c1b20b47c02fe4b68d5ae7bb23faec99c6fab1209`. Its subject includes all 23 Work Orders and excludes only this Final status section. Normalized stage record: 24,368 bytes, record digest `d36fd898f33eb0c6e760a99d58849b257fad04bba048430e71b78a395676770a`.
- Named correction return: `/root/sdd_concrete_traceability_author` added only AC-0015-0009 to BR-0015-0005's AC-Refs. Pinned before-edge assertions exit 1; all six after-edge assertions and the unchanged-document comparison pass with exit 0. Explicit operating Markdown format/check pass. All writes STOPPED; this correction is not a new independent review round or a whole-workflow PASS.
- Current follow-up verification: all 33 existing integration and E2E checks in the handoff's three files pass. Format, lint and type gates exit 0. Scoped SDD run `20260914012929282` has zero errors and 16 warnings; the required full/global baseline failures remain open. The immutable R03 reviews continue to attest only their recorded source pin.
- Known-test handoff below records real source identities, not row lifecycle credit. Reuse these cases rather than generate duplicates. Seed identities remain governed by Phase 2b and the implementing owner's binding; current `todo`, dash evidence and original-row payloads remain unchanged. TDD-0015/0016 owning-module reconciliation remains a standing downstream metadata risk outside the approved concrete-pattern reset.

| Pending row | Existing test file                                                     | Existing-case selector                                                                    |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| TDD-0038    | `packages/qfai/tests/integration/spec0015GovernanceAndHandoff.test.ts` | `QFAI:SPEC-0015:TC-0015-0034`                                                             |
| TDD-0039    | `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`      | `preserves adopter profiles on both init paths while emitting the canonical target bound` |
| TDD-0046    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0009`                                                             |
| TDD-0047    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0010`                                                             |
| TDD-0048    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0011`                                                             |
| TDD-0049    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0012`                                                             |
| TDD-0050    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0013`                                                             |
| TDD-0051    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0014`                                                             |
| TDD-0052    | `packages/qfai/tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts`      | `QFAI:SPEC-0015:US-0015-0015`                                                             |
| TDD-0053    | `packages/qfai/tests/e2e/spec0015HygieneLaneToReviewerGateE2E.test.ts` | `US-0015-0016`                                                                            |

- TDD-0038 is bound to the existing TC-0015-0034 Integration case and its unique title-prefix selector. It remains `todo` with DR-ID and Evidence at `-`; this identity binding grants no RED/GREEN or reviewer lifecycle credit.
