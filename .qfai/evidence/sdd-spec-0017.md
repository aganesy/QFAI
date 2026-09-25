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

## Capability split and coverage-density observations

The capability split check derives expected spec names from list position. With
`N` capabilities it expects the contiguous set `spec-0001` through
`spec-000N`; it does not use a capability's declared number. A permanent
reserved gap therefore becomes unsatisfiable when the count reaches it.
`spec-0017` was a trailing reservation. Adding the seventeenth capability
either used that reserved name or produced both `QFAI-SPLIT-103` (missing)
and `QFAI-SPLIT-104` (extra). The slice policy makes reservations temporary:
renumber a gap when the count reaches it. `OQ-0023` records the possible
number-based check.

An escalation made during the 2026-08-05 review claimed that
`paths.testsDir` pointed to a missing repository-root `tests/` directory
and that satisfying the ATDD gate required a user decision and a new root
directory. That claim was false. The directory was tracked and held two
Markdown annotation ledgers with 200 and 486 `QFAI:` annotations. The
scanner's default glob included Markdown, and `spec-0001` cleared both ATDD
gates from that directory. Remaining `QFAI-ATDD-111` and `-112` findings
were annotation work for the ATDD and implementation stages. No SDD-stage
user decision was outstanding on this point.

`QFAI-COV-207` listed artifacts covered exactly once. The review gave each
signal a disposition:

| Signal | Disposition |
| ------ | ----------- |
| `spec-0017`: 66 business rules with one example each | Accepted. The rule-to-example mapping was intentionally one-to-one and index-aligned, as `05_Examples.md` and `09_delta.md` state. |
| `spec-0017`: 50 examples with one test case each | Accepted. All 34 acceptance criteria had multiple test cases covering normal and error or boundary behaviour. The 16 examples with multiple cases owned distinct falsifying oracles. |
| `spec-0003`: 21 acceptance criteria with one test case each | Pre-existing and outside the eight requirements absorbed in this change. All 12 criteria added by this change had at least two cases. |

No density warning was accepted without review, and none required a new case.

## Final status

- Final status: PASS
- Rationale: the routed blocking reviewer returned PASS on the fifth pass, with the membership
  scope, the four ledger rows and every Coverage figure re-derived from the tree rather than read
  from a report. Four gates returned REVISE before it, and each finding has its own rework row.
  Validate is at error=0 with 24 warnings, all of which predate this change.

---

# Run: CR-20260924-0004 (2026-09-25)

## Objective

- Spec target: spec-0017
- Objective: separate the unchanged local release command order from the changed release
  workflow rule, retain both implementation bindings, and require evidence when an active
  binding's implementation did not change.

## Inputs reviewed

- `.qfai/decisions/CR-20260924-0004-scope-traceability-drift.md` — user-approved option 3.
- `03_Acceptance-Criteria.md` (AC-0017-0036), `04_Business-Rules.md` (BR-0017-0069/0070),
  `05_Examples.md` (EX-0017-0070/0071), and `06_Test-Cases.md` (TC-0017-0090/0093).
- `09_delta.md`, `10_Plan.md`, `16_Traceability-ledger.md`, and `tdd/test-list.md`.
- Repository-root `package.json`, `.github/workflows/release.yml`, and the shipped
  `qfai-sdd` traceability reference and ledger template.

## Preflight summary path

- Preflight run id 20260925042105682: ready, source `discussion-pack`, seven
  imported requirements, no pack gaps or carried questions. The selected pack
  is `discussion-20260418170937652`.

## Triage decisions

| Source           | Subject                                                                       | Operation | Sub-op | Approved By    | Rationale                                                                                     |
| ---------------- | ----------------------------------------------------------------------------- | --------- | ------ | -------------- | --------------------------------------------------------------------------------------------- |
| CR-20260924-0004 | Separate the local release command vector from workflow capability            | UPDATE    | MODIFY | user@2026-09-25 | BR-0017-0070, EX-0017-0071, and TC-0017-0093 carry the unchanged local order.                |
| CR-20260924-0004 | Reconcile active bindings with each changed acceptance criterion and rule     | UPDATE    | MODIFY | user@2026-09-25 | AC-0017-0036 and BR-0017-0070 retain `package.json` with distinct TDD-0107 proof.            |

## Open questions

- none for the approved requirement; the remaining validation gates are listed below.

## Decisions made

- The user approved CR-20260924-0004 option 3. The existing local command order remains
  bound to `package.json`; the release workflow capability remains bound to
  `.github/workflows/release.yml`.
- The Phase 2 griller recommended five agent-adopted decisions. Its user escalation count
  was zero. The exact session end time was not recorded; the ordering of grilling and first
  authoring write cannot be demonstrated from a timestamp.
- BR-0017-0070, EX-0017-0071, and TC-0017-0093 give the local command vector a separate
  oracle and move TDD-0107's references. The architecture position was to reuse the vector
  portion of TC-0017-0090; test design and the griller favored the separate case because
  the example index is one-to-one and TDD-0107 already has an independent boundary.
- Changed or new obligations need complete, unambiguous active bindings, while explicit
  planned bindings remain separate. More than one distinct active implementation is valid.
  No dissent was recorded for this decision.
- Proof for an unchanged implementation joins a TDD ID to its selector, test file,
  current hash, and execution result. The validator checks static consistency; CI and
  ATDD supply runtime PASS evidence. Architecture emphasized CI execution and test design
  requested committed PASS evidence; the recommendation combines both.
- An unavailable comparison diff rejects an adopted ledger in TDD or full validation.
  SDD validation does not decide implementation diffs. No dissent was recorded.
