# ATDD Evidence: spec-0013

## Objective

Carry the proof for five of this spec's twelve `done` ledger rows. The other
seven are not backfilled and the reasons are under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0013/06_Test-Cases.md`
- `.qfai/specs/spec-0013/02_User-stories.md`
- `.qfai/specs/spec-0013/tdd/test-list.md`
- `packages/qfai/tests/integration/sddUiTemplate.test.ts`
- `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`
- `packages/qfai/tests/integration/primaryTasksStructured.test.ts`
- `packages/qfai/tests/core/activeDiscussionPack.test.ts`
- `packages/qfai/tests/core/surfaceTypePopulate.test.ts`

## Decisions made (with rationale)

Every row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

No row can produce an observed RED — every implementation shipped long before
this record — so all five take the falsifiability path.

Seven rows carried a `Selector` written as a summary of the obligation rather
than a test's title. Each was corrected to the title of the case that carries
the obligation, after reading the `Verify` line of its test case against what
the test asserts. Two more — `TDD-0023` and `TDD-0026` — already named the tail
of their `describe` title, without the leading test-case id, and resolve because
the runner matches a substring.

A `Selector` correction stands on its own: it makes the row name a case that can
be run, and says nothing about whether that case discharges the obligation.
Three of the four rows this run leaves unbackfilled therefore carry a corrected
`Selector` and keep their original `Evidence` cell; the fourth, `TDD-0026`, is
unchanged in both.

## Work performed (what changed, where)

- `.qfai/specs/spec-0013/tdd/test-list.md` — seven `Selector` cells rewritten to
  the titles they name, and the `Evidence` cells of the five rows below rewritten
  as pointers into this file. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Row        | Mutation                                          | Killed              |
| ---------- | ------------------------------------------------- | ------------------- |
| `TDD-0020` | the empty-list test forced false                  | 3 of 4              |
| `TDD-0023` | the resolved pack path altered                    | 1 of 4              |
| `TDD-0024` | the pointer-to-pack match made unconditional      | 1 of 4              |
| `TDD-0029` | a fourth key added to the required set            | 4 of 6              |
| `TDD-0030` | the shape finding's rule code renamed             | 4 of 6              |

Refactor verify: 25 passed. Checkpoint: 8986 passed, exit 0.

The checkpoint holds two files of the `core` project out, named in its command:
`tests/core/prFixMonitor.test.ts` and `tests/core/prMergePlan.test.ts` drive a
PowerShell script, and this container has no `pwsh`, so eighteen of their
nineteen cases fail on `spawn pwsh ENOENT` whatever the tree holds. They run in
continuous integration, which does have it.

Validate gate: `npx qfai validate --profile atdd --fail-on error --spec 0013`
at the same revision — `counts: info=2 warning=0 error=0`, exit 0.

## Test volume estimate

Not applicable. This run authored no test; it records proof for rows whose tests
already exist.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

No row changed status. Every row below was already `done`.

| TDD-ID     | Obligation      | Layer       | RED provenance | Status |
| ---------- | --------------- | ----------- | -------------- | ------ |
| `TDD-0020` | `TC-0013-0026`  | integration | falsifiability | done   |
| `TDD-0023` | `TC-0013-0028`  | integration | falsifiability | done   |
| `TDD-0024` | `TC-0013-0029`  | integration | falsifiability | done   |
| `TDD-0029` | `TC-0013-0034`  | integration | falsifiability | done   |
| `TDD-0030` | `TC-0013-0035`  | integration | falsifiability | done   |

Three of the five reach part of a multi-clause obligation. The part each reaches
is recorded with the row, so the evidence says what it proves rather than
restating what the test case asks for.

| Row        | Reached by the recorded case                                                             | Not reached                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TDD-0020` | The lane fails at `error`, and the message names the file, the screen and the rule token | That `/qfai-prototyping` preflight then refuses. One case asserts it, in the end-to-end file `TDD-0022` names            |
| `TDD-0023` | The helper returns the pack `state.json#discussion.currentId` names                      | That it does so without scanning modification times. A case under the sibling test case asserts it, by reading the source |
| `TDD-0024` | A missing pointer and an absent pack each raise a recovery error                         | A pointer resolving to a duplicate pack. No case supplies one                                                            |

