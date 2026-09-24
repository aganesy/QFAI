# 05 Examples

## EX-0011-0001: Normal TDD Cycle

- BR-Ref: BR-0011-0002, BR-0011-0003
- Given TDD-0001 with status `todo`
- When implement runs: write failing test -> observe RED -> write minimal code -> observe GREEN -> refactor -> reviewers PASS
- Then status transitions: todo -> red -> green -> refactor -> done

## EX-0011-0002: Backward Transition Blocked

- BR-Ref: BR-0011-0002
- Given TDD-0002 with status `green`
- When transition to `red` is attempted
- Then error "Backward transition prohibited: green -> red" is produced

## EX-0011-0003: Exception Without DR-ID

- BR-Ref: BR-0011-0002
- Given TDD-0003 transitioning to `exception`
- When DR-ID column is empty
- Then error "exception status requires DR-ID in DR-ID column" is produced

## EX-0011-0004: Stale Evidence Rejected

- BR-Ref: BR-0011-0005
- Given TDD-0004 with evidence from a previous run
- When completion is checked
- Then stale evidence is rejected and fresh evidence is required

## EX-0011-0005: Parallel Dispatch Denied

- BR-Ref: BR-0011-0001
- Given two items that both write the same shared fixture/mock file, or that
  mutate the same fixture instance
- When delivery-planner evaluates
- Then parallel dispatch is denied (the concurrent write violates independence)
- And the mere existence of a shared read-only fixture module, which neither
  item writes and each consumes as-is, is not a deny on its own

## EX-0011-0006: Minimal Code For The One Failing Test

- BR-Ref: BR-0011-0004
- Given a failing test that asserts one field of a response
- When Phase Green writes production code for it
- Then that field is what the code adds, and a second case no test asks for is not generalized ahead of its own RED

## EX-0011-0007: Reviewer Separation Before `done`

- BR-Ref: BR-0011-0006
- Given the implementation worker that wrote the item
- When the item is put forward for `done`
- Then `completion-reviewer` and `implementation-reviewer` each return PASS first, and the worker's own approval is neither of them

## EX-0011-0008: Simplified Handoff Parse

- BR-Ref: BR-0011-0007
- Given a `prototype-handoff.yaml` containing only `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`
- When `/qfai-implement` parses the handoff
- Then no errors occur and no legacy field reads are attempted; if a legacy `mustPreserve` field is present, a schema warning is emitted and the field is ignored

## EX-0011-0009: Design System Mirror Read

- BR-Ref: BR-0011-0008
- Given `extractedDesignSystem` points to `.qfai/contracts/design/design-system.yaml` whose tables match root `DESIGN.md` byte-for-byte after parse normalization
- When `/qfai-implement` consumes the token tables
- Then the consumed tables equal the parsed root `DESIGN.md` tables; any drift is surfaced through the design contract validators

## EX-0011-0010: A Worker Does Only Its Work Order, and an Unaddressed Request Is Passed On

- BR-Ref: BR-0011-0009
- Given workflow mode `active` and a work order for run `run-20260924045712999`, stage instance `implement-1` and operation `implement`, bound to three ledger rows of one spec
- When `/qfai-implement` receives it and the run, stage instance and work-order IDs all match the issued order
- Then it works those three rows only, and says nothing to the operator
- And when it is selected in the same mode with no work order and not by name, it edits nothing and passes the request to `qfai-run`
- And `qfai-implement/SKILL.md` holds exactly one line citing `references/orchestrated-mode.md`

## EX-0011-0011: The Implement Operations Table

- BR-Ref: BR-0011-0010
- Given `qfai-implement/references/orchestrated-mode.md`
- When the first table under its `## Operations` heading is read
- Then the `Operation` column holds exactly `diagnose-only`, `implement`, `seam-only`, `regression-fix` and `test-fix`, one backticked ID per cell, and no other operation

## EX-0011-0012: The Run Binding Names the Primary Spec

- BR-Ref: BR-0011-0011
- Given an `implement` work order whose `target` is `{ kind: "spec", specId: "spec-0003" }`
- When the stage starts
- Then `spec-0003` is the `primarySpecId` and the User Selection Flow puts no question
- And when `/qfai-implement` is invoked by name with no work order, the User Selection Flow asks the user to confirm the spec, as it does today

## EX-0011-0013: A Long Stage Resumes at the Row Its Checkpoint Names

- BR-Ref: BR-0011-0012
- Given an `implement` work order bound to three ledger rows, whose `checkpointRef` names the second row after the first reached `done` in an earlier attempt
- When the stage resumes
- Then it starts the TDD cycle at the second row and does not rework the first
- And its result names the rows by ID and carries no copy of any row's `Status`
- And each row still goes through RED, GREEN, refactor and review in the skill's own order

## EX-0011-0014: The Snapshot Is Reused, the Ledger Check Is Not

- BR-Ref: BR-0011-0013
- Given an active run whose shared preflight snapshot is `valid` for the inputs it covers, and a bound spec whose `tdd/test-list.md` gained a `Blocked-By` cell on one bound row after the snapshot was taken
- When the implement stage starts
- Then it takes the inputs the snapshot covers from the snapshot
- And it reads the current `tdd/test-list.md` and runs its own ledger checks on it, so the blocked row is not worked

## EX-0011-0015: A Seam-Only Order Registers the Route and Leaves the Assertion Failing

- BR-Ref: BR-0011-0014
- Given a `seam-only` work order whose `parentWorkOrderId` names the acceptance work order, for target test `orders::creates an order`, which fails with `Cannot find module "../src/routes/orders"`
- When `/qfai-implement` serves it through the minimal-seam step
- Then it registers the route with a handler answering `501`, a status the row does not contract for, and writes no order-creation logic
- And the target test now fails at `expect(response.status).toBe(201)`, and the result's `seam` reports that test with observation `fail`
- And the main implementation of the row waits until the acceptance stage has taken RED at that assertion