- A spec without an adopted ledger retains the existing `QFAI-TRACE-002` optional
  warning. No dissent was recorded; this avoids changing unrelated repositories.
- The later Phase 3 session P3-S1 adopted three Plan recommendations without
  dissent from backend, spec author, or orchestrator: list the shipped contract
  and actual consumers, retain the existing under-three-consumer helper exception
  because it reuses authoritative checks, and state a short dependency order of
  spec, validator, tests/evidence, then gates.

## Work performed

- `03_Acceptance-Criteria.md` was reviewed unchanged: AC-0017-0036 already contains the
  local command-order assertion.
- `04_Business-Rules.md`, `05_Examples.md`, and `06_Test-Cases.md` separate the local
  command vector into BR-0017-0070, EX-0017-0071, and TC-0017-0093.
- `09_delta.md` records both approved triage rows; `10_Plan.md` identifies both active
  bindings and now lists the shipped traceability contract, validator consumers,
  helper exception, and dependency order; `16_Traceability-ledger.md` and
  `tdd/test-list.md` record the new rule, case, and TDD-0107 relationship.
- The shipped `qfai-sdd` guidance and ledger template, traceability validator, and
  focused tests are being updated under separate work orders.

## Contract executability

- none

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs sdd preflight
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --spec spec-0017 --fail-on error
```

- Preflight exited 0. Full SDD validation exited 1; scoped spec-0017 SDD
  validation exited 0.

## Validate evidence paths

- Validate run id 20260925042310988, scope `--profile sdd`: exit 1, error=11,
  warning=87, info=5. All 11 errors are existing `QFAI-TDDLIST-017` findings:
  two in spec-0006, one in spec-0010, and eight in spec-0012. No error is
  attributed to this spec-0017 change. The full SDD profile did not pass.
- Validate run id 20260925042621402, scope `--profile sdd --spec spec-0017`:
  exit 0, error=0, warning=25, info=4. The scoped SDD validation passed.
- An earlier `--profile tdd --fail-on error` run reported two `QFAI-TRACE-001`
  findings against old proof hashes. TDD-0107 Round 2 now has an independent
  live-mutation QA PASS; TDD validation still needs a new run.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier                       | Evidence             |
| ----- | ------- | -------- | -------- | ------------------------------ | -------------------- |
| 2     | run     | -        | -        | 5 settled, 0 escalated; time unrecorded | #work-orders-summary |
| 3     | run     | 2026-09-24T19:35:44Z | 2026-09-24T19:36:45.776Z | 3 settled, 0 escalated | #work-orders-summary |

- Batch record: none
- Two rounds ran before the draft. The session key and end time were not recorded;
  no timestamp is inferred. Phase 3 session P3-S1 ran one round from
  2026-09-24T19:32:10Z through 2026-09-24T19:35:44Z, before its Plan write.
  Phase 0, 1, and 2c have no recorded session or skip result for this cycle;
  their disposition is pending rather than inferred.

## Work Orders Summary

| Step | Role (sub-agent)    | Agent instance             | Task title                                                                                | Input (refs)                         | Output (refs)                                    | Status (PASS/REVISE/PENDING) |
| ---- | ------------------- | -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------ | ---------------------------- |
| 1    | discovery-analyst   | /root/cr0004_grill         | grilling(2/agents): give the local vector its own BR, EX, TC, and TDD-0107 reference      | CR-20260924-0004, existing examples  | BR-0017-0070, EX-0017-0071, TC-0017-0093; one-to-one examples and independent boundary; architecture favored TC-0017-0090's vector portion | PASS                         |
| 2    | discovery-analyst   | /root/cr0004_grill         | grilling(2/agents): require complete active or explicit planned bindings                 | approved CR, active ledger           | `16_Traceability-ledger.md`; fail closed while preserving planned rows; no dissent recorded | PASS                         |
| 3    | discovery-analyst   | /root/cr0004_grill         | grilling(2/agents): join unchanged-implementation proof to current test and run          | TDD-0107, unchanged `package.json`   | `16_Traceability-ledger.md`; prose PASS is insufficient; architecture emphasized CI execution, test design also sought committed PASS evidence | PASS                         |
| 4    | discovery-analyst   | /root/cr0004_grill         | grilling(2/agents): reject unavailable diffs in adopted TDD and full validation          | approved CR, diff boundary           | traceability validation contract; prevents silent success; no dissent recorded | PASS                         |
| 5    | discovery-analyst   | /root/cr0004_grill         | grilling(2/agents): retain optional warning for specs without adopted ledgers            | `QFAI-TRACE-002` behavior            | traceability validation contract; avoids unrelated migration; no dissent recorded | PASS                         |
| 6    | requirements-analyst | /root/cr0004_spec          | Re-derive spec, triage, Plan, and ledger                                                   | CR-20260924-0004, grilling outcomes  | `04`/`05`/`06`/`09`/`10`/`16`, `tdd/test-list.md` | PASS                         |
| 7    | solution-architect | /root/cr0004_architecture  | Update shipped traceability guidance and validator contract                              | CR-20260924-0004, spec bindings      | shipped `qfai-sdd` guidance and template         | PASS                         |
| 8    | test-design-analyst | /root/cr0004_test_design   | Check current TDD-0107 proof and test mapping                                             | TC-0017-0093, TDD-0107               | separate test-design recommendation              | PASS                         |
| 9    | acceptance-test-engineer | /root/cr0004_evidence | Execute TDD-0107 Round 2 mutation and restored GREEN                                     | TC-0017-0093, ordered vector         | `atdd-spec-0017.md#tdd-0107`                    | PASS                         |
| 10   | qa-gatekeeper       | /root/cr0004_proof_qa      | Independently check Round 2 live mutation and restoration                                | Round 2 test and hashes              | independent live-mutation QA PASS                | PASS                         |
| 11   | doc-steward         | /root/cr0004_record        | Record this SDD cycle and its uncompleted gates                                           | approved CR, author work, gate state | this run                                         | PASS                         |
| 12   | orchestrator        | /root                      | Run SDD preflight                                                                        | current spec and discussion pack     | run id 20260925042105682: ready, no pack gaps    | PASS                         |
| 13   | orchestrator        | /root                      | Run SDD validate                                                                         | current spec and shipped validator   | run id 20260925042310988: 11 errors             | REVISE                       |
| 14   | orchestrator        | /root                      | Run scoped SDD validation                                                                | spec-0017                             | run id 20260925042621402: error=0              | PASS                         |
| 15   | orchestrator        | /root                      | Integrate the Plan gate                                                                   | updated `10_Plan.md`                 | independent reviewer PASS: source paths, consumers, helper exception, dependency order | PASS                         |
| 16   | completion-reviewer | /root/cr0004_record/sdd_evidence_review | Independently review the cycle and this evidence                      | spec, tests, this run                 | REVISE: incomplete phase trace and Plan gate; griller reasons since amended | REVISE                       |
| 17   | orchestrator        | /root                      | Establish Phase 0, 1, and 2c grilling outcomes or skip grounds                            | approved CR, phase frontiers         | disposition and timing pending                  | PENDING                      |
| 18   | discovery-analyst   | /root/cr0004_grill         | grilling(3/agents): list shipped traceability sources and consumers in the Plan           | changed contract, source paths       | P3-S1: design and distribution visible; backend, spec author, parent had no dissent | PASS                         |
| 19   | discovery-analyst   | /root/cr0004_grill         | grilling(3/agents): retain the under-three-consumer helper exception                      | reused scanner and TDD proof logic   | P3-S1: preserve existing SSOT reuse; backend, spec author, parent had no dissent | PASS                         |
| 20   | discovery-analyst   | /root/cr0004_grill         | grilling(3/agents): state CR0004's short dependency order in the Plan                     | spec, validator, tests, gates        | P3-S1: fixes execution order without expanding the historical release plan; backend, spec author, parent had no dissent | PASS                         |
| 21   | requirements-analyst | /root/cr0004_spec          | Rework Plan after P3-S1                                                                    | three Phase 3 adopted decisions      | `10_Plan.md`: saved 19:36:45.776Z; Prettier, Markdownlint, diff check PASS | PASS                         |
| 22   | completion-reviewer | /root/cr0004_record/sdd_evidence_review | Re-review the Plan and evidence after P3-S1                               | current `10_Plan.md` and this run     | Plan PASS; evidence REVISE for Phase 0/1/2c trace and Phase 2 timing | REVISE                       |

