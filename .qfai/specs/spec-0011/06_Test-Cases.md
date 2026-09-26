# 06 Test Cases

## TC-0011-0001: Full TDD Cycle Completion

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0001
- Verify that an item transitions through all phases with evidence at each step.

## TC-0011-0002: Backward Transition Produces Error

- EX-Ref: EX-0011-0002
- AC-Refs: AC-0011-0002
- Verify that green -> red transition produces the expected error message.

## TC-0011-0003: QA Gatekeeper Authority

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0003
- Verify that only qa-gatekeeper confirms RED/GREEN observations.

## TC-0011-0004: Exception Missing DR-ID Error

- EX-Ref: EX-0011-0003
- AC-Refs: AC-0011-0004
- Verify that exception without DR-ID produces the expected error.

## TC-0011-0005: Parallel Dispatch Deny Conditions

- EX-Ref: EX-0011-0005
- AC-Refs: AC-0011-0005
- Verify that writing the same shared fixture/mock file, or mutating the same
  fixture instance, blocks parallel dispatch, while a read-only shared fixture
  module does not.

## TC-0011-0006: 10-Point Gate Enforcement

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0006
- Verify that all 10 checklist points are checked before `done` transition.

## TC-0011-0007: Fresh Evidence Required

- EX-Ref: EX-0011-0004
- AC-Refs: AC-0011-0007
- Verify that stale and status-only evidence is rejected.

## TC-0011-0008: All Done Reports Nothing To Do

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0008
- Verify that re-running implement with all items done produces "nothing to do".

## TC-0011-0009: Minimal Code For The One Failing Test

- EX-Ref: EX-0011-0006
- AC-Refs: AC-0011-0011
- Verify that Phase Green asks for the minimum production code that makes the
  failing test pass, that it is written after the failure has been watched
  rather than before, and that it refuses a generalization no test yet asks
  for.

## TC-0011-0010: Reviewer Separation Before `done`

- EX-Ref: EX-0011-0007
- AC-Refs: AC-0011-0006
- Verify that the item is reviewed by `completion-reviewer` and
  `implementation-reviewer`, and that `done` is reachable only once every
  required reviewer has passed.

## TC-0011-0011: Simplified Handoff Schema Parse

- EX-Ref: EX-0011-0008
- AC-Refs: AC-0011-0009
- Verify `/qfai-implement` parses a simplified-only `prototype-handoff.yaml` without errors and that adding a legacy field (`mustPreserve`) emits a schema warning and is otherwise ignored.

## TC-0011-0012: Design System Mirror Byte-Equivalence

- EX-Ref: EX-0011-0009
- AC-Refs: AC-0011-0010
- Verify `/qfai-implement` reads `design-system.yaml` token tables that are byte-equivalent to root `DESIGN.md` token tables after parse normalization, and surfaces drift through the design contract validators.

## TC-0011-0028: The Implement Stage Follows the Stage-Skill Handover

- EX-Ref: EX-0011-0025
- AC-Refs: AC-0011-0026
- Type: normal
- Level: L3
- Verify, by reading the shipped `qfai-implement/SKILL.md` and `qfai-implement/references/orchestrated-mode.md`, that `SKILL.md` holds exactly one line citing `references/orchestrated-mode.md`, and that the reference states the entry check: in mode `active`, a request with no work order and no name is passed to `qfai-run` with nothing edited, and a worker checks the run, stage instance and work-order IDs and does only that work order's work.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/stageSkillHandover.test.ts`. The mismatched-work-order refusal is the shared stage-skill rule's case and is not repeated here.

## TC-0011-0014: The Operations Table Lists Exactly the Implement Operations

