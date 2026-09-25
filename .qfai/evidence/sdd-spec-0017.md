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