## Gaps / Open risks

- Full SDD validation reported 11 existing `QFAI-TDDLIST-017` errors outside
  spec-0017. The spec-0017 scoped run passed with zero errors. The full profile
  did not pass; the dogfood ratchet and a final validation verdict are pending.
- The first TDD validation saw two `QFAI-TRACE-001` findings against old proof hashes.
  TDD-0107's Round 2 live proof and independent QA are recorded in
  `atdd-spec-0017.md`; a validator rerun is still needed.
- The griller's session end time and first-write time were not recorded. The record
  cannot demonstrate their order for Phase 2. Phase 3 ended before its first Plan
  save at 2026-09-24T19:36:45.776Z. Phase 0, 1, and 2c have no verified
  outcome or skip grounds yet.
- The first independent completion review returned REVISE on the phase trace
  and Plan gate. A second independent review passed the corrected Plan and the
  per-decision Work Orders, but retained REVISE for the phase trace. The downstream ATDD
  checkpoint remains open. TDD-0099/0100/0101/0107/0108/0109/0110 remain `todo`.

## Final status

- Final status: REVISE
- Rationale: preflight, scoped SDD validation, and the Plan gate passed. The full
  SDD profile has 11 existing errors, the dogfood ratchet is pending, and the
  independent reviewer retained REVISE for the incomplete grilling trace.

---

# Run: sdd-cr0004-r2-20260924T194342Z

## Objective

- Spec target: spec-0017
- Started: 2026-09-24T19:43:42Z
- Objective: re-derive the approved CR-20260924-0004 in fixed phase order,
  checking whether its current artifacts already satisfy each obligation.
  Leave a phase unchanged when the authoritative artifacts settle it.

## Inputs reviewed

- Approved `CR-20260924-0004-scope-traceability-drift.md` option 3.
- `_policies/03_Capabilities.md` (CAP-0017), `_policies/05_Contracts.md`,
  and spec-0017 `01_Spec.md`, `04_Business-Rules.md`, `09_delta.md`, and
  `10_Plan.md`.
- Shipped `qfai-sdd` SDD skill, pre-draft grilling reference, and evidence
  template for phase order and no-write records.

## Preflight summary path

- Preflight run id 20260925044527169: ready, source `discussion-pack`, seven
  imported requirements, no pack gaps or carried questions. Selected pack:
  `discussion-20260418170937652`.

## Triage decisions

| Source           | Subject                                                     | Operation | Sub-op | Approved By    | Rationale                                                  |
| ---------------- | ----------------------------------------------------------- | --------- | ------ | -------------- | ---------------------------------------------------------- |
| CR-20260924-0004 | Separate local release command order from workflow capability | UPDATE    | MODIFY | user@2026-09-25 | Existing `09_delta.md:53` row; no new operation.           |
| CR-20260924-0004 | Reconcile active bindings with changed AC and BR             | UPDATE    | MODIFY | user@2026-09-25 | Existing `09_delta.md:54` row; no new operation.           |

