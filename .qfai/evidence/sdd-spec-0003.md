# Evidence: /qfai-sdd (spec-0003)

## Objective

- Spec target: spec-0003
- Objective: bring spec-0003 back into agreement with the shipped workflow set after the document and validation checks became independent matrix legs behind a result aggregate, and record the coverage that change added.

## Inputs reviewed

- `.qfai/discussion/discussion-20260913135257933`
- `.qfai/contracts/cli/shipped-workflows.md` (CLI-WFSET)
- `.qfai/specs/spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `09_delta.md`, `10_Plan.md`
- `.qfai/specs/spec-0003/tdd/test-list.md`
- `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`
- `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml`
- `packages/qfai/tests/helpers/shippedLaneCommands.ts`
- `packages/qfai/tests/integration/shippedWorkflowShape.ts`
- `.qfai/assistant/catalog/test-layers.md`
- `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md`

## Preflight summary path

- `.qfai/report/preflight/run-20260915133056355/preflight_summary.md` (run id: run-20260915133056355)

## Triage decisions

| Source                  | Subject                                                                                   | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User instruction        | Preserve validation coverage across independent profile jobs                              | UPDATE    | MODIFY | -           | REQ-0031, US-0003-0028, AC-0003-0035 and BR-0003-0043 carried a same-lane ordering requirement the independent legs no longer satisfy. Replaced with invocation coverage keyed by the event that selects each invocation. |
| User instruction        | Account for dependency installs after matrix expansion                                    | UPDATE    | MODIFY | -           | NFR-C0016, AC-0003-0030, BR-0003-0031, EX-0003-0034 and TC-0003-0037 stated one installing job. Two jobs install, and matrix expansion makes the executing count event-dependent.                                        |
| User instruction        | Require independent document checks and validation profiles to complete before aggregate success | UPDATE    | APPEND | -           | AC-0003-0038, BR-0003-0047, BR-0003-0048, EX-0003-0050, EX-0003-0051 and TC-0003-0056..0058 add the concurrency and aggregate-completeness obligations within the existing capability.                                   |

Every row is `UPDATE` with sub-op `MODIFY` or `APPEND`, so none required approval. The full table with its per-row detail is persisted in `.qfai/specs/spec-0003/09_delta.md`.

## Open questions

- none

## Decisions made

- The install count is stated as job declarations plus executing instances per event, rather than as a property with the numbers held only in the test suite. The scheduling cost of parallel legs is what the change buys, and a reader of the spec should see it.
- `.qfai/contracts/cli/shipped-workflows.md` section 5 is amended in the same change as the spec. The spec cites the contract rather than restating it, so leaving the contract stale would have left every citation pointing at the wrong text.
- `tdd/test-list.md` gains the `Boundary` column only. The remaining template columns and row groups are a separate migration, recorded as its own task.
- The six new ledger rows stand at `todo`. Phase 2b seeds a row; `Status`, `DR-ID` and `Evidence` belong to `/qfai-implement`, and this cycle has no standing to write them. `Test file` and `Selector` are kept, which is what every other `todo` row in this ledger carries.
- No falsifiability record is asserted for those rows, and no ATDD evidence file is written. The tests exist and pass, but the stages that own their provenance have not run.
- Section 5 states what the declared shape pins and names the job and step declarations as the surface that pins which leg runs an invocation and which event selects it. The dimension gate reads neither a step condition nor a matrix axis, so a stronger claim would have described a check that does not exist.
- `TC-0003-0056`..`TC-0003-0058` declare `Level: integration`. The layer derivation puts them at L3, and a `TC` row's `Level` stays within L1–L3.

## Work performed

- `.qfai/specs/spec-0003/01_Spec.md` — NFR-C0016 rewritten; REQ-0031 gains the aggregate-lane clause.
- `.qfai/specs/spec-0003/02_User-stories.md` — US-0003-0023 and US-0003-0028 notes extended.
- `.qfai/specs/spec-0003/03_Acceptance-Criteria.md` — AC-0003-0030 and AC-0003-0035 corrected; AC-0003-0038 added.
- `.qfai/specs/spec-0003/04_Business-Rules.md` — BR-0003-0031 and BR-0003-0043 corrected; BR-0003-0047 and BR-0003-0048 added.
- `.qfai/specs/spec-0003/05_Examples.md` — EX-0003-0034 corrected; EX-0003-0050 and EX-0003-0051 added.
- `.qfai/specs/spec-0003/06_Test-Cases.md` — TC-0003-0037 corrected; TC-0003-0056, TC-0003-0057 and TC-0003-0058 added.
- `.qfai/specs/spec-0003/tdd/test-list.md` — `Boundary` column added and filled for the two split test cases; TDD-0058..TDD-0063 added at `todo`.
- `.qfai/contracts/cli/shipped-workflows.md` — section 5 dimensions 5 and 6 amended.
- `tests/integration/qfai-traceability.md` — carrier entries for the three new test cases. This is the only tree the annotation scan reads, so an annotation in `packages/qfai/tests/**` answers nothing.
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`, `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts` — test names carry their test-case and ledger ids.
- `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts` — TC-0003-0037 now counts executing job instances per event.
- `packages/qfai/tests/integration/shippedWorkflowShape.ts` — dimension 6's title follows the amended contract wording.
- `scripts/dogfood-backlog.json` — the spec-0003 ledger pin tightened from 75 to 73, and the entry for a discussion pack that reached zero errors removed. The ratchet fails an improved file left un-repinned, so both edits are required together.
- `.github/pinned-bytes.txt`, `.github/required-status-contexts.json`, `.github/workflows/ci.yml` — digests re-derived after the backlog pin changed. `scripts/dogfood-backlog.json` is pinned by byte digest, that file is pinned inline in the workflow, and the workflow's step body is pinned in the status-context declaration.

## Contract executability

- none

## Commands executed

```
npx qfai sdd preflight --fail-on error
npx qfai validate --profile sdd --fail-on error --spec spec-0003 --format text
node scripts/check-dogfood-backlog.mjs --profile full
node scripts/pin-guard-bytes.mjs && node scripts/pin-verification-bodies.mjs
node scripts/check-workflow-hygiene.mjs --root .
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflow tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts
pnpm format:check && pnpm lint && pnpm lint:md && pnpm lint:mdschema && pnpm check-types
```

## Validate evidence paths

- `.qfai/report/validate.log`
- `.qfai/report/run-20260915152200259/` (run id: run-20260915152200259, status: pass)
- `.qfai/report/specs-coverage/spec-0003.md`

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                                                                    | Evidence             |
| ----- | ------- | -------------------- | -------------------- | --------------------------------------------------------------------------- | -------------------- |
| 0     | run     | 2026-09-15T04:55:00Z | 2026-09-15T05:00:00Z | 2 settled, 0 escalated                                                      | #work-orders-summary |
| 1     | skipped | -                    | -                    | empty: no `_policies` artifact changed                                      | -                    |
| 2     | run     | 2026-09-15T04:55:00Z | 2026-09-15T05:00:00Z | 2 settled, 0 escalated                                                      | #work-orders-summary |
| 2c    | skipped | -                    | -                    | empty: answered by CLI-WFSET section 5                                      | -                    |
| 3     | skipped | -                    | -                    | empty: answered by `10_Plan.md`, whose ordering this change does not touch  | -                    |

One session covered Phase 0 and Phase 2 together, because the contract amendment and the spec rows that cite it are one decision set. Four decisions were put to the user and settled by the user. Phase 0 owns two: whether the contract is amended in the same change, and how far the ledger migrates. Phase 2 owns the other two: how the install count is stated, and what status the new ledger rows carry. Two later decisions, both raised by the review gate, were put to the user the same way: whether the ledger rows return to `todo`, and whether section 5 follows the gate or the gate follows section 5.

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance          | Task title                                     | Input (refs)                                                 | Output (refs)                                                                 | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ----------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst  | requirements-analyst#1  | NFR and REQ correction, user-story notes       | 09_delta.md Triage rows 1-2                                  | `01_Spec.md`, `02_User-stories.md`                                            | PASS                         |
| 2    | solution-architect    | solution-architect#1    | Contract section 5, acceptance criteria, rules | 09_delta.md Triage rows 1-3, CLI-WFSET                       | `shipped-workflows.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`    | PASS                         |
| 3    | test-design-analyst   | test-design-analyst#1   | Examples, test cases, ledger, annotations      | 09_delta.md Triage rows 2-3, `test-layers.md`                | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`, test annotations     | PASS                         |
| 4    | completion-reviewer   | completion-reviewer#1   | Independent audit of the cycle                 | every artifact above                                         | completion verdict, two rounds                                                | PASS                         |
| 5    | architecture-reviewer | architecture-reviewer#1 | Contract and shipped-structure audit           | CLI-WFSET section 5, the two shipped workflows, the shape module | architecture verdict, two rounds                                          | PASS                         |

No instance appears in both an authoring step and a review step. Both reviewers returned `REVISE` on their first round; the findings were acted on and both returned `PASS` on re-check.

## Gaps / Open risks

- The six new ledger rows stand at `todo` while the tests they name already exist and pass. A later `/qfai-atdd` run owes their provenance, and it cannot observe a natural RED, because the implementation ships in the same change.
- `.qfai/evidence/coverage-depth-spec-0003.md` does not exist. `QFAI-ATDD-131` is the standing finding that names it. <!-- qfai:not-a-citation -->
- The document lane's two matrix legs each repeat the full dependency install ahead of one short checker, so the split buys both failures surfacing in one run rather than shorter wall time.
- No dimension of the declared shape reads a step condition, a matrix axis or an external check name. A change to any of them is caught as a byte difference rather than as a named obligation.
- `tdd/test-list.md` still carries the eight-column shape plus `Boundary`. The remaining columns and the Integration, E2E and API row groups are tracked separately.

## Final status

- Final status: PASS
- Rationale: both routed reviewers returned `PASS` on re-check, and the spec-scoped validate gate reports no error.
