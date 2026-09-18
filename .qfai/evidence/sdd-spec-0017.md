# Evidence: /qfai-sdd (spec-0017)

## Objective

- Spec target: spec-0017
- Objective: move the aligned slice set off seven names, because each of the two test
  files that spawn a process per case now takes a runner of its own.

## Inputs reviewed

- `.qfai/specs/spec-0017/01_Spec.md` (REQ-0011)
- `.qfai/specs/spec-0017/03_Acceptance-Criteria.md` (AC-0017-0027)
- `.qfai/specs/spec-0017/04_Business-Rules.md` (BR-0017-0057)
- `.qfai/specs/spec-0017/05_Examples.md` (EX-0017-0057)
- `.qfai/specs/spec-0017/06_Test-Cases.md` (TC-0017-0062)
- `.qfai/specs/spec-0017/tdd/test-list.md` (TDD-0062)
- `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts` — the four surfaces the rule binds
- `packages/qfai/tests/helpers/runnerProjects.ts` — `GLOB_SHAPE`, which decides what an
  include glob may look like

## Preflight summary path

- Preflight run id 20260918144217322: ready, source `discussion-pack`, seven imported
  requirements, no blockers.
- Written as the run id and its outcome rather than as a path. The report tree is not
  committed, so a path there reads as provenance a reader cannot open.

## Triage decisions

| Source   | Subject                                                                                | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0011 | The aligned slice set gains a runner for each test file that spawns a process per case | UPDATE    | MODIFY | -           | Two files sit in one project and take every core the runner has. A runner each is what stops them competing, and it moves the aligned set off seven. The count is restated rather than dropped: it is the only claim that catches a shrink every surface agreed to. |

## Open questions

- none

## Decisions made

- DELTA-0001 Triage row (REQ-0011, UPDATE:MODIFY): the aligned slice set holds nine names.
- Slice names are `pr-fix` and `pr-merge` — adjudicated by the user. A slice name is the
  runner project name, the `test:<slice>` script key, the matrix entry and the test
  directory name, so one word has to read correctly in four places.
- `AC-0017-0027` states a present-tense invariant rather than the one-time transition it
  carried — adjudicated by the user. Nine does not follow from that transition, so the
  scenario would otherwise assert a setup that cannot produce its own outcome.
- Each file moves into a directory of its own rather than the `core` project gaining an
  exclusion. `GLOB_SHAPE` admits only `<dir>/**/*.test.ts`, so a literal file path is not a
  glob this repository's own counting rule can read. Settled by that rule, not by preference.

## Work performed

- `.qfai/specs/spec-0017/01_Spec.md` — REQ-0011's count clause
- `.qfai/specs/spec-0017/03_Acceptance-Criteria.md` — AC-0017-0027, its scenario and its
  catalog row
- `.qfai/specs/spec-0017/04_Business-Rules.md` — BR-0017-0057 title, rule and rationale
- `.qfai/specs/spec-0017/05_Examples.md` — EX-0017-0057 expected value
- `.qfai/specs/spec-0017/06_Test-Cases.md` — TC-0017-0062 title and falsifying oracle
- `.qfai/specs/spec-0017/tdd/test-list.md` — TDD-0062 reset to `todo`, selector restated,
  prior trail kept as history of the superseded obligation
- `.qfai/specs/spec-0017/09_delta.md` — the Triage row
- `.qfai/specs/spec-0017/10_Plan.md` — the four statements the move makes false, and a row
  for each new project's include glob naming that project's consumers
- `.qfai/specs/spec-0017/07_Decisions.md` — the floor lane's own statement of the slice set,
  which named it a second time; it now defers to `BR-0017-0057`

## Contract executability

- none

## Commands executed

```sh
npx qfai sdd preflight --fail-on error
npx qfai validate --profile sdd --fail-on error --spec spec-0017 --format github
```

## Validate evidence paths

- Validate run id 20260918145343249, scope `--profile sdd --spec spec-0017`: pass, zero
  errors, fifteen warnings and four info. Every warning predates this change — the
  unreplaced sample brand, and broken links in the work-log tree.
- The run log and the coverage summary sit under the same uncommitted report tree, so
  they are named by run id and outcome rather than by path.

## Pre-draft Grilling