## Open questions

- none in Phase 2 after the formal grilling decision. Phase 2b onward has not
  been evaluated in this rerun.

## Decisions made

- Stage 1 confirmed the two existing approved `UPDATE:MODIFY` rows. Phase 0
  and Phase 1 required no writes.
- Formal Phase 2 session P2-R2-S1 settled the ownership conflict with two
  agent-adopted decisions. Keep `01_Spec.md`'s repository-only ownership boundary
  because `package.json#files` includes distributed `dist/` and `assets/`, and
  spec-0013 owns `/qfai-sdd`. Reclassify the shipped guidance, distributed core
  code, and core tests as companion changes/dependencies in `10_Plan.md`, with
  path, state, use, and owner. The orchestrator and spec author agreed; the
  backend author had not answered by session close and is not counted as agreeing.

## Work performed

- Stage 1 read CAP-0017 and the active spec, confirmed the two CR rows in
  `09_delta.md`, and found no companion traceability clause in the other active
  specs' acceptance criteria or business rules. No Triage write was needed.
- Phase 0 read CR impact (`Schema: none`), `04_Business-Rules.md:35-37` (all
  `Contract-Refs` are `-`), and the `_policies/05_Contracts.md` index. No API,
  DB, or UI contract was changed or newly indexed.
- Phase 1 read CAP-0017 and the shared policies. The approved impact changes
  spec-0017 and shipped guidance/validator, not the policy requirements. No
  outline, policy, or open-question write was needed.
- Phase 2 compared `01_Spec.md:16-19` with `10_Plan.md:8,27-29`, then ran the
  formal session before any source write. It settled the scope without editing
  `01_Spec.md`. The Plan reclassification belongs to Phase 3. Nevertheless,
  `10_Plan.md` was saved at 2026-09-24T19:56:16.749Z, before Phase 2b/2c
  and a fresh Phase 3 pre-write grilling session. This ordering is invalid for
  this run; no later source edit was made after the stop notice.

## Contract executability

- none

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs sdd preflight
```

- Exit 0. No validation command has been executed for this rerun yet.

## Validate evidence paths

- PENDING: no validate run ID, scope, or counts for this rerun. Earlier runs
  belong to the preceding CR-20260924-0004 cycle above.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier                                                            | Evidence |
| ----- | ------- | -------- | -------- | ------------------------------------------------------------------- | -------- |
| 0     | skipped | -        | -        | empty: CR impact `Schema: none` and `04_Business-Rules.md:35-37`    | -        |
| 1     | skipped | -        | -        | empty: CAP-0017 and existing shared policies settle the outline    | -        |
| 2     | run     | 2026-09-24T19:55:06Z | - | 2 settled, 0 escalated; no Phase 2 source write | #work-orders-summary |

- Batch record: none
- Phase 2 session P2-R2-S1 ran one round from 2026-09-24T19:50:49Z through
  2026-09-24T19:55:06Z and ended `adopted` before any Phase 2 source write.
  Phase 2b and 2c were not entered before the Plan write. No fresh Phase 3
  grilling session ran before that write. No Phase 3 run/skip row can truthfully
  certify it, and Phase 4 was not entered.

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance       | Task title                                       | Input (refs)                  | Output (refs)                            | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | -------------------- | ------------------------------------------------ | ----------------------------- | ---------------------------------------- | ---------------------------- |
| 1    | orchestrator         | /root                | Run Stage 0 preflight                            | active discussion pack        | run id 20260925044527169: ready          | PASS                         |
| 2    | requirements-analyst | /root/cr0004_spec    | Re-evaluate Stage 1 and Phases 0 and 1 read-only | approved CR, CAP-0017, policy | no writes; authoritative refs above      | PASS                         |
| 3    | requirements-analyst | /root/cr0004_spec    | Re-evaluate Phase 2 scope                        | `01_Spec.md`, `10_Plan.md`    | conflict settled by P2-R2-S1; no spec edit | PASS                         |
| 4    | orchestrator         | /root                | Resume Phase 2b onward in fixed order            | settled Phase 2 scope         | later phase verdicts pending             | PENDING                      |
| 5    | doc-steward          | /root/cr0004_record  | Record this rerun without inferred phase results | actual preflight and findings | this run                                 | PASS                         |
| 6    | completion-reviewer  | /root/cr0004_record/sdd_evidence_review | Review the completed rerun       | all phase and gate evidence   | reviewer verdict pending                 | PENDING                      |
| 7    | discovery-analyst    | /root/cr0004_grill   | grilling(2/agents): preserve spec-0017's internal ownership boundary | `01_Spec.md`, `package.json#files`, spec-0013 | P2-R2-S1: distributed paths cannot become own-CI outputs; parent/spec author agreed, backend had not answered | PASS |
| 8    | discovery-analyst    | /root/cr0004_grill   | grilling(2/agents): move distributed sources into Plan companion table | `10_Plan.md`, approved CR    | P2-R2-S1: keeps cross-spec work visible without ownership drift; parent/spec author agreed, backend had not answered | PASS |
| 9    | requirements-analyst | /root/cr0004_spec    | Save Plan classification before Phase 2b/2c and Phase 3 grilling | settled P2-R2-S1, `10_Plan.md` | saved 2026-09-24T19:56:16.749Z; phase order violated | REVISE |

## Gaps / Open risks

