---
name: verify-repo-gate
owner: qfai-verify
purpose: "Run the repository's quality gates, repair failures until every gate in scope passes, and report the result and write the verdict."
requires: [common-gate-run]
---

# verify-repo-gate

The repository gates, the fix loop over every failing gate, and the two
outputs: the evidence a person reads and the verdict downstream gates read.

## Reads

- The scope and the QFAI gate results `verify-qfai-gate` reported.
- The gate commands, through `common-gate-run`.
- `.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`,
  before writing the verdict.

## Writes

Create and update `.qfai/report/verify.json`.

## Procedure

1. Determine the applicable repository gates through `common-gate-run` before
   resolving their commands, then run those gates (below).
2. Run the fix loop until every gate in scope passes, or stop as it says.
3. Report the result.
4. Write the verdict.

## Repository gates

Run them through `common-gate-run`, in this order, each with the Standard
commands entry named after the colon:

1. format check: `Format`
2. lint: `Lint`
3. typecheck: `Typecheck`
4. unit and component tests: `Test`
5. integration and API tests: `Test`
6. E2E tests: `Test`
7. build/package (if relevant): `Build`
8. pack/verify (if distributed): `Pack / distribution`

Run listed commands and record outputs. A gate that looks unrelated to the
change is still run and its result recorded; `verify.json` has no status for a
gate that does not apply to the change. A conditional gate whose condition is
false is left out of `gates` with its reason, as `common-gate-run` step 1
says. A gate is not run here, and is recorded `DELEGATED` with its check name,
when its Standard commands entry is `CI only: <check name>`, or when the
user's instruction for this run delegates that gate to a named CI check. A delegation by
instruction holds for this run only and is recorded as `## Report` says. A
standing instruction in the project's agent instructions counts for each run it
is in force; quote it. Either delegation requires an actual CI check covering
the same gate and scope;
local environment failure alone creates no delegation, and the agent never
delegates a gate on its own judgment. Retain observed FAIL or
UNRUN results. Where the environment cannot run any other command, ask the user
to run it and provide the output. Never assume PASS without evidence.

## Fix loop

Quality gates are the decision mechanism. Fix until PASS.

In a route the code review has already read the diff, and the verify stage
holds no review. A repair this loop
makes is therefore listed in the final report with its diff, as a change made
after the code review, and the user sees it there. Invoked by name, the run's
one code review reads the repair, as `qfai-verify`'s `## Review` section says.

- If failing, produce an actionable fix list (not vague). Stop and escalate
  when a gate fails without one.
- Before attributing a failure to the change, run the gate on the base commit,
  as `common-gate-run`'s `## A failure that predates the change` says. A
  failure that is the same there is reported with its baseline and is not
  repaired.
- Identify whether the failure is a spec mismatch, a test issue or an
  implementation defect, and fix the root cause. Do not silence a test without
  a reason.
- Repair as
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`
  says, and rerun the failing gate, the QFAI gate included, after each fix
  batch.
- Verify never rewrites the story tree or a contract. A spec or contract
  finding goes to its owner through `.qfai/assistant/rule/drift-protocol.md`:
  `/qfai-sdd` or `/qfai-implement`.
- A fix made after the code review is listed in the final report with its
  diff. No review runs again.
- In a `resolve-conflicts` run for one of several branches, the fix loop
  repairs nothing: a failing gate undoes the merge (`git merge --abort`, or
  `git reset --merge ORIG_HEAD` after the commit), and the branch is held.

## Report

Report the scope, every gate command with its result, the open risks and the
next actions.

For CI results, keep the full receipt in the stage report as
`.qfai/assistant/step/common-gate-run/STEP.md#ci-evidence` requires. A branch
overview and a confirmed closed cleanup SKIP do not replace actual verification.

For a `DELEGATED` gate, record `check` and `ci` (`green`, `red` or `pending`).
In the stage report, bind evidence to the target and current head: run ID or URL,
check, actual outcome and counts, blocker and resume condition. If no run exists,
record that fact. A result for another head does not pass this head; a missing
or mismatched result remains pending. Keep earlier failures visible.

For a gate delegated by instruction, the stage report quotes the user's
instruction word for word and says where it came from: this request, an answer
to a question, or the project's agent instructions. It names the gate, the
check and its state with the quote. `verify.json` carries only `check` and
`ci`, and its `summary` says "delegated by user instruction". If no instruction
can be quoted, the gate is not delegated.

Name pending checks in `summary` and the stage report. A covered verification
commit may use the existing DELEGATED allowance in `verify-commit`; it does not
complete verification. With explicit delegation (CI-only or by instruction)
covering transport,
actual changes addressing a failed check through the existing planned fix may
be committed while HEAD still names the failing commit. Every nondelegated gate
must pass. Retain the prior head, check, run and observed result as FAIL, and
report the actual fix and new head after committing. Never relabel the prior
failure pending or transport the same unchanged red candidate. The new candidate
remains unverified until its own results are observed; report a missing run as
missing. Formal completion or merge requires actual passing results for every
required check on the current target and head. Pending, red, missing or
mismatched evidence stops completion. Repair follows the existing
fix procedure under its own covered authority.