The refactor-verify and checkpoint runs are shared by all five rows, so each
entry records the same pair:

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)

Eight further files and 43 cases in those projects declare themselves inactive
and did not run.

### TDD-0020

- TDD-ID: TDD-0020
- Layer: integration
- Test file: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts
- Selector: TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty
- TC-ref: TC-0013-0026
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, checkContractHierarchyFromScreens — the empty-list test that opens the `QFAI-AUD-001` branch.
- Round 1: Falsifiability command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 3 failed, 1 passed (4). This row's own case fails on the absent finding.
- Round 1: Falsifiability revision: working-tree+2931d34aa471bfb18f339e1a1d66f4bf091412090a43cf61665b2282ee4700fb
- Round 1: GREEN command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: dd54681a79a41a321eff0d7aecac91ad559688a61a4530155ddfad172b6428b7
- Round 1: RED test manifest: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts

Forcing the test false silences the finding for an empty list and for a legacy
contract alike, so three of the file's four cases die. The surviving case is the
one this row's sibling owns.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0023

- TDD-ID: TDD-0023
- Layer: integration
- Test file: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Selector: active pack resolved from state.json#discussion.currentId
- TC-ref: TC-0013-0028
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, resolveActiveDiscussionPack — the path it returns for the pack the pointer names.
- Round 1: Falsifiability command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+42e4c18da50aab10d10eec68a1777bcf971a1b2c3b586da67af18d726dd795e7
- Round 1: GREEN command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: f707c0a49fe7893d759c7aebc8859047777f9b9505d50f0e7d4f202f30f13d71
- Round 1: RED test manifest: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0024

- TDD-ID: TDD-0024
- Layer: integration
- Test file: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Selector: TC-0013-0029: ambiguous/absent active pointer raises a recovery error
- TC-ref: TC-0013-0029
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, resolveActiveDiscussionPack — the filter that matches the pointer against the packs on disk.
- Round 1: Falsifiability command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). The dangling-pointer case fails; the error stops being raised.
- Round 1: Falsifiability revision: working-tree+01dcf4fa9d5f24f9cbd5321207d20ffb4fc433eb459fc66c27021b2f38734669
- Round 1: GREEN command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: f707c0a49fe7893d759c7aebc8859047777f9b9505d50f0e7d4f202f30f13d71
- Round 1: RED test manifest: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0029

- TDD-ID: TDD-0029
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0034: structured primary_tasks accepted
- TC-ref: TC-0013-0034
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/contracts/screenContracts.ts, REQUIRED_PRIMARY_TASK_KEYS — the closed set a structured item is measured against.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 4 failed, 2 passed (6). This row's acceptance case fails on the complete item it is meant to admit.
- Round 1: Falsifiability revision: working-tree+e9c87b9362c368ec472519a028f2a933c792d5228d3460dbcd53ccd142d86c82
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: d798fda11f10e7516c51e3b1aaee98a7c9ab6fd5c86b1e78303e2234803d2c6e
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts

Adding a fourth required key rejects every item, so the rejection cases fail too
— they name the key they expect to be reported missing, and the mutation adds a
second one to every finding.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0030