- Phase 2's ownership decision is settled, but the Plan reclassification was
  saved before Phase 2b/2c and before a fresh Phase 3 pre-write session. The
  invalid order cannot be repaired by recording an inferred timestamp.
- Phase 2b, Phase 2c, Phase 3 grilling, Phase 4, validate, and the independent
  completion review are pending. The earlier cycle's unrecorded Phase 2 time
  remains historical and is not replaced by this rerun.
- The full SDD profile previously reported 11 existing `QFAI-TDDLIST-017`
  errors outside spec-0017; a new full-profile verdict is still owed.

## Final status

- Final status: REVISE
- Rationale: preflight is ready and Phase 2's ownership conflict is settled,
  but a Plan write violated the required phase order and Phase 3 pre-write
  grilling. This run cannot pass.

---

# Run: sdd-cr0004-r3-20260924T195808Z

## Objective

- Spec target: spec-0017
- Started: 2026-09-24T19:58:08Z
- Objective: complete the approved CR-20260924-0004 re-derivation in fixed
  phase order, preserving settled obligations and making only checklist-required
  source corrections.

## Inputs reviewed

- Approved `CR-20260924-0004-scope-traceability-drift.md` option 3 and the
  active discussion pack `discussion-20260418170937652`.
- `_policies/03_Capabilities.md` (CAP-0017), `_policies/05_Contracts.md`,
  spec-0017 `01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`,
  `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `08_Open-questions.md`,
  `09_delta.md`, `10_Plan.md`, `16_Traceability-ledger.md`, and `tdd/test-list.md`.
- Shipped `qfai-sdd` phase checklist, pre-draft grilling reference, and delta
  template, plus the current ATDD evidence and coverage matrix for TDD-0107.

## Preflight summary path

- Preflight run id 20260925045845899: ready, source `discussion-pack`, seven
  imported requirements, no pack gaps or carried questions.

## Triage decisions

| Source           | Subject                                                     | Operation | Sub-op | Approved By    | Rationale                                             |
| ---------------- | ----------------------------------------------------------- | --------- | ------ | -------------- | ----------------------------------------------------- |
| CR-20260924-0004 | Separate local release command order from workflow capability | UPDATE    | MODIFY | user@2026-09-25 | Existing approved `09_delta.md` row retained.        |
| CR-20260924-0004 | Reconcile active bindings with changed AC and BR             | UPDATE    | MODIFY | user@2026-09-25 | Existing approved `09_delta.md` row retained.        |

## Open questions

- none for this bounded CR. The older spec-0017 scope wording about a shipped
  mapping asset predates CR-20260924-0004 and was not changed in this cycle.

## Decisions made

- No new design decision was settled in this invocation. Every entered
  grilling-covered phase had an empty frontier fixed by the approved CR and
  existing normative artifacts. The Phase 3 assessment recorded zero decisions.
- Phase 2b applied the deterministic single-row `Boundary = -` rule to
  TDD-0107. Phase 4 added the required rerun and CR records without adding a
  requirement or changing the approved triage operation.

## Work performed

- Stage 1, 19:59:48.646–19:59:48.995Z: read 17 active specs, CAP-0017,
  approved CR option 3, and the two existing `UPDATE:MODIFY` rows; found no
  companion traceability obligation in other specs' criteria or rules. No write.
- Phase 0, 20:00:07.087–20:00:07.094Z: CR impact says `Schema: none`; all 70
  spec-0017 BR `Contract-Refs` are `-`, AC-0017-0036 has no API/DB/UI contract,
  and `_policies/05_Contracts.md` needs no entry. No write.
- Phase 1, 20:00:21.117–20:00:21.436Z: CAP-0017 and 11 policy files retain
  their existing requirements; no new OQ or policy diff is needed. No write.
- Phase 2, 20:00:48.456–20:00:48.475Z: AC-0017-0036 leads to BR-0017-0069/0070,
  EX-0017-0070/0071, and TC-0017-0090/0093; active ledger bindings and the
  Plan's companion table preserve the approved scope. No write.
- Phase 2b, 20:01:36.218–20:04:23.409Z: confirmed TC-0017-0093 has one
  TDD row and corrected TDD-0107 `Boundary` from `vector` to `-` at
  20:04:23.409Z. Its ID, TC, test file, selector, todo status, CR reference,
  ATDD link, and BR reference stayed the same. The ATDD and coverage records
  do not use the boundary slug; their evidence remains current.
- Phase 2c.1, 20:05:21.183–20:05:21.200Z: reconciled the three affected AC
  and five BR. Formal API/DB/UI contract references, persisted attribute/join
  checks, API-row delta, and scope re-expansions were all zero. No write.
- Phase 3: the author read the Plan at 20:05:56.171–20:05:56.181Z. Assessment
  P3-R3-S1 ran 20:07:30–20:08:15Z with no open decision, lookup, or write.
  The approved CR, spec-0017's internal ownership, spec-0013's `/qfai-sdd`
  ownership, and the Plan's companion nine-path table and dependency order
  settled the frontier. No Plan write occurred during Phase 3. A later
  formatting write after Phase 4 invalidated this run's fixed-order completion.
- Phase 4, 20:10:16.222–20:13:27.175Z: appended DELTA-0002's Change Summary
  and Triage subsection and the canonical Change Requests table. The table
  records CR-20260924-0001/0002 with their applied times and CR-20260924-0004
  with `Applied at = -` until its final gates pass. Existing triage rows and
  historical delta remain intact. Saved at 20:13:27.175Z.

## Contract executability

- none

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs sdd preflight
node packages/qfai/dist/cli/index.mjs validate --profile sdd --spec spec-0017 --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error
node scripts/check-dogfood-backlog.mjs --profile sdd
node scripts/check-dogfood-backlog.mjs --profile tdd
node scripts/check-dogfood-backlog.mjs --profile tdd --pin
node scripts/check-dogfood-backlog.mjs --profile full
node scripts/check-dogfood-backlog.mjs --profile full --pin
pnpm format:check
pnpm format:check && pnpm lint && pnpm check-types
```