### Acceptance evidence and follow-up

When implementation, verification or handoff scope includes acceptance scaffolds
or unfinished BF/AC acceptance bodies, include these five fields in the human
report. A lint-only scope without these bodies needs no acceptance report.

| Field                      | Report                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Annotation proof           | BF/AC annotation IDs, their test files and the inspection or validation result that established them.                                                                                                                                                   |
| Acceptance bodies          | Empty, implemented and unclassified body counts, with each counting unit and file references. Keep BF test bodies and AC test bodies separate; test bodies are not unique obligations. Use UNKNOWN, not zero, for a count inspection did not establish. |
| Asserted behavior and runs | The actual assertion that observes each implemented body's BF or AC, and its actual run results with evidence references. An annotation alone does not establish the assertion or its execution.                                                        |
| Observed outcomes          | PASS, FAIL, skipped, UNRUN and pending observations, with their logs or evidence references. Only an actual run supplies an execution result. A passing empty body establishes no behavioral proof.                                                     |
| Remaining work             | Identified unfinished BF/AC bodies and files, the actual owner or UNASSIGNED, completion criteria and the next route. Use `write-acceptance-tests` to write the remaining bodies under its existing acceptance-writing rules.                           |

Do not derive completed ACs by subtracting empty bodies from the suite's pass
total. An assertion for another EX does not complete an empty AC body. Zero
validation errors do not prove BF/AC behavior. Guidance fixtures prove the
reporting guidance they inspect, not an adopter's actual behavior.

For example, an illustrative inspection can identify two AC test bodies, one
empty and one with recorded assertion and run evidence, plus one unclassified
BF test body. Report those body counts with their separate units and files;
the remaining bodies still need owners and completion criteria. If inspection
has not established the count, write UNKNOWN. If no owner has been assigned,
write UNASSIGNED; do not invent an assignment or a successful run.

Legitimate empty bodies keep their existing exemption. An actual required-check
FAIL remains FAIL, and the acceptance-writing completion gate is unchanged.
When using the existing optional `verify.json` summary, keep one or two short
sentences naming remaining work, its owner or UNASSIGNED, and the detailed
report reference. Put the table in the human report, without new JSON fields,
statuses, scopes, gates or routes.

### Full collection evidence

During the existing normal verify run, record the full intended collection
and actual collection and execution. Reconcile omitted cases against
comparable case membership at the same revision, command/filter, runner and
environment, or explain intentional differences. Preserve the Standard Test
command's quoted arguments: shell expansion can change collection depth.
Equal aggregate counts do not prove equal membership. Keep unknown expected
counts unknown; unexplained omissions prevent a full-scope completion claim.

A focused target pass, file/container success or static annotation linkage
proves no full collection. For a focused case's source identity, actual body
execution, terminal state and raw evidence, read
`.qfai/assistant/skill/qfai-implement/references/red-admissibility.md#selected-case-execution`.
Keep its result distinct from full-scope evidence. No extra full run is
required during each focused cycle. Record these facts in the existing human
report; add no permanent inventory, ledger, JSON field, gate status, runtime
parser or runner.

### Run report

When the report cites test runner results, record these items in the human
report for each layer the gates ran:

| Item              | Record                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revision and run  | What the CI receipt in `.qfai/assistant/step/common-gate-run/STEP.md#ci-evidence` lists, and the deployed source when a test reaches a deployment, with any difference from that commit.                          |
| Counts per layer  | For each layer, such as unit, integration or API, E2E and device: the runner, the command, and the collected, passed, failed and skipped counts, with the report file each count came from.                       |
| Skips             | Each skipped case with its reason, and whether the skip is intended for this run, such as a case that runs only on the default branch.                                                                            |
| Fresh or cached   | Whether each layer ran in this run or was restored from a cache. A result restored from a cache names the run that produced it and is not reported as a fresh execution.                                          |
| Retries           | A retried case counts once, with its final outcome and the number of attempts.                                                                                                                                    |
| Support cases     | Setup, teardown and fixture cases, counted apart from the cases that check behavior.                                                                                                                              |
| UNKNOWN and UNRUN | A count no report establishes is UNKNOWN. A layer that did not run, whose report is missing, or that collected no cases is UNRUN with its reason, such as a test that needs a physical device. Neither is a pass. |

These items say what ran, not what is covered. An annotation, an assertion and a
passing case do not prove every clause of a requirement. Where the report states
the semantic coverage of a requirement, state it apart from the run report, and
do not mark a requirement covered because its annotated test passed.

