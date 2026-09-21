# Evidence: /qfai-sdd (spec-0017)

## Objective

- Spec target: spec-0017
- Objective: replace the documentation-only executed-instance ceiling with a statement of what
  the repository can actually enforce, so that a job which shortens the run's critical path
  without adding work is judged by the requirement rather than refused by the measure.

## Inputs reviewed

- `.qfai/specs/spec-0017/01_Spec.md` (NFR-0001, NFR-0002, REQ-0007)
- `.qfai/specs/spec-0017/03_Acceptance-Criteria.md` (AC-0017-0003, AC-0017-0006)
- `.qfai/specs/spec-0017/04_Business-Rules.md` (BR-0017-0007, BR-0017-0010, BR-0017-0030)
- `.qfai/specs/spec-0017/05_Examples.md` (EX-0017-0007, and the header's one-example-per-rule rule)
- `.qfai/specs/spec-0017/06_Test-Cases.md` (TC-0017-0006, TC-0017-0007)
- `.qfai/specs/spec-0017/08_Open-questions.md` (OQ-0017-0002)
- `.qfai/specs/spec-0017/tdd/test-list.md` (TDD-0006)
- `.qfai/specs/_policies/07_Constraints.md` (OC-73)
- `.github/workflows/ci.yml` — the job set, the conditions and the declared `timeout-minutes`
- `.github/required-status-contexts.json` — `dependencies`, `dependencyConditions`, the note
- `scripts/check-workflow-hygiene.mjs` — property 2c, and which fields it does not read
- `scripts/run-lint-checks.sh` — the five lanes and their grouping
- `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts` — the set equality this replaces

## Preflight summary path

- Preflight run id 20260919090302234: ready, source `discussion-pack`, seven imported
  requirements, no blockers. Re-run after Triage, so it reflects the approved intake.
- Written as the run id and its outcome rather than as a path, because the report tree is not
  committed and a path into it names provenance a reader cannot open.

## Triage decisions

| Source   | Subject                                                                                     | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0007 | The documentation-only path is pinned and re-pinned rather than held to a count of four job names | UPDATE    | MODIFY | -           | NFR-0002 names the baseline the measure serves, and the four names were a value derived from the tree as it then stood. A lane measured at 250.1 s under contention and 111.7 s on a runner of its own needs that runner and must stay unconditional. |
| REQ-0007 | The refusing side of the restated measure                                                   | UPDATE    | APPEND | -           | One test case, citing the example the rule already has. The pack states one example per rule and gives the reason, so the negative reaches the chain through the rule rather than through a criterion or an example of its own.                       |
| REQ-0007 | The selection exemption is scoped to the lane rather than to the job that hosts it | UPDATE | MODIFY | - | BR-0017-0011 named one lane and enumerated four guards, while that lane also carries the agent-integration mirror guards. The pin rule does not close the gap: it requires the executing set to match the declaration, which a lane given a job of its own, a condition and a `dependencyConditions` entry satisfies with the guard skipped. |
| REQ-0007 | The documentation-only floor OC-73 restates is corrected to the new measure                 | UPDATE    | MODIFY | -           | Cross-spec, so the row is persisted in `_policies/10_delta.md`. OC-73's Impact stated the floor as a count of executed instances, which is no longer the measure.                                                                                    |

## Open questions

- OQ-0017-0002 stays `deferred`, owner user, due 2026-11-30. Its Notes are corrected to the new
  floor and the new measure; the question itself is untouched.

## Decisions made

- The measure is restated rather than deleted or raised from four to five — adjudicated by the
  user, who was given all three. Deleting it leaves nothing to stop every job becoming
  unconditional; raising it leaves a proxy that argues again at the next split.
- The unit is runner-minutes, read as the sum of declared `timeout-minutes` over the jobs a
  documentation-only run executes. Adopted from the griller's recommendation. Job instances was
  refused because it charges +1 for a change that cuts the critical path and adds no work, and
  frozen-lockfile installs is numerically identical to instances.
- **The rule states a re-pin obligation, not a bound — adjudicated by the user.** A
  `MUST NOT cost more than the pinned ceiling` clause cannot fail: enforcement is equality
  against a value recomputed from the same tree, so once the pinner has run, no state of the tree
  violates it. The rule now requires the executing set and its declared timeout sum to be pinned,
  and a change to either to re-pin in the same change with BR-0017-0030's numbers.
- The number is a pin recomputed from the workflow tree, never a literal in the rule. Adopted
  from the griller's recommendation over a recorded dissent, which DR-0017-0015 carries.
- The membership claim is scoped to the jobs the aggregate verdict depends on, not to every job
  that executes. The verdict carries `if: always()` and is not one of its own `dependencies`, so
  the two sets differ — four jobs against three on today's tree — and a flat equality would be
  false on the tree it describes.
- NFR-0002 keeps instance count and its documentation-only figure moves to five. Its other two
  clauses are quantified in instances, installs and builds, so a minutes figure in one clause
  would be the only one in a unit no other clause uses.
- Every statement the fifth unconditional job makes false is corrected here — adjudicated by the
  user. NFR-0002's clause, REQ-0007's prose, OQ-0017-0002's Notes, AC-0017-0006 and OC-73 each
  stated a count, and a spec that says two exempt lanes in one place and three in another is
  broken whichever number is right.
- The hygiene-lane refusal stays in BR-0017-0007 and gets no acceptance criterion of its own.
  `04_Business-Rules.md` § Granularity folds a rule's planted-violation form into the same rule,
  so a `Then` clause carrying its own premise was a second scenario inside the first.
- The selection exemption is scoped to the lane rather than to the job hosting it, and
  BR-0017-0011 carries it, with DR-0017-0016 recording the decision. An earlier draft deleted the acceptance clause on the ground that
  BR-0017-0007's membership claim already covered it; that was wrong. BR-0017-0007 requires the
  executing set to match the declaration, which a lane given a job of its own, a condition and a
  `dependencyConditions` entry satisfies with the guard skipped. BR-0017-0011 now covers every
  lane of the lint aggregate whichever job hosts it, names the mirror guards among what those
  lanes carry, and forbids that pair. Deferring the obligation instead was refused because it
  would have removed statements the user approved in this cycle, which is theirs to decide.
- The negative goes in the example the rule already has, not a second one. The pack states one
  example per rule and gives the reason — a second would split an oracle the rule keeps together.

## Work performed

- `.qfai/specs/spec-0017/03_Acceptance-Criteria.md` — AC-0017-0003 restated, its two-subject
  clause removed; AC-0017-0006 restated as the exemption rule rather than a count, with its Given
  matching the widened rule and a clause for the third exempt lane
- `.qfai/specs/spec-0017/04_Business-Rules.md` — BR-0017-0007's Rule, title and Notes, including
  the sentence that keeps the two job sets apart; BR-0017-0010's Notes; BR-0017-0011's title,
  Rule, Notes and NFR-Refs, scoping the exemption to the lane and forbidding the pair that would
  satisfy BR-0017-0007 with the guard skipped
- `.qfai/specs/spec-0017/01_Spec.md` — NFR-0002's documentation-only clause; REQ-0007's prose
- `.qfai/specs/spec-0017/05_Examples.md` — EX-0017-0007 and EX-0017-0011, each now carrying both
  outcomes of its rule
- `.qfai/specs/spec-0017/06_Test-Cases.md` — TC-0017-0006 and TC-0017-0012 restated,
  TC-0017-0084 and TC-0017-0085 added for the two refusing sides, and five drifted Coverage
  summary figures, each derived from the tree
- `.qfai/specs/spec-0017/07_Decisions.md` — DR-0017-0015 and DR-0017-0016
- `.qfai/specs/spec-0017/08_Open-questions.md` — OQ-0017-0002's Notes
- `.qfai/specs/spec-0017/09_delta.md` — four Triage rows
- `.qfai/specs/spec-0017/10_Plan.md` — the risk-table signal, three stale figures, one
  test-approach bullet, and steps 10 and 11
- `.qfai/specs/spec-0017/tdd/test-list.md` — TDD-0006 reset to `todo` with DR-0017-0015 and its
  prior evidence kept; TDD-0093 and TDD-0094 seeded at `todo` for the two new cases
- `.qfai/specs/_policies/07_Constraints.md` — OC-73's Impact
- `.qfai/specs/_policies/10_delta.md` — the cross-spec Triage section
- `CHANGELOG.md` — the entry for this change

Every test case this cycle changed, with the ledger row that carries it. The ledger's
upstream-reset rule returns a row to `todo` when its test case's obligation changes,
and it fired four times here. Listed because the omission is invisible from the
artifact that changed: a row disagrees with its test case only when the two are read
together.

| Test case | What changed | Ledger row | Status | DR-ID |
| ------------ | ---------------- | ---------- | ------ | ---------------------- |
| TC-0017-0006 | Title and oracle | TDD-0006   | todo   | DR-0017-0015           |
| TC-0017-0012 | Title and oracle | TDD-0012   | todo   | DR-0017-0016           |
| TC-0017-0084 | new              | TDD-0093   | todo   | -                      |
| TC-0017-0085 | new              | TDD-0094   | todo   | -                      |

No changed test case lacks a row, and no row for a changed test case is above `todo`.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --format github
```

## Validate evidence paths

- Validate run id 20260919104520672, scope `--profile sdd --spec spec-0017`: error=0,
  warning=24, info=4. Every warning predates this change: thirteen `W-WORKLOG-BROKEN-LINK` and
  one `W-WORKLOG-SCHEMA` on the work-log surface, nine `QFAI-TRIAGE-010` on `_policies` rows no
  ledger carries, and one `QFAI-DCON-034` for the unreplaced sample brand, which a spec declaring
  no surface does not engage.
- Run ids and outcomes rather than paths, for the reason the preflight section gives.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                                                                      | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ----------------------------------------------------------------------------- | -------------------- |
| 0     | skipped | -                    | -                    | empty: the Triage rows name no contract, and this phase wrote nothing         | -                    |
| 1     | skipped | -                    | 2026-09-19T00:29:54Z | empty: answered by the Phase 2 unit decision, which fixes what OC-73 restates | -                    |
| 2     | run     | 2026-09-19T00:13:00Z | 2026-09-19T00:24:18Z | 5 settled, 1 escalated and answered                                           | #work-orders-summary |
| 2c    | skipped | -                    | -                    | empty: no contract was touched, so no obligation changed realizability        | -                    |
| 3     | skipped | -                    | 2026-09-19T00:27:19Z | empty: answered by the Phase 2 scope decision, which named `10_Plan.md`       | -                    |

- Batch record: none

The Phase 2 row reads `run` rather than `escalated` because the one critical decision it raised
was put to the user and answered before any author wrote. `Ended at` is the session's own close,
derived from its measured duration; every write above is later than it. A second critical
decision arrived later, from the reviewer gate rather than from the session, and is recorded in
the work orders below.

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance             | Task title                                                                                      | Input (refs)                             | Output (refs)                                                                           | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | orchestrator         | sdd-20260919-orchestrator  | Stage 0 preflight, then Stage 1 Triage classified and persisted                                 | REQ-0007                                 | `09_delta.md` § Triage, `_policies/10_delta.md` § Triage                                 | PASS                         |
| 2    | orchestrator         | sdd-20260919-griller-1     | grilling(2/agents): the unit is runner-minutes read as declared `timeout-minutes`               | NFR-0002, BR-0017-0030, the measurements | BR-0017-0007, EX-0017-0007, TC-0017-0006                                                | PASS                         |
| 3    | orchestrator         | sdd-20260919-griller-1     | grilling(2/agents): the number is a recomputed pin, not a literal in the rule                   | BR-0017-0030                             | BR-0017-0007, DR-0017-0015                                                              | PASS                         |
| 4    | orchestrator         | sdd-20260919-griller-1     | grilling(2/agents): two claims replace the set equality                                         | the existing set-equality assertion      | BR-0017-0007, TC-0017-0006                                                              | PASS                         |
| 5    | orchestrator         | sdd-20260919-griller-1     | grilling(2/agents): the static oracle is sufficient, the measured half is BR-0017-0030          | NFR-0001, BR-0017-0030                   | TC-0017-0006                                                                            | PASS                         |
| 6    | orchestrator         | sdd-20260919-griller-1     | grilling(2/user): the rewording covers every statement the fifth job makes false                | NFR-0002, REQ-0007, OQ-0017-0002         | `01_Spec.md`, `08_Open-questions.md`, AC-0017-0006, OC-73                                | PASS                         |
| 7    | requirements-analyst | sdd-20260919-req-analyst-1 | Draft AC-0017-0003, AC-0017-0006, BR-0017-0007, BR-0017-0010, NFR-0002, REQ-0007, OC-73         | Triage rows, the adopted decisions       | `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `01_Spec.md`, `08_Open-questions.md`, `_policies/**` | PASS        |
| 8    | test-design-analyst  | sdd-20260919-test-design-1 | Draft EX-0017-0007, TC-0017-0006, the TDD-0006 reset and the Coverage summary figures           | Triage row, the adopted decisions        | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                 | PASS                         |
| 9    | solution-architect   | sdd-20260919-sol-arch-1    | Author DR-0017-0015 and finalize the Plan                                                        | the adopted decisions, the measurements  | `07_Decisions.md`, `10_Plan.md`                                                          | PASS                         |
| 10   | completion-reviewer  | sdd-20260919-completion-1  | Reviewer gate over the completion contract                                                       | every artifact above, this file           | REVISE: five blocking findings, one of them an oracle a conforming tree falsifies        | REVISE                       |
| 11   | orchestrator         | sdd-20260919-orchestrator  | grilling(rework/user): the rule states a re-pin obligation, not a bound                          | the reviewer's F4                        | BR-0017-0007, AC-0017-0003, DR-0017-0015                                                | PASS                         |
| 12   | requirements-analyst | sdd-20260919-req-analyst-1 | Rework F1, F3, F4 and F5 across the criteria, the rules and the spec                            | the reviewer's findings                  | `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `08_Open-questions.md`              | PASS                         |
| 13   | test-design-analyst  | sdd-20260919-test-design-1 | Rework F1 and F2: the example, TC-0017-0006, TC-0017-0084, TDD-0093 and the figures             | the reviewer's findings                  | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                 | PASS                         |
| 14   | solution-architect   | sdd-20260919-sol-arch-1    | Rework F1, F6 and F7, and re-read both Plan steps against the restated rule                     | the reviewer's findings                  | `07_Decisions.md`, `10_Plan.md`                                                          | PASS                         |
| 15   | completion-reviewer  | sdd-20260919-completion-2  | Reviewer gate over the rework                                                                    | every artifact above, this file           | REVISE: the changelog stated the refused design, and the mirror-lane obligation had no carrier | REVISE |
| 16   | orchestrator         | sdd-20260919-orchestrator  | Rewrite the changelog entry, the Triage subject and the mirror-lane decision record              | the reviewer's R1 and R3                  | `CHANGELOG.md`, `09_delta.md`, this file                                                    | PASS                         |
| 17   | requirements-analyst | sdd-20260919-req-analyst-1 | Scope the exemption to the lane in BR-0017-0011, and restore the criterion's third clause        | the reviewer's R2                         | `04_Business-Rules.md`, `03_Acceptance-Criteria.md`                                          | PASS                         |
| 18   | test-design-analyst  | sdd-20260919-test-design-1 | Widen EX-0017-0011 and TC-0017-0012, add TC-0017-0085 and TDD-0094, re-derive the figures        | the reviewer's R2                         | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                    | PASS                         |
| 19   | solution-architect   | sdd-20260919-sol-arch-1    | Cite the rule from Plan step 11, and sweep both records for the removed wording                  | the reviewer's R4                         | `10_Plan.md`, `07_Decisions.md`                                                             | PASS                         |
| 20   | completion-reviewer  | sdd-20260919-completion-3  | Reviewer gate over the second rework                                                             | every artifact above, this file            | REVISE: a reworded test case left its ledger row above `todo`, so nothing scheduled the widened obligation | REVISE |
| 21   | test-design-analyst  | sdd-20260919-test-design-1 | Reset TDD-0012 under the upstream rule, and scope the seeding notes to the change they record    | the reviewer's B1 and R5                   | `tdd/test-list.md`                                                                       | PASS                         |
| 22   | solution-architect   | sdd-20260919-sol-arch-1    | Author DR-0017-0016 for the lane scope, which no existing record decided                         | TDD-0012's reset, BR-0017-0011             | `07_Decisions.md`                                                                        | PASS                         |
| 23   | orchestrator         | sdd-20260919-orchestrator  | Record every changed test case beside its ledger row's status                                     | the reviewer's residual risk               | this file                                                                               | PASS                         |
| 24   | completion-reviewer  | sdd-20260919-completion-4  | Reviewer gate over the third rework                                                              | every artifact above, this file             | REVISE: a reset clause in the ledger still stated the refused design, in the cell the implementer reads | REVISE |
| 25   | orchestrator         | sdd-20260919-orchestrator  | Sweep every changed file for the refused wording, rather than delegating it per owner             | the reviewer's B2                           | one real hit found, in `tdd/test-list.md`                                                | PASS                         |
| 26   | test-design-analyst  | sdd-20260919-test-design-1 | State the re-pin obligation in TDD-0006's reset clause                                            | BR-0017-0007, DR-0017-0015 weakness 4       | `tdd/test-list.md`                                                                       | PASS                         |
| 27   | completion-reviewer  | sdd-20260919-completion-5  | Reviewer gate over the fourth rework                                                              | every artifact above, this file              | PASS: no further instance of the refused design; the membership scope and the ledger re-derived | PASS |

## Gaps / Open risks

- The declared sum for today's unconditional set is 35 minutes, against NFR-0001's three-minute
  bound for this path. The pin is roughly twelve times looser than the reality it prices; it
  catches a runaway job and a forgotten raise, which is the class a declared value can catch.
- `timeout-minutes` is integer-only and each half of a split needs its own margin, so extracting
  the lane will raise the pinned sum even though the measured critical path falls. BR-0017-0030
  judges the measured figures.
- A timeout raised for an unrelated safety reason trips the lane, which forces the raiser to
  re-price this path deliberately.
- The measure enforces equality against a value recomputed from the same tree, so it refuses a
  change that was not re-pinned rather than a cost. That is why the rule states a re-pin
  obligation and no bound beside it. The dissent that named this is recorded in DR-0017-0015.
- BR-0017-0011 forbids a moved lane acquiring a condition or a `dependencyConditions` entry, and
  TC-0017-0085 is the case for that pair. Without it the sentence would assert something no tree
  could fail, which is the defect the review caught twice before.
- Every lane later moved into a job of its own owes a `dependencyConditionsNote` entry, and no
  lane parses that note, so the entry is held by review. DR-0017-0016 records that as an accepted
  cost of the lane scope.
- BR-0017-0007 requires the declaration's note to name each unconditional job with the reason it
  cannot be skipped, and nothing parses that note: no file under `scripts/`, `packages/qfai/src`
  or `packages/qfai/tests` reads `dependencyConditionsNote`. The set equality beside it is
  checked by the hygiene lane's property 2c; the reason text is held by review, as this
  repository holds several obligations.
- `.github/required-status-contexts.json`'s note names three unconditional jobs. A fifth job owes
  a fourth entry and its reason there, which is Plan step 11's obligation.
- NFR-0002's code-path figure names at most 12 instances and the tree runs 25. Left alone:
  correcting it is a cost claim, so BR-0017-0030 wants measured numbers behind it.
- `06_Test-Cases.md`'s Coverage summary carried five figures that had drifted by one row. All are
  derived from the tree now. Nothing reads that section, and spec-0017 is the only pack with one.
- `05_Examples.md` states one example per rule and gives the reason: a second would split a
  planted-violation form from its positive. EX-0017-0067 is not that shape — it is a second
  positive obligation of BR-0017-0053, which the header's clause does not reach and does not
  admit either. Either the header gains a clause for a rule carrying two independent positive
  obligations, or such a rule is a granularity defect and BR-0017-0053 is split. Pre-existing,
  and outside this change.
- A sweep for wording a decision removed is one pass over every file the cycle touched, run by
  whoever holds the finding. Delegated per owner it missed the ledger, which no author's sweep
  covered, and the surviving clause sat in the cell `/qfai-implement` reads when it selects a row.
- No wall-clock improvement is claimed here. The projected figures belong to Plan step 11, which
  owes captured before-and-after numbers under BR-0017-0030.

## Final status

- Final status: PASS
- Rationale: the routed blocking reviewer returned PASS on the fifth pass, with the membership
  scope, the four ledger rows and every Coverage figure re-derived from the tree rather than read
  from a report. Four gates returned REVISE before it, and each finding has its own rework row.
  Validate is at error=0 with 24 warnings, all of which predate this change.