- Exit 0. Phase 4's author ran direct Prettier, Markdownlint, and diff checks;
  all passed. The scoped SDD validation also exited 0. Full SDD validation
  exited 1 on the existing backlog.
- Dogfood SDD exited 0 with 11 errors in three files within its pinned backlog.
  TDD and full first exited 1 for improvements relative to their old pins;
  their `--pin` reruns exited 0, updating the baselines to 936 errors in 13
  files and 952 errors in 28 files respectively.
- The first `pnpm format:check` exited 1 on Plan formatting. After Phase 4,
  the orchestrator ran `prettier.cmd --write` on `10_Plan.md`; its recorded
  `LastWriteTimeUtc` is `2026-09-24T20:21:43.6090040Z`. The change was table
  formatting without an intended meaning change. The combined format, lint,
  and type-check command then exited 0. This was a source write outside the
  fixed phase order; the gate result does not repair the phase-order violation.

## Validate evidence paths

- Validate run id 20260925051641751, scope `--profile sdd --spec spec-0017`:
  exit 0, error=0, warning=25, info=4.
- Validate run id 20260925051706918, scope `--profile sdd`: exit 1,
  error=11, warning=88, info=5. The errors are the existing
  `QFAI-TDDLIST-017` backlog outside spec-0017; the full SDD profile did
  not pass. The dogfood ratchet passed after the improvement-only TDD and
  full baselines were repinned.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier                                                                 | Evidence |
| ----- | ------- | -------- | -------- | ------------------------------------------------------------------------ | -------- |
| 0     | skipped | -        | -        | empty: CR impact `Schema: none`, BR Contract-Refs `-`, contract index    | -        |
| 1     | skipped | -        | -        | empty: CAP-0017 and existing `_policies` settle the outline             | -        |
| 2     | skipped | -        | -        | empty: approved CR and current AC/BR/EX/TC/ledger/Plan chain             | -        |
| 2c.1  | skipped | -        | -        | empty: no formal contract refs; CR impact `Schema: none`                 | -        |
| 3     | skipped | -        | -        | empty: approved CR, spec-0017/0013 ownership, current Plan companion table | -      |

- Batch record: none
- Phase 3's read-only frontier assessment P3-R3-S1 ran from
  2026-09-24T20:07:30Z to 20:08:15Z, with zero rounds, decisions, escalations,
  and pending lookups. It did not run a grilling session or author a Plan change
  during Phase 3. A later Plan formatting write occurred after Phase 4; it is
  not a Phase 3 write and this row does not retroactively authorize it. Phase 2b
  and Phase 4 have no pre-draft grilling row by the SDD skill contract.

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance       | Task title                                                    | Input (refs)                   | Output (refs)                            | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | -------------------- | ------------------------------------------------------------- | ------------------------------ | ---------------------------------------- | ---------------------------- |
| 1    | orchestrator         | /root/cr0004_record  | Run Stage 0 preflight                                         | discussion pack                | run id 20260925045845899: ready          | PASS                         |
| 2    | requirements-analyst | /root/cr0004_spec    | Re-derive Stage 1 and Phases 0, 1, and 2 read-only            | approved CR, spec and policies | no writes; phase facts above             | PASS                         |
| 3    | requirements-analyst | /root/cr0004_spec    | Apply Phase 2b singleton Boundary rule                       | TC-0017-0093, TDD-0107         | Boundary `vector` to `-`; identity kept | PASS                         |
| 4    | requirements-analyst | /root/cr0004_spec    | Reconcile Phase 2c.1 obligations read-only                   | affected AC/BR, contract index | no contract refs, delta, or expansion    | PASS                         |
| 5    | discovery-analyst    | /root/cr0004_grill   | Assess Phase 3 Plan frontier                                 | approved CR and current Plan   | P3-R3-S1: empty frontier, no decisions  | PASS                         |
| 6    | requirements-analyst | /root/cr0004_spec    | Finalize Phase 3 Plan without write                          | P3-R3-S1, current Plan         | existing companion table and order      | PASS                         |
| 7    | requirements-analyst | /root/cr0004_spec    | Append Phase 4 rerun and CR reference                        | delta checklist, CR records    | DELTA-0002 and Change Requests table     | PASS                         |
| 8    | -                    | n/a                  | grilling(-@sdd-cr0004-r3-20260924T195808Z/none): none        | -                              | -                                        | PASS                         |
| 9    | doc-steward          | /root/cr0004_record  | Record measured phase outcomes and pending gates             | preflight, authors, griller    | this run                                 | PASS                         |
| 10   | orchestrator         | /root                | Run scoped SDD validation                                    | current spec and validator     | run id 20260925051641751: error=0       | PASS                         |
| 11   | completion-reviewer  | /root/cr0004_record/sdd_evidence_review | Independently review this run         | spec, this evidence, gates     | REVISE: full SDD error-zero and post-Phase-4 Plan write | REVISE                       |
| 12   | completion-reviewer  | /root/cr0004_record/sdd_evidence_review | Interim structural and factual review | current r3 artifacts          | REVISE only for pending gates; no new evidence defect | REVISE                     |
| 13   | orchestrator         | /root                | Run full SDD validation                                      | all specs and current validator | run id 20260925051706918: 11 existing errors | REVISE                 |
| 14   | orchestrator         | /root                | Run SDD, TDD, and full dogfood ratchets                      | pinned error baselines         | SDD within pin; TDD 936/13 and full 952/28 repinned; exit 0 | PASS             |
| 15   | orchestrator         | /root                | Format Plan and run final format, lint, and type gates       | current Plan and repository    | initial format exit 1; post-Phase-4 Plan write; combined gate exit 0 | REVISE       |