- EX-Ref: EX-0011-0011
- AC-Refs: AC-0011-0013
- Type: normal
- Level: L3
- Verify that `qfai-implement/references/orchestrated-mode.md` has a heading exactly `## Operations`, that the first table under it has a first column headed `Operation`, and that the set of backticked IDs in that column equals the literal set `diagnose-only`, `implement`, `seam-only`, `regression-fix`, `test-fix` the test holds.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/operationsTable.test.ts`. Whether the shipped plans load against this table is the workflow core's test and is not asserted.

## TC-0011-0015: A Valid Run Binding Supplies the Primary Spec Without a Question

- EX-Ref: EX-0011-0012
- AC-Refs: AC-0011-0014
- Type: normal
- Level: L3
- Verify that the reference states that a work order whose target binds a spec supplies `primarySpecId` and that the User Selection Flow then puts no question, and that with no work order the User Selection Flow asks for confirmation as it does when the skill is invoked by name.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/runBinding.test.ts`.

## TC-0011-0016: A Long Stage Resumes at a Ledger-Row Boundary

- EX-Ref: EX-0011-0013
- AC-Refs: AC-0011-0015
- Type: normal
- Level: L3
- Verify that the reference states that a stage resumes at the ledger row its work order's `checkpointRef` names, through the work order's own operation; that its result names row IDs and copies no row's status; and that the skill's phase order is unchanged on resume.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/checkpointResume.test.ts`.

## TC-0011-0017: The Ledger Check Is Made on the Current Ledger

- EX-Ref: EX-0011-0014
- AC-Refs: AC-0011-0016
- Type: normal
- Level: L3
- Verify that the reference limits reuse of the shared preflight snapshot to the inputs the snapshot covers, and states that the bound ledger is read and checked by the stage itself at every stage start and never taken from the snapshot.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/ledgerCheckNotCached.test.ts`.

## TC-0011-0018: A Seam-Only Work Order Lands Only the Minimal Connection

- EX-Ref: EX-0011-0015
- AC-Refs: AC-0011-0017
- Type: normal
- Level: L3
- Verify that the reference's `seam-only` passage routes the work through the existing minimal-seam step of `SKILL.md`, states that only the minimal connection the target test needs is landed and that the test is left failing at its assertion, names the target test in the result, and states that the main implementation waits until the acceptance stage has taken RED.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts`. A seam-only result that observes `pass` is refused by the core, which is not this case's.

## TC-0011-0019: A Diagnose-Only Operation Changes No File

- EX-Ref: EX-0011-0016
- AC-Refs: AC-0011-0018
- Type: normal
- Level: L3
- Verify that the reference's `diagnose-only` passage states that the operation changes no file git tracks, so no product code, test or spec file changes and its result names no changed file, and that a file it writes that git ignores, such as its reproduction record, is named in `artifactRefs` rather than in `changedFiles`.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/diagnoseOnlyNoTrackedFile.test.ts`. The core's refusal of a diagnose-only result that changed a file is not this case's.

## TC-0011-0020: A Diagnosis Returns One Verdict From the Closed Set

- EX-Ref: EX-0011-0017
- AC-Refs: AC-0011-0019
- Type: normal
- Level: L3
- Verify that the reference states that a diagnosis returns exactly one verdict, `matchedRowIds` naming the ledger rows of the matching existing obligations that the next work order binds, and a `reproductionRef` naming the record that holds the reproduction, the cause candidates and the impact. Verify also that the verdicts it names equal the literal set `missing-test`, `defective-test`, `regression`, `expectation-differs` the test holds.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/diagnosisVerdict.test.ts`. Which plan branch a verdict leads to is the workflow core's and is not asserted.

## TC-0011-0021: A Diagnosed Missing Test Raises No Change Request

- EX-Ref: EX-0011-0018
- AC-Refs: AC-0011-0020
- Type: normal
- Level: L3
- Verify that the scope-gap line of `qfai-implement/references/change-request-reset.md` and the scope-gap line of `qfai-implement/SKILL.md` each state that a diagnosed missing test on behaviour the spec already states raises no Change Request and adds no ledger row from this skill, and each name `/qfai-sdd` as the skill that appends the row. Verify also that each keeps the Change Request for every other scope gap.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/missingTestCarveOut.test.ts`.

## TC-0011-0022: A Regression Fix Leaves the `done` Row `done`

