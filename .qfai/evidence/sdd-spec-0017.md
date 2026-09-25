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

---

# Evidence: /qfai-sdd (spec-0017)

## Objective

Apply the approved UPDATE rows of the 2026-09-24 intent-driven entry Triage to spec-0017.

## Inputs reviewed

- `discussion-20260923171450572` (reference, not normative)
- `.qfai/specs/spec-0017/09_delta.md` `## Triage (2026-09-24 intent-driven entry)`
- `.qfai/contracts/cli/qfai-workflow.md`, `workflow-files.schema.md`, `qfai-init.md`, `qfai-validate.md`

## Preflight summary path

- Stage 0: `run-20260924042956656`; ready, 68 REQs, no blockers.
- After Triage: `run-20260924050220859`; ready, 68 REQs, no blockers.

## Triage decisions

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| NFR-0011 | A `windows-latest` CI job for the control-core and init and migration suites | UPDATE | APPEND | - | spec-0017 owns the job topology of `.github/workflows/**`, and the job needs a `SHIPPED-CI:` disposition. Size signal: AC 36 and TC 92 are over both thresholds. spec-0017 owns only CAP-0017, so there is no split |

## Open questions

- Recorded in `.qfai/specs/spec-0017/08_Open-questions.md` where this change opened or resolved one; the source pack's deferred OQs that this batch settled are cited from the settled sets in the Work Orders Summary below.

## Decisions made

- User decisions this batch used: CREATE CAP-0018 approved; OQ-0020 = A; OQ-0012 = A; TD-22 English seeds; N47 = C (spec-0018 not UI-bearing); J2 = B; Y1 = A; P04 = B (draft PR, merge only when every lane is green); the pack's D1..D18.
- Every other decision was adopted from the griller's recommendation and is listed as a `grilling(<phase>/agents)` row in the Work Orders Summary.
- Recorded decisions for this spec live in `07_Decisions.md` and the Decision Log of `09_delta.md`.

## Work performed

- Phase 2 Slice: `01`..`06` appended/amended per the approved Triage rows (see `09_delta.md` change summary).
- Phase 2b: `tdd/test-list.md` delta rows appended; column-only re-runs for `Blocked-By` and `Test file` (Phase 3 P01/P02).
- Phase 2c: reconciled against CLI-WF / CLI-WFFILE / CLI-INIT / CLI-VAL through the Phase 2c checkpoints recorded below (contract writes W01..W16 recorded in the batch record).
- Phase 3: `10_Plan.md` subsection `### Intent-driven entry (CAP-0018)` in all four sections; Plan gate PASS on cycle 2 (cycle 2).
- Phase 4: `09_delta.md` change summary lines for each phase.

## Contract executability

- none (no `db/` contract authored or changed)

## Commands executed

- `node packages/qfai/dist/cli/index.cjs sdd preflight --fail-on error` (Stage 0) and again after Triage
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --spec spec-0017 --fail-on error --format text`
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --format github`
- `node scripts/check-mdschema.mjs`, `node scripts/check-mermaid.mjs`, `node_modules/.bin/prettier --check`
- The repository build was used rather than `npx qfai`, which resolves a stale published copy; `packages/qfai/dist` was rebuilt from HEAD source with tsup.

## Validate evidence paths

- Spec-scoped validation: `run-20260924143704864`, pass, error=0, warning=24.
- Batch-wide sdd validation: `run-20260924145952965`, fail, error=27, warning=85. Twelve errors were pending review summaries; the other 15 are pre-existing pins in `scripts/dogfood-backlog.json`. The skill stop condition of error=0 was not met.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 2     | run     | 2026-09-24T00:31:55.660Z | 2026-09-24T00:35:24.423Z | 20 settled (Y1 by the user), 0 escalated | #work-orders-summary |
| 2c.1   | run     | 2026-09-24T01:02:25.952Z | 2026-09-24T01:03:17.857Z | 20 settled, 0 escalated | #work-orders-summary |
| 2c.2   | run     | 2026-09-24T01:21:57.179Z | 2026-09-24T01:22:52.841Z | 6 settled, 0 escalated | #work-orders-summary |
| 3      | run     | 2026-09-24T02:07:28.733Z | 2026-09-24T02:37:08.963Z | 19 settled (P04 by the user), 0 escalated | #work-orders-summary |