## Gaps / Open risks

- A Plan formatting write occurred after Phase 4. Its content was only
  formatting, but the source write violates the fixed phase order. A fresh
  ordered run from the formatted Plan is required.
- Scoped SDD validation passed with zero errors and the dogfood ratchets
  passed with the improvement-only pins. Full SDD validation still has 11
  existing errors outside spec-0017, so the skill's full-profile error-zero
  gate remains unmet. Final independent review returned REVISE for both gaps.
- The older spec-0017 scope wording about the shipped mapping asset was noted
  but predates CR-20260924-0004; this cycle made no decision about it.
- The earlier failed r2 run and its out-of-order Plan write remain recorded
  above. This r3 run also remains REVISE; neither run is retroactively repaired.

## Final status

- Final status: REVISE
- Rationale: preflight, scoped SDD validation, and dogfood ratchets passed.
  Post-Phase-4 Plan formatting violated the fixed phase order, and full SDD
  validation has 11 existing errors. Independent review returned REVISE.

# Run: sdd-cr0004-r4-20260924T202850Z

## Objective

- Re-derive the approved CR-20260924-0004 option 3 in fixed SDD phase order
  from the formatted Plan, retaining r2 and r3 as failed historical runs.
- Scope: spec-0017 release traceability and the approved cross-spec companion
  changes. Do not import unrelated discussion-pack UI research into this CR.

## Inputs reviewed

- CR-20260924-0004, approved option 3; spec-0017 active artifacts and TDD
  ledger; CAP-0017; spec-0013 ownership; shipped qfai-sdd skill and phase
  checklists; existing validation and ATDD evidence.
- Stage 0 selected `.qfai/discussion/discussion-20260418170937652` with seven
  REQ and five NFR about UI design guidance. It is optional, non-normative
  reference material for this run. The user's approved CR is the requirement
  source; the pack's unrelated items are excluded from this bounded rerun.

## Preflight summary path

- Stage 0 preflight run id `20260925052857076`: exit 0, ready,
  discussion-pack, imported REQ count 7, pack gaps none, carry-over questions
  none.
- Mandatory post-Triage preflight run id `20260925053114074`: exit 0, ready,
  same selected pack and imported REQ count 7.

## Triage decisions

| Source | Subject | Operation | Sub-op | Approved By | Rationale |
| ------ | ------- | --------- | ------ | ----------- | --------- |
| CR-20260924-0004 | Separate the unchanged local release command vector from workflow capability | UPDATE | MODIFY | user@2026-09-25 | Reused the existing `09_delta.md` row for AC-0017-0036 and the BR/EX/TC/TDD split; no new operation. |
| CR-20260924-0004 | Reconcile active traceability against actual implementation bindings | UPDATE | MODIFY | user@2026-09-25 | Reused the existing `09_delta.md` row for active AC/BR bindings and package proof; no new operation. |

- Stage 1 checked 17 active specs and CAP-0017. Other specs' acceptance
  criteria and business rules had no companion obligation hit.
- The selected pack's UI research was read and recorded as unrelated
  provenance; it did not create CR-20260924-0004 Triage rows.

## Open questions

- none for the approved CR scope.

## Decisions made

- No new product or contract decision. Existing approved CR option 3 and
  current SDD artifacts settle the scope and Plan ownership boundary.
- The Phase 4 correction changes the tense of one completed-evidence sentence
  to match existing Round 2 ATDD evidence; TDD `todo` and the implementation
  checkpoint remain pending.

## Work performed

- Stage 1, 2026-09-24T20:29:33.905Z–20:30:18Z: read the selected pack and
  existing Triage, classified the approved CR against 17 active specs, and
  excluded unrelated UI research. No source write.
- Phase 0, 20:31:31.643–20:31:31.646Z: CR impact has `Schema: none`, all 70
  spec-0017 BR `Contract-Refs` are `-`, and no formal API/DB/UI contract or
  `_policies/05_Contracts.md` entry changes. No source write.
- Phase 1, 20:31:52.694–20:31:52.779Z: all 11 `_policies/01..11` files,
  CAP-0017, and open questions were reviewed. No policy, CAP, or OQ change.
- Phase 2, 20:32:28.793–20:32:28.798Z: AC-0017-0036 → BR-0017-0069/0070
  → EX-0017-0070/0071 → TC-0017-0090/0093, the active package proof binding,
  and Plan companion ownership are consistent. No source write.
- Phase 2b, 20:33:16.981–20:33:16.988Z: TC-0017-0090/0091/0092/0093 map
  to 2/3/1/1 Integration TDD rows. Singleton TDD-0107 has `Boundary = -`,
  keeps its ID, selector and evidence link, and appears in ATDD Round 2.
  No row addition, reset, or source write.
- Phase 2c.1, 20:33:55.328–20:33:55.331Z: three AC and five BR were checked;
  formal contract refs, persisted attributes/joins, API delta, and scope
  re-expansion were all zero. No source write.
- Phase 3 author assessment, 20:35:01.020–20:35:34Z, and independent frontier
  assessment, 20:37:36–20:37:57Z: Plan's nine companion paths have actual
  state/use/owner, preserve the spec-0017 ownership boundary, and record
  correction order and existing helper reuse. Frontier/open/lookups zero;
  zero rounds and decisions. No Plan source write.