- TDD-ID: TDD-0030
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0035: incomplete / open structured primary_tasks rejected
- TC-ref: TC-0013-0035
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, shapeFindingFor — the rule code a shape violation is reported under.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 4 failed, 2 passed (6). Every rejection case fails; the finding is no longer reported under the code they read.
- Round 1: Falsifiability revision: working-tree+31eb23a6df91e77744655424faf54d2f2bcd603df00be8a19eee4a04997d638b
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: d798fda11f10e7516c51e3b1aaee98a7c9ab6fd5c86b1e78303e2234803d2c6e
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0013.md`.
Totals: ✅ 75 / ⚠️ 105 / ❌ 313, with 8 not applicable, across 501 scored cells —
441 matrix depth cells (49 rows × 9 columns) and 60 business rule cells
(20 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                     | Status (PASS/REVISE/PENDING) |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the forty-nine obligations and write the matrix    | PASS                         |
| completion-reviewer | Audit every claim this file makes against the repository | PENDING                      |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

Seven of the pack's twelve `done` rows are not backfilled. Six name an
obligation the code states the opposite of, or one no test reaches; the seventh
cannot carry a pointer at all.

| Row        | Obligation     | What stops it                                                     |
| ---------- | -------------- | ----------------------------------------------------------------- |
| `TDD-0019` | `TC-0013-0025` | The obligation contradicts a sibling test case                    |
| `TDD-0021` | `TC-0013-0027` | Half the obligation is stated the other way round by the product  |
| `TDD-0022` | `US-0013-0011` | The ledger has no `US-Refs` column for an `e2e` row to read       |
| `TDD-0025` | `TC-0013-0030` | The test drives a helper no production path calls                 |
| `TDD-0026` | `TC-0013-0031` | The obligation says `warning`; the validator emits `error`        |
| `TDD-0027` | `TC-0013-0032` | The count band the obligation states was removed from the product |
| `TDD-0028` | `TC-0013-0033` | The same band                                                     |

Three of the four keep a corrected `Selector`, so the row names a case that can
be run; `TDD-0026` is unchanged. All four keep their original `Evidence` cell,
so none claims more than it did before.

**`TC-0013-0025` cannot be satisfied as written.** It requires every `screens[]`
entry of the shipped template to carry a literal `primary_tasks: []`.
`TC-0013-0026`, in the same pack, requires the validate lane to fail at `error`
on exactly that value. A template shipping an empty list would hand the author a
contract that fails on first use, so the template ships filled entries and the
test asserts only that the key is present and is a list. The narrower assertion
is the right one; the obligation above it is the half that needs a Change
Request.

**`TC-0013-0027` has two halves and the product answers the second one the other
way.** The lane passing silently on a non-empty list is covered. Pre-existing
slot-less contracts, which the obligation calls informational and non-blocking,
are emitted at `error` past sunset — the covering case says so in its own title.

**`TC-0013-0030` names `/qfai-sdd`; the test names a helper.**
`populateSurfaceTypeIfUiCompanion` has no caller anywhere in `src`, and the
obligation's second half — that `resolveAllUiBearingSpecs()` still requires the
frontmatter as the strict signal — is not exercised at all.

**`TC-0013-0031` specifies `warning` during the deprecation window.**
`validateSurfaceTypeDrift` sets `error` with no window logic, and the covering
case asserts `error` under a `describe` still named "warns". `AC-0013-0023`,
`BR-0013-0018` and `US-0013-0013` say the same thing as the test case, so either
the window closed and four spec layers are stale, or the escalation was early.

**`TDD-0022` cannot carry a pointer at all.** It declares `Layer: e2e`, and an
`e2e` row's obligation is read from a `US-Refs` column. This ledger has only
`TC-Refs`, so the obligation reads as empty and no evidence entry can match it.
The row does name a real user story in the column it has. Adding the column
changes the table every row shares, and it belongs with the `Boundary` column
the same ledger owes.

**`TDD-0027` and `TDD-0028` name a count band the product dropped.**
`TC-0013-0032` and `TC-0013-0033` state a `primary_tasks` band of 3..7. The
validator's lower bound was removed and the tests now assert that one through
seven emit nothing. The `Selector` of both rows is reported unresolved, which is
the one signal this drift raises on its own.

**One rule is emitted from two places.** `QFAI-AUD-001` is built independently
in `checkContractsHierarchy` and in `checkContractHierarchyFromScreens`, both
called from `validateDesignAudit` — the first over a discussion-pack sidecar,
the second over the UI contracts. The two message texts and severities are
maintained separately. Nothing here depends on that, and no test covers the
pair, so a change to one can silently diverge from the other.

## Final status

PASS for the five rows recorded here, each for the part of its obligation named
under "Ledger rows advanced". This is a per-row verdict, not a stage verdict:
the pack is not clean, and seven of its twelve `done` rows are listed under Gaps
rather than claimed.
