# qfai-implement in a workflow run

What `/qfai-implement` does when `qfai workflow` hands it a work order. The
field names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill:

- In mode `active`, a request with no work order and no name is passed to
  `qfai-run` with nothing edited.
- A worker checks the run, stage instance and work-order IDs against the work
  order, then does only that work order's work.

The rest of this file applies to a worker.

## Operations

| Operation        | What the work order asks                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `diagnose-only`  | Reproduce, find the cause, change no code                                                   |
| `test-fix`       | Repair a defective `Unit`, `Component` or `L1`/`L2` `Integration` test the work order names |
| `regression-fix` | Fix the regression under the ledger row that reproduces it                                  |
| `implement`      | The TDD cycle over the bound ledger rows                                                    |
| `seam-only`      | Add the seam an acceptance result asked for, and nothing else                               |

The skill serves exactly these operations. A work order naming any other is refused.

## The bound spec

- A work order whose target binds a spec supplies `primarySpecId`. The User
  Selection Flow then puts no question.
- With no work order, the User Selection Flow asks for confirmation, as it does
  when the skill is invoked by name.

## Resuming a long stage

- A stage resumes at the ledger row its work order's `checkpointRef` names,
  through the work order's own operation.
- The result names row IDs and copies no row's status.
- The phase order of `SKILL.md` is unchanged on resume.

## The ledger check

- A shared Stage 0 snapshot is reused only for the inputs it covers.
- The bound ledger is read and checked by the stage itself at every stage start.
  It is never taken from the snapshot.

## `seam-only`

- The work goes through Phase Red step 3a (Minimal seam) of `SKILL.md`.
- Only the minimal connection the target test needs is landed. The test is left
  failing at its assertion.
- The result names the target test in `seam.targetTestId`.
- The main implementation waits until the acceptance stage has taken RED.

When the seam cannot be landed or observed:

- It is returned `blocked` only with its cause listed in `debts`: owned by
  `operator` for a missing environment, or naming a spec outside the checked
  write scope for a dependency beyond it.
- With no such finding, it is returned `unrun`.
- A cause the stage can repair itself is returned `needs_repair`, never
  `blocked`.
- None of these results reports a `pass` observation, and the main
  implementation still waits.
- A reissued seam-only work order is served as a new attempt of the same
  operation.

## `diagnose-only`

- The operation changes no file git tracks: no product code, test or spec file
  changes, and the result names no changed file.
- A file it writes that git ignores, such as its reproduction record, is named
  in `artifactRefs`, not in `changedFiles`.
- A diagnosis returns exactly one verdict in `diagnosis.verdict`, one of:
  `missing-test`, `defective-test`, `regression`, `expectation-differs`.
- `matchedRowIds` names the ledger rows of the matching existing obligations,
  which the next work order binds.
- `reproductionRef` names the record that holds the reproduction, the cause
  candidates and the impact.

## `regression-fix`

- The fix changes production code only.
- No cell of the ledger row is edited, and its `Status` stays `done`.
- No Change Request is filed and no evidence is deleted. The row is never
  reopened or moved back.
- The same test turning GREEN again confirms the fix.
- The stage result carries the `regressionFix` receipt: `testId` names that
  test, `rerunRef` its GREEN re-run, `reviewRef` its independent review.
- The fix and the re-run are also recorded in the run evidence.
- The re-run is appended to the row's evidence section as a new round carrying
  its own `Revision`, with no ledger cell edited.

## `test-fix`

- This skill takes a test fix for a `Unit` row, a `Component` row, and an
  `Integration` row whose test cases are all `L1` or `L2`.
- It takes none of an `E2E` row, an `API` row, or an `Integration` row with a
  test case at any other level: one `L3` test case among `L1` and `L2` cases
  makes the row `qfai-atdd`'s.
- The result's `testFix` names the AC or BR cited before and after the fix
  (`citedBefore`, `citedAfter`), with an independent review (`reviewRef`) and a
  re-run (`rerunRef`).
- The fix does not edit `Status`, `TC-Refs`, `Layer` or `Boundary`. It may
  change `Test file` and `Selector`.
- The re-run is appended to the row's evidence section as a new round carrying
  its own `Revision`.
- A fix after which the expectation would cite a different AC or BR returns
  `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
  `resolvingOwner`. No accepted test fix is returned for it.