- Phase 4, 20:38:26.170–20:40:46.6759770Z: DELTA-0002 and its Triage
  subsection, existing CR rows, and the canonical Change Requests table were
  checked. At `20:39:08.4284217Z`, the CR-20260924-0004 note changed
  `are being added` to `were recorded` to match completed Round 2 live
  mutation and independent QA evidence. Direct Prettier write made no further
  change; Prettier check, Markdownlint, and diff check passed before the phase
  closed. No later SDD source write was reported.

## Contract executability

- none

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs sdd preflight
node packages/qfai/dist/cli/index.mjs sdd preflight
node packages/qfai/dist/cli/index.mjs validate --profile sdd --spec spec-0017 --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error
node scripts/check-dogfood-backlog.mjs --profile sdd
node scripts/check-dogfood-backlog.mjs --profile tdd
node scripts/check-dogfood-backlog.mjs --profile full
```

- Both preflight commands exited 0. Phase 4's author ran direct Prettier
  write/check, Markdownlint, and diff check with passing results. After Phase
  4, scoped SDD validation exited 0, while full SDD validation exited 1 on
  11 existing errors outside spec-0017. All three dogfood backlog checks
  exited 0 against their pinned baselines. Repository format, lint, type,
  and `ci:lint` gates passed before the Phase 4 Markdown-only correction;
  Phase 4's direct Markdown checks passed after it.

## Validate evidence paths

- Validate run id `20260925054116276`, scope `--profile sdd --spec spec-0017`:
  exit 0, error=0, warning=25, info=4.
- Validate run id `20260925054139061`, scope `--profile sdd`: exit 1,
  error=11, warning=88, info=5. All errors are the existing
  `QFAI-TDDLIST-017` backlog in spec-0006/0010/0012, outside spec-0017.
- Dogfood SDD, TDD, and full backlog checks: exit 0 with pinned counts
  11 errors/3 files, 936/13, and 952/28, respectively.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 0 | skipped | - | - | empty: CR has no formal contract or schema change | - |
| 1 | skipped | - | - | empty: CAP-0017 and current policies cover the CR | - |
| 2 | skipped | - | - | empty: approved CR and AC/BR/EX/TC chain are current | - |
| 2c.1 | skipped | - | - | empty: affected BR have no formal contract refs | - |
| 3 | skipped | - | - | empty: approved CR, ownership and nine-path companion Plan | - |

- Batch record: none. Phase 3's read-only assessment ran
  2026-09-24T20:37:36Z–20:37:57Z with zero rounds, decisions, open items,
  lookups, and escalations. No formal grilling session or Plan write occurred.
  Phase 2b and Phase 4 have no pre-draft grilling row under the skill contract.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | doc-steward | /root/cr0004_record | Run Stage 0 and post-Triage preflight | selected discussion pack | run 20260925052857076 and 20260925053114074: ready | PASS |
| 2 | requirements-analyst | /root/cr0004_spec | Re-derive Stage 1 and Phases 0, 1, 2, 2b, 2c.1 read-only | CR, spec, policies, pack | scoped no-write findings above | PASS |
| 3 | requirements-analyst | /root/cr0004_spec | Assess Phase 3 Plan | approved CR and current Plan | no-write, nine-path companion and dependency order | PASS |
| 4 | discovery-analyst | /root/cr0004_grill | Assess Phase 3 frontier | approved CR, ownership, Plan | zero frontier/rounds/decisions; skip grilling | PASS |
| 5 | requirements-analyst | /root/cr0004_spec | Complete Phase 4 Delta | delta checklist and ATDD evidence | one tense correction; Phase 4 checks pass | PASS |
| 6 | - | n/a | grilling(-@sdd-cr0004-r4-20260924T202850Z/none): none | - | - | PASS |
| 7 | doc-steward | /root/cr0004_record | Record this ordered run | phase reports and actual gate outputs | this evidence run | PASS |
| 8 | orchestrator | /root | Run post-Phase-4 scoped SDD validation | current spec and validator | run 20260925054116276: error=0 | PASS |
| 9 | completion-reviewer | /root/cr0004_record/sdd_evidence_review | Independently review final run | this evidence and actual gates | REVISE: full SDD error-zero unmet; no new evidence defect | REVISE |
| 10 | orchestrator | /root | Run post-Phase-4 full SDD validation | all specs and validator | run 20260925054139061: 11 existing errors | REVISE |
| 11 | orchestrator | /root | Run post-Phase-4 SDD, TDD and full dogfood ratchets | pinned baselines | all exit 0: 11/3, 936/13, 952/28 | PASS |
| 12 | orchestrator | /root | Run repository quality gates | source before final Phase 4 Markdown correction | format, lint, types and ci:lint exit 0; later Phase 4 direct checks exit 0 | PASS |

## Gaps / Open risks

- Scoped SDD validation and dogfood ratchets passed. Full SDD validation
  still has 11 existing `QFAI-TDDLIST-017` errors outside spec-0017, so its
  error-zero quality gate remains unmet. Independent completion review found
  no new evidence or phase-order defect and returned REVISE for that gate.
- The pre-existing spec-0017 scope wording about its shipped mapping asset
  predates this CR and was not changed in this bounded rerun.
- r2 and r3 remain REVISE history. r4 has not yet passed final gates.

## Final status

- Final status: REVISE
- Rationale: fixed-order source re-derivation, Phase 4 checks, scoped SDD
  validation, and dogfood ratchets passed. Full SDD validation still has 11
  existing errors; independent completion review returned REVISE.
