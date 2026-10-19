---
name: common-gate-run
owner: common
purpose: "Run one gate — a qfai validate profile or a project command from the Standard commands — and record its command, result and revision, so a gate that did not run is never read as a pass."
requires: []
roles: []
---

# common-gate-run

The calling step names the gate and the scope. This step resolves the command,
runs it and records what happened. Where a command comes from is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`,
and how a failure is handled is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.
Neither is restated here.

## Reads

- `<paths.contractsDir>/tech.md#standard-commands-copy-paste` for a project
  command: Install, Format, Test, Lint, Typecheck, Build, Skeleton, Validate or
  Pack / distribution.
- The `Runtime` and `Platform` rows of `<paths.contractsDir>/tech.md#stack`
  for the environment a command runs in.
- `qfai.config.yaml` for `paths.contractsDir`, `paths.outDir` and the test
  globs.
- The launcher the preflight established, for a qfai command
  (`.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory`).
- `.agents/rules/temporary-files.md`, when this step writes captured output or a script to a
  file.
- `.agents/rules/api-budget.md`, when this step reads CI state or the project's items through
  the forge's API.

## Procedure

1. **Determine applicable gates before resolving commands.** Use the calling
   stage's scope and the project's declared scope. Do not narrow the gate set
   from the diff alone: a gate that looks unrelated to the change, such as a
   test gate for a change to documents only, is still run and its result
   recorded. Decide whether the conditional `Build` (if relevant)
   and `Pack / distribution` (if distributed) gates apply from those scopes.
   When a condition is false, omit its gate from `gates` and record the reason
   in the stage report. A required gate with a missing command, launcher or
   environment remains UNRUN.
2. **Resolve the launcher once per stage.** Before the first qfai gate, run the
   launcher preflight. Where it fails, every qfai gate is UNRUN: record it as a
   blocker and stop.
3. **Resolve the command.** A qfai gate is the validate profile and scope the
   calling step names, for example
   `npx qfai validate --profile sdd --fail-on error --flow BF-NNNN`. A project
   gate is the matching entry of the Standard commands section, used as
   written. An entry that is missing makes the gate UNRUN: record it and route
   the gap as the rule says; never substitute a command from another stack.
   An entry written `CI only: <check name>` instead of a command is not run
   here: record the gate DELEGATED with that check name. Record its `ci` state
   as `green`, `red` or `pending` from the pull request when one exists; with no
   result yet, record `pending`. A gate the user's instruction for this run
   delegates to CI is recorded the same way, as `verify-repo-gate` says.
4. **Run it** on the tree the stage will hand to its reviewer, in the
   environment the `Runtime` and `Platform` rows declare.
5. **Report** in the stage report: the exact
   command, the exit code, the counts or outcome, the revision the run read,
   and for a validate run the `<paths.outDir>/validate.log` path and the
   `run-*/` directory its `run_log:` line names. The CLI writes that log on
   every run; shell redirection is not needed.
6. **Read a validate result from its JSON** where the step selects work from
   it. The result is usable only when the file exists, its `profile` is the one
   run, and its `generatedAt` is no earlier than this run's start. Read `counts`
   for the verdict and `issues[].code` for each finding; the array is `issues`
   (`.qfai/assistant/skill/qfai-verify/references/validate-json-schema.md`).
7. **On a failure**, classify each finding and repair only what this stage
   owns, then rerun the same gate on the same scope. A gate that failed and then
   passed with no change in between is a nondeterministic gate: record every
   run, in order.

## CI evidence

A branch overview locates runs; it is not a formal verification receipt.
For each required verification, record the following in the stage report:

- Target, current full head SHA, verification and intended purpose.
- Workflow identity and name, event, run ID or URL containing the run ID, and run attempt.
- Job identity and name, check identity and name, status and conclusion.
- For test checks, actual test counts and the executed behavior they cover, with the job log or
  artifact that proves them. Distinguish missing counts from zero executed tests.
- For lint, build and other non-test checks, evidence of actual execution and
  results from their logs or artifacts. Do not invent test counts for these checks.
- Any closed-pull-request cleanup purpose, with the evidence that confirms the
  pull request was closed and this run was selected for cleanup rather than verification.
- Remaining blocker and resume condition, or an explicit statement that neither
  remains. Record unavailable identity or purpose as unknown and unverified.

Identify job IDs and check IDs separately where present; record their absence
where the platform provides neither. An ID labelled only as check/job is
ambiguous: record its identity as unverified until the job and check are distinguished.

Use head, workflow, event, run attempt, job, check and purpose together. The same
head SHA and check name do not make two runs the same verification. A
`pull_request` event or later timestamp alone does not prove closed cleanup.
A confirmed closed cleanup SKIP is neither a behavioral PASS nor an override
of verification. A matrix job skipped by the declared selection policy may be
legitimate, but its SKIP does not prove that its behavior ran.
Retain an identified successful verification for its target and head when a
later run is confirmed closed cleanup; the cleanup SKIP does not replace it.

A green result for an old SHA does not verify the current head. A later failure
for the same verification on the current head cannot be replaced by its older
success. Keep the failure visible until a matching verification actually passes.
Missing logs or unknown purpose leave execution unverified. For test checks,
missing counts or zero executed tests do not prove behavioral coverage.
These receipt details belong in the stage report; do not
add fields or states to `verify.json`.

### Synthetic worked example

