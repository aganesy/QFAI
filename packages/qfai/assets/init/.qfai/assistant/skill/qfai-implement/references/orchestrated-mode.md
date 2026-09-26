# qfai-implement in a workflow run

What `/qfai-implement` does when `npx qfai workflow` hands it a work order. The
field names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill:

- In mode `active`, a request with no work order and no name is passed to
  `qfai-run` with nothing edited.
- A worker checks the run, stage instance and work-order IDs against the
  outstanding work order, as the full check states, then does only that work
  order's work.

The rest of this file applies to a worker.

## Operations

| Operation        | What the work order asks                                            |
| ---------------- | ------------------------------------------------------------------- |
| `diagnose-only`  | Reproduce, find the cause, change no code                           |
| `test-fix`       | Repair a defective test whose annotation names an EX                |
| `regression-fix` | Fix the regression an existing correct test catches                 |
| `implement`      | The TDD cycle over the bound flow's examples that no test annotates |
| `seam-only`      | Add the seam an acceptance result asked for, and nothing else       |

The skill serves exactly these operations. A work order naming any other is refused.

## The bound flow

- A work order whose `target` binds a flow supplies the flow. The gate and the
  next-example selection run with `--flow BF-NNNN` for it, and no question asks
  which flow.
- With no work order, the skill chooses the flow as it does when invoked by
  name.

## Resuming a long stage

- A stage resumes at the example its work order's `checkpointRef` names,
  through the work order's own operation.
- The result names EX IDs and records no progress state of its own: a test
  annotating an example is what says the example is done.
- The phase order of `SKILL.md` is unchanged on resume.

## The example selection

- A shared Stage 0 snapshot is reused only for the inputs it covers.
- The stage runs `npx qfai validate --profile tdd --flow BF-NNNN` itself at
  every stage start and selects its next example from that result. It is never
  taken from the snapshot.

## `seam-only`

- The work goes through the minimal seam of `references/walking-skeleton.md`
  and `references/red-admissibility.md`.
- Only the minimal connection the target test needs is landed. The test is left
  failing at its assertion.
- The result names the target test in `seam.targetTestId`.
- The main implementation waits until the acceptance stage has taken RED.

When the seam cannot be landed or observed:

- A cause outside the stage's write areas, such as a missing environment, is
  returned `blocked`, with the cause listed in `debts` and `operator` as its
  `resolvingOwner`.
- A cause the stage can repair inside its write areas is returned
  `needs_repair`, never `blocked`.
- None of these results reports a `pass` observation, and the main
  implementation still waits.
- A reissued seam-only work order is served as a new attempt of the same
  operation.

## `diagnose-only`

- The operation changes no file git tracks: no product code, test, story or
  contract file changes, and the result names no changed file.
- A file it writes that git ignores, such as its reproduction record, is named
  in `artifactRefs`, not in `changedFiles`.
- A diagnosis returns exactly one verdict in `diagnosis.verdict`, one of:
  `missing-test`, `defective-test`, `regression`, `expectation-differs`.
- `matchedIds` names the BF, AC or EX IDs of the bound flow that the next work
  order acts on. For `missing-test` it names the EX that states the case, or
  the AC the case falls under where no EX states it.
- `reproductionRef` names the record that holds the reproduction, the cause
  candidates and the impact.

## `regression-fix`

- The fix changes production code only. No test, story or contract file
  changes.
- The example stays annotated by the same test. No `Change request:` row is
  appended and no evidence entry is removed.
- The same test turning GREEN again confirms the fix.
- The stage result carries the `regressionFix` receipt: `testId` names that
  test, `rerunRef` its GREEN re-run, `reviewRef` its independent review.
- The fix and the re-run are recorded in `.qfai/evidence/implement-BF-NNNN.md`
  for the bound flow, after the entries already there.

## `test-fix`

- This skill takes a test fix when the first ID of the diagnosis's
  `matchedIds` is an EX. A BF or an AC is `qfai-atdd`'s, as
  `.qfai/assistant/rule/test-layers.md` maps those layers.
- The result's `testFix` names the IDs the test annotates before and after the
  fix (`citedBefore`, `citedAfter`), with an independent review (`reviewRef`)
  and a re-run (`rerunRef`).
- The fixed test annotates the same IDs as before. Its file or test title may
  change. No story, contract or `decisions.md` file changes.
- The re-run is recorded in `.qfai/evidence/implement-BF-NNNN.md` for the bound
  flow.
- A fix after which the expectation would check a different ID returns
  `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
  `resolvingOwner`. No accepted test fix is returned for it.