- EX-Ref: EX-0011-0019
- AC-Refs: AC-0011-0021
- Type: normal
- Level: L3
- Verify that the reference's `regression-fix` passage states that the fix changes production code only, that no cell of the ledger row is edited and its `Status` stays `done`, that no Change Request is filed and no evidence is deleted, and that the row is never reopened or moved back. The test fails when `Status` is among the cells the passage lets the fix change.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/regressionFixKeepsDone.test.ts`. The core's refusal of a result that moved a `done` row is not this case's, and the forward-only lifecycle stays TC-0011-0002's.

## TC-0011-0023: The Same Test Turning GREEN Confirms a Regression Fix

- EX-Ref: EX-0011-0020
- AC-Refs: AC-0011-0022
- Type: normal
- Level: L3
- Verify that the reference states that the same test turning GREEN again confirms the fix; that the stage result carries the `regressionFix` receipt with `testId`, `rerunRef` and `reviewRef`, naming that test, its GREEN re-run and its independent review; that the fix and the re-run are also recorded in the run evidence; and that the re-run is appended to the row's evidence section as a new round carrying its own `Revision`, the form the ledger validator already reads, with no ledger cell edited.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/regressionFixReceipt.test.ts`. The core's refusal of a regression fix without that receipt is not this case's.

## TC-0011-0024: A Test Fix Leaves the Ledger Row's Status Alone

- EX-Ref: EX-0011-0021
- AC-Refs: AC-0011-0023
- Type: normal
- Level: L3
- Verify that the reference's `test-fix` passage states that the result names the AC or BR cited before and after the fix, with an independent review and a re-run; names `Status`, `TC-Refs`, `Layer` and `Boundary` as cells the fix does not edit, and `Test file` and `Selector` as cells it may change; and appends the re-run to the row's evidence section as a new round carrying its own `Revision`. The test fails when `Status` is among the cells the fix may change, or when the round is not required.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/testFixLedgerRow.test.ts`.

## TC-0011-0025: A Change of Meaning Is Routed to SDD

- EX-Ref: EX-0011-0022
- AC-Refs: AC-0011-0024
- Type: error
- Level: L3
- Verify that the reference states that a test fix after which the expectation would cite a different AC or BR returns `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its resolving owner, and that no accepted test fix is returned for it.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/testFixMeaningChange.test.ts`. The core's refusal of a result whose cited AC or BR changed is not this case's.

## TC-0011-0026: Implement Takes a Test Fix Only for a Unit-Layer Row

- EX-Ref: EX-0011-0023
- AC-Refs: AC-0011-0025
- Type: boundary
- Level: L3
- Verify that the reference assigns `test-fix` to `/qfai-implement` for a `Unit` row, a `Component` row and an `Integration` row whose test cases are all `L1` or `L2`, and to none of an `E2E` row, an `API` row or an `Integration` row with a test case at another level. The boundary is the `Integration` row: one `L3` test case among `L1` and `L2` cases takes it away from this skill.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/testFixLayers.test.ts`. The acceptance-layer half of the assignment is `/qfai-atdd`'s and is not asserted here.

## TC-0011-0027: A Seam That Cannot Be Landed Is Returned by Who Can Clear It

- EX-Ref: EX-0011-0024
- AC-Refs: AC-0011-0017
- Type: error
- Level: L3
- Verify that the reference's `seam-only` passage states that a seam the stage cannot land or observe is returned `blocked` only with its cause listed in `debts`, owned by `operator` for a missing environment or naming a spec outside the checked write scope for a dependency beyond it, and `unrun` where there is no such finding. Verify also that it states a cause the stage can repair itself is returned `needs_repair`, never `blocked`; that no such result reports a `pass` observation; that the main implementation still waits; and that a reissued seam-only work order is served as a new attempt of the same operation.
- Notes: test module `packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts`. The core's refusal of a `blocked` result whose finding a skill could repair, that the parent acceptance attempt stays open, and that `next` reissues the seam-only work order after `resume`, are the workflow core's behaviour and are not asserted.