The following receipts are synthetic, not evidence from an actual repository.
They concern test checks for the required unit suite.
All target branch `example/topic` at full head
`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, with required verification
`unit suite` and check name `tests`. Each run, attempt, job, check and log is
identified separately.

| Receipt              | Workflow identity / name; event  | Run ID / attempt | Job identity / name; check identity / name | Purpose and proof                                                                                 | Status / conclusion     | Actual counts and behavior                             | Log                                                                                          |
| -------------------- | -------------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Earlier verification | `71` / `CI`; `push`              | `91001` / `1`    | `81001` / `unit`; `71001` / `tests`        | Run configuration selects the unit suite                                                          | `completed` / `success` | 29 passed, 0 failed, 0 skipped; 29 unit tests executed | `receipts/unit-success.log` contains the test summary                                        |
| Later verification   | `71` / `CI`; `workflow_dispatch` | `91002` / `2`    | `81002` / `unit`; `71002` / `tests`        | Run configuration selects the same unit suite                                                     | `completed` / `failure` | 28 passed, 1 failed, 0 skipped; 29 unit tests executed | `receipts/unit-failure.log` contains the failing test and summary                            |
| Closed cleanup       | `72` / `Cleanup`; `pull_request` | `91003` / `3`    | `81003` / `unit`; `71003` / `tests`        | Payload action is `closed`, target state is closed, and a selection job log confirms cleanup only | `completed` / `skipped` | 0 passed, 0 failed, 0 executed; no unit test coverage  | `receipts/cleanup-selection.log` records the selection; the skipped test job has no test log |

The required unit verification remains FAIL after the later verification. The
cleanup SKIP neither clears it nor proves the unit behavior passed. Resume with
the actual repair and a matching verification on the resulting current head.

For a test check, if an actual reported run has only a head and check name, its missing workflow,
event, attempt, job, purpose, counts and logs remain unknown. Record it as
unverified with those gaps as blockers; the synthetic rows do not fill them.

## Scope

- A flow-scoped gate covers that flow. A result for another flow or another
  profile does not close it, and a sibling flow still being edited is not part
  of it.
- A finding attributed to another flow or owner is reported with that owner. It
  is neither repaired here nor counted as this gate's pass.
- A repository-wide PASS is never claimed from one flow's result.

### Selected-case execution

When the caller selects a focused Test case, record its command arguments,
cwd, file and case selection, actual runtime version, reporter, revision and raw output.
Link the EX and source declaration to the full file/parent/case identity and
observed body execution and terminal result. Keep exit, counts, containers
and static scanner linkage separate; none proves that selected behavior ran.

Zero selected executions or unidentifiable, skipped, TODO, cancelled or
interrupted target results cannot close the focused phase. Retain the output,
name the missing evidence, correct selection or observation and repeat it.
Read
`.qfai/assistant/skill/qfai-implement/references/red-admissibility.md#selected-case-execution`
before judging a focused RED or ordinary success. A focused result establishes
only its selected case; the existing verify run owns full collection coverage.
This human receipt changes no gate status or JSON field and adds no runner.

## Outcomes

| Outcome     | Means                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `PASS`      | The command ran on the reviewed tree and exited 0 with zero errors                                              |
| `FAIL`      | The command ran and reported an error or a non-zero exit                                                        |
| `UNRUN`     | No command, no launcher, or no environment to run it in                                                         |
| `DELEGATED` | The project runs the gate in CI only, by the check its entry names, or the user delegated it to CI for this run |

Only `PASS` satisfies a gate here. A `DELEGATED` gate is satisfied by its CI
check, which runs on the pull request: it is not a pass, and it is not a
failure until that check is red. `FAIL` and `UNRUN` go in the stop report with
the reason and the retry condition. Do not weaken a profile, lower `--fail-on`,
waive an error or invent a result to reach `PASS`.

## A failure that predates the change

Before a failing gate is attributed to the change, run it again on the base
commit: the revision the change branched from, in a clean checkout that holds
none of the change. Build it the same way, so a failure that needs a build is
not read from a stale one.

| Base result                            | Record                                       |
| -------------------------------------- | -------------------------------------------- |
| The same failures                      | `FAIL`, baseline `same`: it predates the run |
| Fewer, other or no failures            | `FAIL`, baseline `different`: the run's own  |
| The gate cannot run on the base either | `FAIL`, baseline `unrun`, with the reason    |

The comparison is between the failing tests or findings, not the exit code.
The result stays `FAIL`; a baseline of `same` explains it and never turns it
into a pass. The run did not cause it, so it is reported and not repaired.

### A suite whose result depends on timing or load

A browser suite or another timing-dependent suite can fail differently from run
to run, so one base run made under other conditions is not a fair comparison.

- Run the gate on the base commit under the conditions of the run it is
  compared with, and record the parallelism and the load of both runs in the
  stage report. A comparison whose conditions are not recorded is not made.
- Count a chain of failures once. A failure is folded into a chain only when
  it follows an earlier failure of the same file and reads as a consequence of
  it, such as a closed browser or a timeout. Match a failure with the base by
  test identity, and a folded chain by its file.
- Run alone the files that hold a failure the base run did not show. A failure
  that passes alone but fails in the suite on the changed branch, and not on the
  base under the same conditions, is reported as a possible order or
  shared-state effect of the change, with a suspected cause, as
  `.qfai/assistant/rule/references/gate-failure-autorepair.md#nondeterministic-gates`
  says. It is left out of the comparison only after a full-suite rerun of the
  changed branch under the same conditions that does not show it. Record every
  run in order.
- The baseline is still `same`, `different` or `unrun`, and the result is still
  `FAIL`. A failure left out is not in the base set, so the `reason` of the gate
  and the final report list each one with its result run alone and in the
  full-suite rerun, and the user who decides whether to commit sees that list.
  No other state or field is recorded.