A layer recorded UNRUN here is UNRUN for the gate that covers it, under
`## Verdict` and `## A missing environment`; this recipe changes no gate status.

## Verdict

Write `.qfai/report/verify.json` at the end of the run. It is the
machine-readable verdict downstream gates read, and the evidence markdown does
not replace it. `status` is `"PASS"` only when every gate in scope passed or is
`DELEGATED` to a CI check that is not red for the candidate being evaluated.
A red check for that candidate or a non-delegated UNRUN gate makes `status`
`"FAIL"`. Preserve the previous candidate's FAIL evidence when an explicitly
covered transport commit carries actual repairs into a new candidate. Its own
pending delegated checks permit only that transport, never formal completion;
they do not replace the earlier failed result. Keep revision and run evidence
in the stage report, without adding verdict fields or states.
`scope` is the gate set `verify-qfai-gate` covered through execution or an
matching delegated (CI-only or by instruction) check, never a stage this run did not
cover. Delegation does not claim that its validation profile has already run. Fields, the closed `scope` enum, a conforming example and what must
never be written are in
`.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`.

## After CI

Compare a CI result against the verification commit made from the tree the
verdict covers: the commit `verify-commit` names. When a delegated check's
result is observed for that commit, update `.qfai/report/verify.json`:

- set that gate's `ci` to the observed state;
- the gate stays `DELEGATED` and is never rewritten `PASS`;
- set `status` again from every gate by the `## Verdict` rule, so a red check
  makes it `"FAIL"` and a later green rerun on the same commit clears that `FAIL`.

Name the run, check and commit in the stage report. A result for another
commit changes nothing. Formal completion still needs every required check
green on the current head.

## Stage report

Inside an `npx qfai workflow` run, the stage runs every required gate over the
run's change and reports each result.

- The stage writes this run's `.qfai/report/verify.json` and names its scope and
  the revision checked in the stage report, with the commands and evidence for
  each gate.
- A `verify.json` written by another run, scoped to another flow or kept in a
  shared location is never named as this stage's report.
- Report the stage's completion or stop separately from actual test and gate
  observations. A required gate that did not run is UNRUN, never a pass.
- A gate delegated (CI-only or by instruction) is DELEGATED, with its check name and
  observed CI status.

Keep these details in the stage report and session handoff. `verify.json`
keeps only the fields and values in
`.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`.

## Findings verify did not cause

Inside a run, verify edits no artifact another owner holds. A finding it did
not cause returns `needs_repair`. The stage report and handoff name the
finding, its evidence and affected paths, the repair owner and the repair
needed before verification can resume.

| Finding                   | Owner            |
| ------------------------- | ---------------- |
| A story or contract gap   | `qfai-sdd`       |
| An acceptance-test defect | `qfai-implement` |
| An implementation defect  | `qfai-implement` |

These three are the only repairs verify hands off to an owner.

## A missing environment

- A gate whose environment is missing leaves the stage `blocked`. Record
  the missing environment in the stage report, with the operator as its owner
  and the capability needed to resume.
- This is an environment stop, not a product repair. The gate remains UNRUN
  with its reason.

## A failure the run did not cause

A gate that fails the same way on the base commit, or could not run, is
recorded in the report and in `gates` of `verify.json`, with its `baseline` or
its `reason`. The top-level `status` stays `"FAIL"`, so the run stops before
`verify-commit`. The final report lists each such gate apart from the failures
the run caused, so the user can decide whether to commit.

For a gate with baseline `same`, `reason` names the failing test identifiers
and the environment they fail in. The identifiers are the ones observed failing
in the base commit's run, executed as `common-gate-run`'s
`## A failure that predates the change` says, never assumed. The stage report
adds how to confirm it: the base commit's result, and the result of the same
gate in CI when a check covers it, with the run or check named. A CI result that
was not observed is written as unknown, never as a pass. The report ends by
asking the user whether to commit with those gates open, as
`.agents/rules/user-questions.md` says; nothing is committed before the answer.
Under a no-question mode, or with no question tool, the report lists those gates
as open and stops without committing.

## Gate

The step is done when:

- every gate in scope ran and is recorded, or is recorded UNRUN with the
  reason, or is recorded DELEGATED with its CI check;
- every gate passes, or each failure has an actionable fix list and an owner;
- `verify.json` exists, its `status` matches the gate results and its `scope`
  matches the required validate profile. A delegated validation check must cover
  that same profile and scan; a whole-repository scope still requires a full
  scan. Pending delegation never claims it ran.

For this skill, the smallest applicable smoke check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`
is the whole gate set of the scope, run to completion, with every outcome in
`verify.json` and the report.

A PASS needs zero errors in the declared profile. A successful custom Validate
wrapper does not waive validation errors or replace a full scan. Where the
project has them, the distributed-surface guard and branch version pin must also
pass.