- Batch record: `sdd-batch-20260924045712999.md` (Phase 0 and Phase 1).

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/user): Y1 QFAI-TRACE-001 | working notes | A: accept and record (user); decision and reason recorded in this row | PASS |
| 2 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y2 Where the new tests live | settled recommendation and cited specifications | Decision: New files only: spec-0003 under `packages/qfai/tests/integration/init/`, spec-0017 at `packages/qfai/tests/integration/spec0017WindowsParity.test.ts`, E2E per K01 and L01; reason: `tests/cli/` answers no layer (S24); files named by `done` rows go stale (X18); disagreeing: none | PASS |
| 3 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y3 Row shape | settled recommendation and cited specifications | Decision: Each file keeps its declared form: the word-form `Level` both files declare; spec-0003 rows plus an English `## TC-0003-NNNN` section each; spec-0017 fills `Falsifying oracle`; reason: Both `## Purpose` sections fix the spelling; X20 was a per-file table; disagreeing: none | PASS |
| 4 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y4 Phase 2b seeding | settled recommendation and cited specifications | Decision: Delta only, with `Blocked-By` per the TD table; IDs from TDD-0093 and TDD-0111; the only new findings allowed are `QFAI-ATDD-111`/`-112`, which X27 clears, and Y1; reason: X26, X27; disagreeing: none | PASS |
| 5 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y5 Failure-side scope | settled recommendation and cited specifications | Decision: spec-0003: error rows for kept failures only. spec-0017: its own criterion, one `normal` and one `error` or `boundary` row per AC; reason: Each file's own rule; disagreeing: none | PASS |
| 6 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y6 Windows red tests | settled recommendation and cited specifications | Decision: **The rule, recorded.** Every test red on the trial run falls in one class. (1) Platform-inapplicable (a POSIX-only property): `it.skipIf(process.platform === "win32")`, with the property named. (2) Parity defect: fixed in production code, and the test stays as the regression evidence. (3) Test defect (an assumed `/`, LF or case): the test is corrected. For (1) and (3) on a file a `done` row names, the same change appends a re-verify record in the existing form. No test leaves the suite list for being red, and the job is never `continue-on-error`. A class-2 fix that changes behaviour a released contract states is a Change Request and goes to the user. The trial run's per-suite counts go into the delivery evidence; reason: Parity exists to surface these failures; BR-0017-0033; disagreeing: none | PASS |
| 7 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L01 Story and its journey | settled recommendation and cited specifications | Decision: US-0017-0016 (`#NFR-0011`). The E2E journey is a **new file**, `packages/qfai/tests/e2e/spec0017WindowsParityE2E.test.ts`, with one annotated describe; reason: Adding a describe to the existing file moves the count `stageEvidenceCounts.test.ts` holds against a committed evidence sentence (X18); disagreeing: RA (a describe in `spec0017LayeredCiScaffoldE2E.test.ts`; not taken) | PASS |
| 8 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L02 ACs and BRs | settled recommendation and cited specifications | Decision: AC-0017-0037..0039 and BR-0017-0071..0073 as tabled. **AC-0017-0037 gains the temp-root outcome** of L10; reason: Otherwise the L10 row has no AC to cite; disagreeing: none | PASS |
| 9 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L03 Job shape and hygiene | settled recommendation and cited specifications | Decision: `windows-parity` job: `needs: [detect]`, the `test` job's detection condition verbatim, in `ci-pass`'s `needs`, `permissions: contents: read`, `persist-credentials: false`, SHA pins, the shared setup action, and `timeout-minutes` from the trial run. The expected-context declaration gains its entry. No new BR for properties existing rules hold (X23); two TD-03 rows; reason: BR-0017-0006/0007/0013/0014/0015/0018/0020/0024/0043; disagreeing: none | PASS |
| 10 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L04 Where the suite list lives | settled recommendation and cited specifications | Decision: **A `test:windows-parity` script** in `packages/qfai/package.json`, called by the job. BR-0017-0057 does not apply: `sliceSurfaceAlignment.test.ts` defines a per-slice script by its `--project` selection, not by a `test:` prefix, and `test:assets` and `test:coverage` sit outside the set the same way. The TD-01 rows hold the list: a set compared both ways, and each entry resolving to at least one collected file; reason: A developer can reproduce the trial baseline, and the check that worried RA does not cover it; disagreeing: RA (paths inline, fearing BR-0017-0057; not taken) | PASS |
| 11 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L05 The build step | settled recommendation and cited specifications | Decision: `pnpm -C packages/qfai build` in the job before the tests; no `needs: build` and no artifact; two TD-04 rows; reason: S30; it also shows the package builds on Windows; disagreeing: none | PASS |
| 12 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L06 The symlink failure at ci.yml:312-317 | settled recommendation and cited specifications | Decision: The suite list reads no tracked link; `agentsRulesSurface` stays off; the comment at 312–317 is left alone; reason: N35; disagreeing: none | PASS |
| 13 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L07 SHIPPED-CI: | settled recommendation and cited specifications | Decision: `not-applicable` on added lines at the new job, with RA-04's reason (the shipped test lanes run the adopter's own scripts on the runner the adopter names, so there is no QFAI suite or fixed platform to add). No ledger entry is needed: `packages/qfai/package.json` is outside the rule's scope. No TC; the guard checks the diff; reason: `shipped-ci-parity.md` `## Scope`; the reason is new text in this change; disagreeing: SA (a different reason wording; equivalent) | PASS |
| 14 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L08 Merge gating | settled recommendation and cited specifications | Decision: **Not critical; within the user's answer.** The job joins `ci-pass`'s `needs`, like every other lane. See the note below; reason: Below; disagreeing: none | PASS |
| 15 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L09 The eval-runner guard | settled recommendation and cited specifications | Decision: spec-0018's (TC-0018-0212); spec-0017 names it in Scope `Out`, with no BR and no row; reason: N45, M20; N46; disagreeing: none | PASS |
| 16 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L10 A space in every temp root | settled recommendation and cited specifications | Decision: The job sets `TEMP` and `TMP` to a directory whose name has a space, in a step before the tests; the new spec-0003 and spec-0018 fixtures also put a space in their roots. One L3 row; reason: Reaches the existing suites through an environment variable instead of editing files that `done` rows name; disagreeing: none | PASS |
| 17 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L11 Decision record | settled recommendation and cited specifications | Decision: DR-0017-0024 records OQ-0012 = A: the rejected alternatives, the merge-gating limit of L08, and the BR-0017-0030 numbers from the trial run. **It gets a `DL-` twin under a new `## Decision Log` in `09_delta.md`**; reason: `spec-traceability-rules.md` "Both halves of the first row, or the decision is invisible" is the rule, and a file's silence does not waive it; disagreeing: RA (no DL twin; not taken) | PASS |
| 18 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L12 Open questions | settled recommendation and cited specifications | Decision: One change-summary line for pack OQ-0012; OQ-0017-0002 is left as written, and DR-0017-0024 says the gating waits on it; reason: The question arrived answered; disagreeing: none | PASS |
| 19 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L13 IDs, size, 09_delta.md | settled recommendation and cited specifications | Decision: US-0017-0016, AC-0017-0037..0039, BR-0017-0071..0073, EX from EX-0017-0072, TC-0017-0094..0099 (the L10 row included), DR-0017-0024; size line with no split; reason: X09; disagreeing: none | PASS |
| 20 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): L14 The setup action on Windows | settled recommendation and cited specifications | Decision: A fact for the devops-ci-engineer to look up at design: whether `./.github/actions/setup` runs unchanged on `windows-latest`. If it does not, that is a finding before Phase 3, since BR-0017-0025 forbids an inline Windows preamble; reason: A fact the environment settles; disagreeing: none | PASS |
| 21 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K1 regression_fix receipts | settled recommendation and cited specifications | Decision: Contract: `regressionFix: { testId, rerunRef, reviewRef }` on a `regression_fix` result, and `invalid-input` reason `regression-fix-receipt`. BR-0018-0039 unchanged; BR-0011-0019 names the field; TC-0018-0068 gains the refusal pair; reason: D18 names the same test, and only a field carries that; it mirrors `testFix`; disagreeing: none | PASS |
| 22 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K2 Direct-exclusion seeds | settled recommendation and cited specifications | Decision: Rewrite ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024 to cover the four missing direct-exclusion classes while keeping the 24 fault and 64 route seed counts; reason: REQ-0007 requires a routing seed for each excluded class. Those four seeds duplicate cases already carried by ROUTE-014, ROUTE-021 or ROUTE-031 after the user chose English-only prompts, so their slots can cover environment settings, SQL files, generated files and QFAI-owned skills or constitution. Each rewritten seed forbids `direct`; disagreeing: SA proposed recording a gap and adding no seed; rejected because it would leave four required classes untested | PASS |
| 23 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K3/K4 Non-CREATE approvals in a run | settled recommendation and cited specifications | Decision: `Authorization-Ref` is valid only on CREATE rows. Other approval-required operations keep the Stage 1 human question; the answer reaches the next attempt through `authorizationRefs`, and the row copies `answeredBy@date` into `Approved By` for the existing validator check; reason: D5 and REQ-0042/0043 require a reference for the routing-time CREATE approval, while DR-0296 preserves the existing questions for the other operations. DPOL-04 requires a recorded human answer without requiring a second carrier on those rows; one CLI-VAL change removes an unreachable Binding branch; disagreeing: RA proposed a new question kind, operation and target fields, and a Binding branch for every approval; rejected as more mechanism than the request needs | PASS |
| 24 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K5 The shared-obligation Boundary rule | settled recommendation and cited specifications | Decision: **A new rule, BR-0013-0036** (AC-Refs AC-0013-0034): a seeded row on an obligation that already has a row names a `Boundary`, and each existing sibling lacking one gains its slug, with `Status` and `Evidence` unchanged. EX-0013-0028's `BR-Ref` names BR-0013-0028 and BR-0013-0036; reason: BR-0013-0028's title says seeding changes no existing row; the slug is the one change to an existing row, so as a bullet it would contradict its own BR; disagreeing: SA (a bullet on BR-0013-0028; not taken) | PASS |
| 25 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K6 The owner of a missing environment | settled recommendation and cited specifications | Decision: Merged. Contract: CLI-WF `### Stage result` states `resolvingOwner`'s domain, a skill a plan names or `operator`. Obligation: BR-0014-0030 is **split**. Three repair kinds return `needs_repair` with `resolvingOwner` `qfai-sdd`, `qfai-atdd` or `qfai-implement`. A missing environment is not a repair: verify returns `blocked`, blocker `stage-blocked`, cleared by `operator`. AC-0014-0027 is reworded to match; reason: The field needs a domain the core can dispatch to, and the environment case already fits the blocker set (REQ-0039); disagreeing: none | PASS |
| 26 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K7 A blocked seam-only result | settled recommendation and cited specifications | Decision: Contract, the seam paragraph: a `blocked` or `unrun` seam-only result blocks the run like any result; the parent acceptance attempt stays open; once `resume` clears it, `next` reissues the seam-only work order as a new attempt; a `needs_repair` seam result routes by its `debts` (R1). No BR changes; one TC in spec-0011; reason: What `next` issues is the core's behaviour; disagreeing: none | PASS |
| 27 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K8 BR-0001-0019's "three" | settled recommendation and cited specifications | Decision: RA-07 A: BR-0001-0019 says the drift protocol's minimal whitelist keeps every exception it lists and gains the two bugfix exceptions (DR-0297); EX-0001-0015 changes only if it counts entries; reason: The spec owns the change to the whitelist, not a copy of it; disagreeing: none | PASS |
| 28 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-09 The unrecorded stop | settled recommendation and cited specifications | Decision: BR-0018-0076: "at the next `resume`"; reason: CLI-WF fires `running → interrupted` from `resume` only (N28); disagreeing: none | PASS |
| 29 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-10 Choosing between runs | settled recommendation and cited specifications | Decision: BR-0018-0066: the worktree's one non-terminal run is what "continue" resumes, so REQ-0002's choice is never put; reason: `run-active` and `identity-mismatch` rule out two candidates (N09, N10); disagreeing: none | PASS |
| 30 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-11 start inputs | settled recommendation and cited specifications | Decision: BR-0018-0011 names `request`, `completionTarget` and `harness`, and says the scope is fixed at routing; reason: CLI-WF `### start`; disagreeing: none | PASS |
| 31 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-12 Debt resolution | settled recommendation and cited specifications | Decision: Option C. **Contract** (CLI-WF `## Completion`): a debt is resolved when the `finish` validate, or a later accepted result of the stage kind that detected it, no longer reports its `findingCode` at its `path`; otherwise it stays `debt-open` with its `resolvingOwner`. **Obligation** (BR-0018-0026): a debt only another spec can resolve keeps the run from completing, as REQ-0037 states, and is repaired by that spec outside the run; reason: Without a resolution, completion is unreachable after any debt; closes the wave-2 advisory; disagreeing: none | PASS |
| 32 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-13 The request-kind clause | settled recommendation and cited specifications | Decision: Contract, the `scope-escape` row of `### Route proposal`: "…, or `requestKind` is not `change`"; reason: It writes down what S27 and DR-0018-0013 already took the row to say; disagreeing: none | PASS |
| 33 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-14 A replan's list | settled recommendation and cited specifications | Decision: Contract: each `priorStageReceiptRefs` entry of a work order is `{ ref, validity }`, with `validity` `valid`, `stale` or `unknown`; the remaining obligations are `ledger.rowIds`. BR-0018-0045 cites it; reason: REQ-0039's list becomes observable on the work order after a replan; disagreeing: none | PASS |
| 34 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-15 R5 narrowed | settled recommendation and cited specifications | Decision: Contract (`## Fail-closed`): a `reviewer-missing` message names `qfai init --force` when the shipped routing entry is absent, and otherwise names the manifest file and the dropped reviewer; reason: `--force` restores an absent entry but not a dropped reviewer. The user's J2 answer concerned what a plain upgrade leaves behind, and K17 of wave 3 already applies this line to R4; disagreeing: none | PASS |
| 35 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-16 The diagnosis names its rows | settled recommendation and cited specifications | Decision: Contract: `diagnosis` gains `matchedRowIds`; cause candidates and impact are content of the record `reproductionRef` names. BR-0011-0016 says so; reason: The core needs the row IDs to bind the `regression_fix` or `test_fix` work order (`ledger.rowIds`); disagreeing: none | PASS |
| 36 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-17 Evidence against write-scope | settled recommendation and cited specifications | Decision: Contract (`### Stage result`), **corrected**: `changedFiles` lists every changed path git does not ignore, and each must lie in a write area. A file a stage writes that git ignores is named in `artifactRefs`, is not a changed file, and is outside `write-scope`. BR-0011-0015: "changes no tracked project file"; reason: SA's directory list ("`.qfai/evidence/` apart from `workflow/`") is wrong. The managed `.gitignore` re-includes tracked governance evidence under `.qfai/evidence/` (`implement-*.md`, `atdd-*.md`, `change-request-*.md`, `decision-*.md`, `decisions/`, `prototyping/grilling.md`), which a stage writes and git tracks. The ignore status is the boundary `finish`'s diff already uses; disagreeing: SA (the directory list; corrected) | PASS |
| 37 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-18 The row digest | settled recommendation and cited specifications | Decision: Contract (`## Ledger row-set check`): the digest covers the row's cells and serves resume reconciliation; `accept` refuses only the two listed changes; any other cell edit is the stage owner's, judged by review; reason: The C3/E4 test fixes edit `Test file` and `Selector`; disagreeing: none | PASS |
| 38 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-19 Missing realization rows | settled recommendation and cited specifications | Decision: Rows added in spec-0018 (13) and spec-0015 (BR-0015-0003); reason: Phase 2c diffs the tables; disagreeing: none | PASS |
| 39 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-20 Lock keys on Windows | settled recommendation and cited specifications | Decision: Contract (CLI-INIT `### Windows parity`): "lock keys are project-relative paths with `/`"; reason: BR-0003-0058 states it, and no contract did; disagreeing: none | PASS |
| 40 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-21 Settled inputs | settled recommendation and cited specifications | Decision: Contract (`### Work order`): `settled`, listing the checked proposal's routing result ID and every answered question as `{ questionId, text, chosen }`. It is runtime only, and the tracked summary copies none of it. BR-0010-0013, AC-0010-0013, BR-0015-0021 and BR-0018-0058 cite it; reason: `inputs` is `{ path, digest }` and no file holds the answers; one field, no new file or writer; NFR-0014 holds, since the work order is under `.qfai/runs/`; disagreeing: none | PASS |
| 41 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-01 Record areas | settled recommendation and cited specifications | Decision: W14, narrowed as above: a separate `recordAreas` keyed on stage kind and bound spec; approval records, `workflow/` and spec `01`..`05`/`07`/`08`/`10` never included; the announcement and `scope.digest` cover the authorized scope only; reason: W05 needs the stage's own tracked records to pass `write-scope`; SA's wording let a stage write approval records and other specs' evidence; disagreeing: SA (the whole tracked evidence tree; narrowed) | PASS |
| 42 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-02 ROUTE-028 | settled recommendation and cited specifications | Decision: Rewrite ROUTE-028, keeping the counts at 24 and 64: one non-terminal run beside a terminal one, conversation binding missing; expected `requestKind: "resume"`, `requiresHumanInput: false`, `must: ["resume_checkpoint"]`, and a `forbid` token for resuming the terminal run, typed in the vocabulary by N41's rule; reason: The seed expects a choice between two live runs, which `run-active` makes unreachable (BR-0018-0066, 2C-SA-10); it stays distinct from ROUTE-027, which has no distractor; disagreeing: none | PASS |
| 43 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-03 DR-0018-0012's counts | settled recommendation and cited specifications | Decision: Four D5 rewrites (ROUTE-014, 035, 055, 056); the K2 bullet (ROUTE-044, 045, 022, 024) unchanged; a new ROUTE-028 bullet; Context counts matched. The DL-0012 twin matches; reason: The record must state what was rewritten; disagreeing: none | PASS |
| 44 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-04 The safety-relevant floor | settled recommendation and cited specifications | Decision: No fixed number anywhere. The floor is whatever N42's rule derives from the rewritten seed file and the typed vocabulary, recomputed before the delivery-planner records the list (by 2026-11-09). N42's "24" is superseded as a planning figure; OQ-0018-0015's text says "derived by the rule"; reason: Both inputs are still changing, and a literal floor in a TC would fail a correct recompute; disagreeing: none | PASS |
| 45 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-05 spec-0013 titles | settled recommendation and cited specifications | Decision: Accept, with one word more: BR-0013-0028 and AC-0013-0034 read "no existing row's status or evidence"; reason: It restates K5's outcome; the only edit to an existing row is the `Boundary` slug, which W11 leaves to the stage owner; disagreeing: none | PASS |
| 46 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-06 spec-0017 is reached | settled recommendation and cited specifications | Decision: Recorded: W13 reaches BR-0017-0071's realization row; re-read with no amendment. The 2c.1 "not reached" line is corrected; reason: BR-0017-0071's realization names CLI-INIT `### Windows parity`; disagreeing: none | PASS |
| 47 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P01 Blocked-By on todo rows | settled recommendation and cited specifications | Decision: **SA-05 A.** The Phase 2b re-run clears `Blocked-By` on every `todo` row of this batch that holds a bare spec ID: the E2E rows of both directions, and the TCs X25 marked `Blocked-By spec-0018`. The order lives in the plans: TD-05's tiers in `## Test approach`, SA-04's units in `## Implementation approach`, and spec-0018's per-journey prerequisite rows as `spec-NNNN:TDD-NNNN`. An implementer who really blocks a row writes the grammatical cell then. **X25 is amended accordingly**; reason: `obligation-columns.md`: "Required on `blocked` rows, blank otherwise", in the form `<blocker> — blocked at <status>`. That no validator parses a `todo` cell (`parseBlockedBy` runs only on `blocked` rows) does not make the value grammatical. X25, my own wave-2 node, was wrong against it; disagreeing: TD (keep the cells; not taken) | PASS |
| 48 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P02 Test-module granularity | settled recommendation and cited specifications | Decision: **TD-10 A.** Test modules one per BR, and several TCs in one module only when they share a BR. The Phase 2b re-run rewrites spec-0018's `Test file` column, splitting `decide.test.ts` (273 rows) and `cli.test.ts` (75) by BR. **`Owning module` stays as seeded (SA-01)**: `decide.ts` whole, the production write set unchanged. For wave-2 and wave-3 specs the ledgers hold `Test file` `-`, and each plan names its modules per BR. **X18 is clarified**: "one new file per spec and subject" means per BR group, never one file per spec; reason: `test-layers.md`: "Default: one test module per `TC-*` … Grouping … when they verify the same BR … Above that, split by BR … A single `Test file` value shared by every row of a spec is an anti-pattern … `qfai-sdd` should emit a per-item `Test file`". SA-01 concerns the production file, which this leaves alone; disagreeing: none | PASS |
| 49 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P03 Journeys for the unreached stories | settled recommendation and cited specifications | Decision: Adopted as **three variants of existing spec-0018 journeys**, recorded in spec-0018 `06` `## E2E journeys`: a `discovery` variant through the discussion stage (US-0010-0013), a `feature` variant with `prototype_decision_needed` (US-0012-0144), and a handover variant asserting the deterministic half (US-0001-0010: a result with an unissued work-order ID is refused and nothing changes, and `qfai-run` is installed where the entry check points; the model's pickup stays release evidence). Each is annotated with the stage story's ID. **No new spec-0018 story or ledger row**: the E2E rows are the stage specs' own, which already exist. **No upgrade journey for US-0003-0029**: K01 of wave 3 settled that it is discharged by the spec-0018 journey whose first step runs `qfai init`, with the upgrade half held in L3 rows. TD-03's mapping table goes in spec-0018's plan; reason: Within the request: X10 already committed the spec-0018 journeys to discharge each stage story, and `QFAI-ATDD-111` needs them. Marking the stories `planned` would defer obligations the approved triage carries; disagreeing: TD (new journeys with ledger rows, and the upgrade journey; not taken) | PASS |
| 50 | architecture-reviewer (griller) | p3-griller | grilling(3/user): P04 X27 and pushes | working notes | B: push freely to a draft PR, merge only when every lane is green (user); decision and reason recorded in this row | PASS |
| 51 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P05 Coverage Depth Matrix pins | settled recommendation and cited specifications | Decision: The push that adds a spec's first matrix (spec-0001, 0004, 0010, 0011, 0012, 0015) also re-pins `full` with `--profile full --pin`, which strikes that spec's `QFAI-ATDD-131` entry. The six plans say so in `## Test approach`. No matrix is written in SDD; reason: The backlog rule re-pins a file that improves in the same change, and a count below its pin fails; disagreeing: none | PASS |
| 52 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P06 Units and tiers | settled recommendation and cited specifications | Decision: **Both, reconciled.** SA's six units are the implementation order in `## Implementation approach`; TD's five tiers are the green order in `## Test approach`. U1 = tier 1; U2, U3, U4 = tier 2; U6 = tiers 3 and 4, with the stage E2E rows closing at tier 5. **The Windows job (U5) lands after U1 and U4**, once its suite entries resolve (BR-0017-0074, TC-0017-0095), and does not wait for the journeys. The routing eval comes last, at release; reason: The Windows job needs its suites, not the journeys; disagreeing: TD (Windows at tier 5 after the journeys; not taken) | PASS |
| 53 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P07 Plan headings and form | settled recommendation and cited specifications | Decision: Under each existing section, one English subsection **`### Intent-driven entry (CAP-0018)`**, in all four sections and all eleven existing plans. A line this change makes false is rewritten in place, in English (TD-01; G14 in spec-0001). Legacy text and legacy risk rows are not touched. A risk section without the four columns gets its new rows as a four-column table inside the subsection (RA-01). spec-0018's new plan needs no subsection; reason: The validator's `QFAI-PLAN-003` matches `changelog`, `history` and `update history`, not a date, so both headings pass. A subject-named heading states what the plan covers, not when, which suits OC-04 (history belongs in `07` and `09`); disagreeing: RA, TD (`(2026-09-24)`; not taken) | PASS |
| 54 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P08 Risk-row ownership and form | settled recommendation and cited specifications | Decision: RA-04 A: one risk row per limit, in the plan that owns its record or mechanism; others cite it in an NFR bullet; L4 and L6 get two rows each, one per failure. RA-05 ratings (`low`/`med`/`high`, as `likelihood / impact`) and observable triggers. **Batch-level risks:** X27's row is in spec-0018's plan only, written from P04's answer. **RA-06's other two rows are dropped**: the `Blocked-By` cycle is removed by P01, and the module names are fixed by P02's re-run. spec-0008's third row (RA-10) is reworded to "the order is spec-0018's plan (P06)", since its cell is cleared; reason: One owner per mitigation stops five copies drifting; a resolved risk is not a risk; disagreeing: SA (X27 in every plan that adds E2E or ATDD rows; not taken) | PASS |
| 55 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P09 NFR approach | settled recommendation and cited specifications | Decision: RA-02 A: the three groups; group 2 (NFR-0002, 0015, 0017 wherever a shipped asset or an operator string changes) cites the existing guard. RA-03 A: a measurement is an observation that exists or is scheduled. NFR-0006, 0008 and 0018 are measured at a release step, with no claim before it (OC-80); reason: N46; OC-80; disagreeing: none | PASS |
| 56 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P10 spec-0018's new 10_Plan.md | settled recommendation and cited specifications | Decision: Three authors, one file, written in sequence to avoid conflicting edits. The solution-architect creates the file and writes `## Implementation approach` (the seven elements with their usages, U1..U6, the SSOT-modules step, and what it leaves out). Then the test-design-analyst writes `## Test approach` (TD-31, the tiers, the P03 mapping and variants, the fault-seed index, the eval). Then the requirements-analyst writes `## NFR approach` and `## Risk mitigation` (RA-18 rows, minus the two dropped under P08); reason: Each section is its owner's; disagreeing: none | PASS |
| 57 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P11 Elements, usages and what each plan leaves out | settled recommendation and cited specifications | Decision: Adopted as proposed: spec-0018's seven elements with at least three usages each; spec-0001 and spec-0003 each introduce one element; the others none, said in one line; the leave-out lists; the CLI-WF/CLI-WFFILE SSOT-modules move in U1; reason: The template's element rule; disagreeing: none | PASS |
| 58 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P12 Y1 in the plans | settled recommendation and cited specifications | Decision: spec-0014's and spec-0017's plans record Y1 = A with the counts (4 and 3) and the trigger "count differs, or `build` gains `origin/main`". Both record the CI gap that the dogfood lanes cannot run `QFAI-TRACE-001`; reason: Records the user's answer and decides nothing; disagreeing: none | PASS |
| 59 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P13 CR-20260913-0005's ID clash | settled recommendation and cited specifications | Decision: Out of this batch: one risk row in spec-0014's plan saying the CR takes the next free TDD ID at its approval; reason: Not this batch's change; disagreeing: none | PASS |
| 60 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P14 Windows job test approach | settled recommendation and cited specifications | Decision: Adopted, with P06's land order. spec-0003's tests go in `tests/integration/init/`; links are created in temp dirs; CRLF comes from fixtures; the temp root is read from the environment; the build is in the job; the trial run sets the baseline under Y6; reason: S24, S30, Y6; disagreeing: none | PASS |
| 61 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P15 The routing eval | settled recommendation and cited specifications | Decision: Adopted: the deterministic halves are CI rows; the runner is manual, run last at release; the record carries the three digests; two open inputs (OQ-0018-0013, OQ-0018-0015); English only; reason: N40, N42, N45, M20; disagreeing: none | PASS |
| 62 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P16 Known findings each plan records | settled recommendation and cited specifications | Decision: Adopted; the X27 line is written from P04's answer (under B, the expected-findings list per push); reason: A reviewer must not read them as new; disagreeing: none | PASS |
| 63 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P17 spec-0017 Tier | settled recommendation and cited specifications | Decision: Raise the seven spec-0017 rows to T2 in the P02 re-run **only if** the Phase 2b seeding rule ("seed `Tier` … from … what the item touches") names CI infrastructure as a raising factor; the test-design-analyst checks its text at write time and otherwise leaves `-`; reason: It applies an existing seeding rule, or nothing; disagreeing: none | PASS |
| 64 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P18 Per-spec risk and NFR rows | settled recommendation and cited specifications | Decision: Adopted as listed, with the P08 rewording for spec-0008 and the P04 answer for any X27 citation; reason: P08, P09; disagreeing: none | PASS |
| 65 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P19 Per-spec test approaches | settled recommendation and cited specifications | Decision: Adopted as listed, with three changes: TD-21's US-0003-0029 journey is K01's, not an upgrade journey (P03); each spec's order line cites P06; each module list is per BR (P02); reason: P02, P03, P06; disagreeing: TD (the upgrade journey; not taken) | PASS |

## Gaps / Open risks

- Pushes before ATDD and implementation land show `QFAI-ATDD-111/112` and RED acceptance tests; each push lists its expected findings in the relevant Plan under `Findings carried on purpose` and merge waits for every lane to be green (P04 = B).
- The push carrying this batch re-pins `full` for `discussion-20260418170937652` (pinned 2, now 0) and strikes the first-matrix `QFAI-ATDD-131` pins (spec-0001, 0004, 0010, 0011, 0012, 0015).
- QFAI-TRACE-001 fires locally on three ledger rows once committed (Y1 = A, as spec-0014).
- The windows-latest job does not gate merges: the only required check is `build` (OC-73); moving required checks is a repository-settings change (OQ-0017-0002).

## Final status

- Final status: REVISE
- Rationale: reviewer findings are being addressed; the batch-wide sdd validation still contains pinned errors.