| Phase | Session   | Ended at             | Wrote at             | Frontier                   | Evidence             |
| ----- | --------- | -------------------- | -------------------- | -------------------------- | -------------------- |
| 0     | skipped   | -                    | -                    | empty: no contract under `.qfai/contracts/**` names the slice set, so this phase wrote nothing | -                    |
| 1     | skipped   | -                    | -                    | empty: `_policies/**` states no slice count | -                    |
| 2     | run       | 2026-09-18T14:45:00Z | 2026-09-18T14:48:00Z | 3 settled, 0 escalated     | #work-orders-summary |
| 2c    | skipped   | -                    | -                    | empty: no contract was touched, so no obligation changed realizability | -                    |
| 3     | skipped   | -                    | 2026-09-18T14:58:00Z | empty: answered by AC-0017-0027 and BR-0017-0057, written earlier this run | -                    |

Phase 2 put every decision authoritative evidence did not answer to the user before any
author wrote, and each came back answered. A decision the user settles is an input to the
write, so the row reads `run` and no gate is left unrun.

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance             | Task title                                            | Input (refs)                          | Output (refs)                                     | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | -------------------------- | ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------- | ---------------------------- |
| 1    | orchestrator         | sdd-20260918-orchestrator  | Stage 1 Triage, classified and persisted               | REQ-0011                              | `09_delta.md` § Triage                            | PASS                         |
| 2    | orchestrator         | sdd-20260918-orchestrator  | grilling(2/user): the two slice names are `pr-fix` and `pr-merge` | REQ-0011 | `01_Spec.md`, `04_Business-Rules.md`, both matrices | PASS |
| 3    | orchestrator         | sdd-20260918-orchestrator  | grilling(2/user): AC-0017-0027 states a present-tense invariant rather than a one-time transition | AC-0017-0027 | `03_Acceptance-Criteria.md` | PASS |
| 4    | orchestrator         | sdd-20260918-orchestrator  | grilling(2/user): the count is restated rather than replaced by a phrase | BR-0017-0057 | `04_Business-Rules.md` | PASS |
| 5    | requirements-analyst | sdd-20260918-req-analyst-1 | Draft REQ-0011 and AC-0017-0027                        | Triage row, user adjudications        | `01_Spec.md`, `03_Acceptance-Criteria.md`         | PASS                         |
| 6    | solution-architect   | sdd-20260918-sol-arch-1    | Draft BR-0017-0057                                     | Triage row, AC-0017-0027              | `04_Business-Rules.md`                            | PASS                         |
| 7    | test-design-analyst  | sdd-20260918-test-design-1 | Draft EX-0017-0057, TC-0017-0062 and the TDD-0062 reset | Triage row, AC-0017-0027              | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md` | PASS                  |
| 8    | delivery-planner     | sdd-20260918-planner-1     | Phase 3 Plan finalize                                  | AC-0017-0027, BR-0017-0057            | `10_Plan.md`                                      | PASS                         |
| 9    | architecture-reviewer | sdd-20260918-arch-review-1 | Reviewer gate over the structural change              | every artifact above                  | REVISE: a release lane stopped covering the two files, and four pinned literals were short | REVISE |
| 10   | completion-reviewer  | sdd-20260918-completion-1  | Reviewer gate over the completion contract             | every artifact above, this file       | REVISE: the grilling row was misclassified and the settled count had no rows behind it | REVISE |

## Gaps / Open risks

- Two kinds of record name the old path, and they are treated differently on purpose.
  `07_Decisions.md` is a living section of this spec pack, which this cycle edits anyway, so its
  two paths are repointed: the file identity is unchanged and no number moved.
  `.qfai/decisions/CR-20260820-0004-*.md` is left alone — it is the record a reviewer reads to
  confirm what was approved, and editing it after approval changes the artifact that proves the
  approval. Its paths therefore stand as the paths that were measured.
- The moved file quotes runner output naming its former path. The quote is a verbatim
  observation, so it stands; rewriting it would falsify a measurement.
- `TDD-0062` sits at `todo` with a `Test file` that exists and a `Selector` that resolves
  inside it, which `TDDLIST_STALE_STATUS` reports as a warning. It clears when the row takes
  its own RED under `/qfai-implement`.
- `spec-traceability-rules.md` asks an upstream reset to name its invalidating record in
  `DR-ID`, and a reset driven by an approved Triage row has none to name. The cause is
  recorded in `Evidence` instead, which is where this ledger already carries a driving
  record. The rule and the ledger template disagree on this case.
- No wall-clock improvement is claimed. Two runs of an unchanged lane on this repository's
  CI measured 322s and 570s, so a single before-and-after pair cannot support one. What the
  change establishes is that the two files stop competing for the same four cores.

## Final status

- Final status: REVISE
- Rationale: both reviewer gates returned REVISE and their findings are being worked. One UPDATE:MODIFY row, carried through every artifact that states the count,
  with `npx qfai validate --profile sdd --fail-on error --spec spec-0017` at error=0.