## EX-0011-0016: A Diagnosis Changes No Tracked File

- BR-Ref: BR-0011-0015
- Given a `diagnose-only` work order naming the AC the reported behaviour should meet and the scope to search
- When `/qfai-implement` serves it and reproduces the defect
- Then the result's `changedFiles` is empty, and no file git tracks differs from the tree the work order was issued on, so no product code, test or spec file changed
- And the reproduction record it writes, which git ignores, is named in `artifactRefs` and not in `changedFiles`

## EX-0011-0017: One Verdict per Diagnosis

- BR-Ref: BR-0011-0016
- Given four reported defects against behaviour the spec states: (a) no test covers the behaviour; (b) the covering test reads a fixture that contradicts the spec; (c) the covering test is correct, its row is `done`, and it now fails; (d) what the operator expects differs from what the spec states
- When each is diagnosed
- Then each result carries exactly one verdict: (a) `missing-test`, (b) `defective-test`, (c) `regression`, (d) `expectation-differs`
- And in (b) and (c) its `matchedRowIds` names the ledger row of the covering test, which the next work order binds; in (a) and (d) it names the rows of the matching existing obligations, and none where there are none
- And its `reproductionRef` names a record that holds the reproduction, the cause candidates and the impact

## EX-0011-0018: A Missing Test Goes to SDD Without a Change Request

- BR-Ref: BR-0011-0017
- Given a diagnosis with verdict `missing-test` on behaviour an existing AC states
- When `/qfai-implement` handles that scope gap
- Then it files no Change Request and adds no ledger row, and `/qfai-sdd` appends the row
- And the scope-gap line of `references/change-request-reset.md` and the one in `SKILL.md` each state that carve-out and cite DR-0297
- And a scope gap found another way, such as a new obligation found during a RED round, still goes through a Change Request

## EX-0011-0019: A Regression Is Fixed in Production Code Only

- BR-Ref: BR-0011-0018
- Given a `done` row whose correct, existing test fails after a change to `src/pricing.ts` dropped the tax line from the order total
- When `/qfai-implement` serves the `regression-fix` work order
- Then it changes `src/pricing.ts` only, and no test or spec file
- And every cell of the row is unchanged and its `Status` is still `done`
- And no Change Request is filed and no evidence entry is deleted

## EX-0011-0020: The Same Test Turning GREEN Confirms the Regression Fix

- BR-Ref: BR-0011-0019
- Given the regression fix of EX-0011-0019
- When the stage returns
- Then the same test has run GREEN again, and the stage result carries the `regressionFix` receipt: `testId` naming that test, `rerunRef` its GREEN re-run and `reviewRef` its independent review
- And the fix and the GREEN re-run are also recorded in the run evidence
- And the row's own `### TDD-NNNN` evidence section gains a new `#### Round N` block carrying `Round N: Revision` for the fixed tree, the earlier rounds stay as they were, and no ledger cell is edited
- And where `paths.srcDir` covers `src/pricing.ts`, that round is what keeps the row from being reported stale

## EX-0011-0021: A Wrong Fixture Is Fixed and the Row Keeps Its Status

- BR-Ref: BR-0011-0020
- Given a `Unit` row at `Status` `done` whose test builds its order from a fixture in the wrong currency, and a diagnosis verdict `defective-test`
- When `/qfai-implement` serves the `test-fix` work order and corrects the fixture
- Then the result's `testFix` names the same BR in `citedBefore` and `citedAfter`, a `reviewRef` from an independent reviewer and a `rerunRef` for the re-run
- And the row still reads `Status` `done`, with the same `TC-Refs`, `Layer` and `Boundary`; its `Test file` and `Selector` may change where the test moved or was renamed
- And the row's own evidence section gains a new `#### Round N` block carrying `Round N: Revision`, and the earlier rounds stay as they were

## EX-0011-0022: A Fix That Would Cite Another BR Goes to SDD

- BR-Ref: BR-0011-0021
- Given a test fix after which the expectation would cite a different BR than before
- When the implement stage returns
- Then the outcome is `needs_repair`, and `debts` lists that finding with `resolvingOwner` `qfai-sdd`
- And no result with an accepted `testFix` is returned

## EX-0011-0023: Which Rows Implement Takes a Test Fix For

- BR-Ref: BR-0011-0022
- Given five defective rows: a `Unit` row; a `Component` row; an `Integration` row whose `TC-Refs` name one `L1` and one `L2` test case; an `Integration` row whose `TC-Refs` name one `L2` and one `L3` test case; and an `E2E` row
- When the `test_fix` stage is assigned
- Then `/qfai-implement` serves the work order for the first three rows
- And it serves none for the `Integration` row with an `L3` test case, or for the `E2E` row

## EX-0011-0024: A Missing Environment Blocks a Seam-Only Stage

- BR-Ref: BR-0011-0014
- Given a `seam-only` work order for target test `orders::creates an order`, and a test process that cannot start because its database container is absent, so the seam cannot be observed at the target test
- When `/qfai-implement` serves it
- Then the result's outcome is `blocked`, and `debts` lists the missing environment with `resolvingOwner` `operator`
- And its `seam` reports no `pass` observation, nothing beyond the minimal connection is written, and the main implementation of the row is not started
- And where the cause is one the stage can repair inside its write areas, such as a type error in a helper it may edit, the result is `needs_repair` and not `blocked`
- And the acceptance attempt that asked for the seam stays open: when `resume` has cleared the cause, the seam-only work order is issued again as a new attempt and served the same way
