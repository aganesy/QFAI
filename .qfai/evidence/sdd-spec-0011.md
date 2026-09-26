# Evidence: /qfai-sdd (spec-0011)

## Objective

- Spec target: spec-0011
- Objective: state what `/qfai-implement` does on the story tree — the next test
  is the lowest EX ID no test annotates, an exception is a `decisions.md` row,
  commands come from `<paths.contractsDir>/tech.md`, the gate runs per flow, and
  the shipped `minimal-implementation.md` drops TC and the ledger — and record
  where each change lands.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`, REQ-0001, REQ-0005, REQ-0009,
  REQ-0010, REQ-0013 and REQ-0015
- `.qfai/evidence/sdd-batch-20260923100952585.md` — the batch record this run
  belongs to
- `.qfai/specs/spec-0011/01_Spec.md` to `06_Test-Cases.md`, `10_Plan.md` and
  `tdd/test-list.md`
- `.qfai/specs/spec-0011/09_delta.md` — the `## Triage (2026-09-23 spec-to-story)`
  rows
- `.qfai/contracts/cli/qfai-validate.md` — `#rows-a-validator-reads`,
  `#flow-scope`
- `.qfai/contracts/cli/qfai-init.md` — `#the-spec-tree`, `#configuration`
- `packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md`

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                                                                                              | Subject                                                                                                                    | Operation | Sub-op | Approved By   | Rationale                                                                                         |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0005                                                                               | Implement reads contracts and the Standard commands from `03_contract/`                                                    | UPDATE    | MODIFY | -             | Slice C; this repository has no `03_contract/` before P7                                          |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010, discussion-20260923063306456#REQ-0015 | Implement writes EX tests and picks its next test from the EX IDs no test annotates; an exception is a `decisions.md` row  | UPDATE    | MODIFY | -             | Slice B, lands P7. No TC changes its Level or obligation column                                   |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0013                                        | Shipped rule `minimal-implementation.md`: the observation clause and the ledger and Article V chain drop TC and the ledger | UPDATE    | MODIFY | -             | Slice C. The rule master is linked into this repository, which keeps `06_Test-Cases` until P7     |
| discussion-20260923063306456#REQ-0013, discussion-20260923063306456#REQ-0015                                        | Remove the test-list ledger, the lifecycle status and the exception-with-DR-ID items                                       | UPDATE    | REMOVE | yusuke_senaga | Slice B, lands P7 with the implement rewrite; the ledger gate itself is in spec-0004's REMOVE row |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The scoped completion gate moves from `qfai validate --profile tdd --spec <spec-id>` to `--flow BF-NNNN`                   | UPDATE    | MODIFY | -             | Slice C, lands P7. Follows the user's answer Q2 and spec-0004's `--flow` rows                     |

The full Rationale of each row is in `09_delta.md`.

## Open questions

- OQ-0170 (`_policies`): how this repository migrates its own tree at the P7
  cutover. It keeps the list of items whose spec-pack clause is dropped at
  landing. — Disposition: open
- OQ-0178 (`_policies`): how a test-exception row links to its EX, and which
  statuses make it hold. — Disposition: resolved
- NFR-0002's fate at landing: restated, not retired, with the target wording
  in `09_delta.md` (review ruling D8c). — Disposition: resolved
- Next-test selection from validate's EX findings for the flow, lowest ID first:
  adopted (review ruling D6). — Disposition: resolved

## Decisions made

- Q2: `--flow BF-NNNN` replaces `--spec`, and skills gate per flow — decided by
  the user.
- OQ-0178: a `Test exception:` row holds only while DONE — adopted by agents.
- G5-6: the next test is taken in ascending EX ID order — adopted by agents.
- G5-8: the shipped rule restates Article V rather than spelling the chain —
  adopted by agents.
- P2C-18: BR-0011-0009's first bullet stays without a layout condition, since
  `<paths.contractsDir>` holds on both layouts — adopted by agents.
- X1, X2, X3: layout-conditioned clauses beside the current ones; existing test
  cases keep their text until landing; REMOVE items stay until landing.
- P3-C1: no dogfood pin for `QFAI-ATDD-111` and `QFAI-ATDD-112`; pull request 2
  carries the ATDD and implementation tests — decided by the user.
- D6: `/qfai-implement` takes the lowest EX ID among the test-obligation EX
  findings in `validate.flow-<ids>.json` from
  `qfai validate --profile tdd --flow BF-NNNN`, reading that file whatever the
  exit code — adjudicated by the delivery-planner griller in review cycle 1.
- D8c: NFR-0002 is rewritten at landing as "no ledger status moves backwards",
  not retired — adjudicated by the same griller.
- D17: next-test selection stops on a missing, stale or wrong-profile scoped
  validate result and reports the command, exit code and output.

## Work performed

- `.qfai/specs/spec-0011/01_Spec.md` — Scope lines and the pack requirement
  lines
- `.qfai/specs/spec-0011/02_User-stories.md` — US-0011-0001, 0006
- `.qfai/specs/spec-0011/03_Acceptance-Criteria.md` — AC-0011-0012 to 0015
  added; three changed
- `.qfai/specs/spec-0011/04_Business-Rules.md` — BR-0011-0009 to 0013 added;
  BR-0011-0001 changed
- `.qfai/specs/spec-0011/05_Examples.md` — EX-0011-0010 to 0015 added; two
  changed
- `.qfai/specs/spec-0011/06_Test-Cases.md` — TC-0011-0013 to 0018 added
- `.qfai/specs/spec-0011/tdd/test-list.md` — TDD-0021 to 0026 at `todo`
- `.qfai/specs/spec-0011/10_Plan.md` — the story-tree subsections
- `.qfai/specs/spec-0011/09_delta.md` — the Triage rows, and the section
  `## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands`:
  the landing of five rows; what the REMOVE row retires, with four ledger rows to
  tombstone; one reference repair; three co-change lines; three drift lines
- Review cycle 1 fixes:
  - `10_Plan.md`: the skill reads `validate.flow-<ids>.json` whatever
    validate's exit code, and NFR-0002's target wording
  - `09_delta.md`: the next-test selection recorded as adopted (review ruling
    D6), and NFR-0002's current and target wording (review ruling D8c)
- Review cycle 2: D17 adds the missing, stale and wrong-profile result boundary
  to AC-0011-0008, BR-0011-0014, EX-0011-0016, TC-0011-0019, TDD-0027,
  the plan and delta.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0011 --format github
node 'C:\Users\pc\AppData\Local\Temp\claude\C--Users-pc-Documents-GitHub-QFAI--claude-worktrees-qfai-specs-restructure-ec45fd\f0bdcc77-8dc1-4976-973b-d9ca34906cef\scratchpad\cli\index.cjs' validate --profile sdd --fail-on error --spec spec-0011 --format text
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- After the Round-2b NFR correction, bundled-CLI text run
  `run-20260924165929326` passed: error=0, warning=30, info=4.
- After D17, bundled-CLI text run `run-20260924154440544` exited 1:
  error=1, warning=30, info=4. The sole error is the repository-wide
  `TRACE_SHARED_SCOPE_VIOLATION` on `_policies/10_delta.md` for
  `BR-0004-0081`; it is outside spec-0011.
- After the shared policy delta was corrected, text run
  `run-20260924154614693` passed: error=0, warning=30, info=4.
- Validate run id `run-20260924142652066`, scope `--profile sdd --spec spec-0011`: pass, error=0,
  warning=30, info=4, after this cycle's fixes. The same warnings as the run before these fixes:
  - thirteen `QFAI-TRIAGE-010` on `_policies` rows no ledger carries
  - thirteen `W-WORKLOG-BROKEN-LINK` and one `W-WORKLOG-SCHEMA` on the work-log
    surface
  - one `QFAI-LINK-001` for integration links this Windows checkout cannot
    follow
  - one `QFAI-DCON-034` for the unreplaced sample brand
  - one `QFAI-TRACE-002`, because this spec has no
    `16_Traceability-ledger.md`

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ------------------------------------------ |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | batch record, #phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | batch record, #phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | batch record, #phase-3-grilling-decisions  |

Every escalated decision has the user's answer, so each row is `run`. Phase 0
and Phase 1 ran once for the batch and are recorded there.

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                                   | Output (refs)                                            | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries, `sdd-triage.md`           | Triage sections in the delta files, this spec's included | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                                  | REVISE (F1–F5), then PASS with named fixes N1–N4         | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G5                                 | Phase 2 item plan for spec-0008, 0011 and 0014      | Phase 2 plan brief, Triage, Phase 0 decisions                  | Item plan                                                | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                               | Rulings X1–X14, node rulings, Q1–Q3                      | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                   | Griller ruling, user answers Q2, Q3                            | This spec's gate row among others                        | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G5                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plan, rulings                                     | spec-0011 01–04                                          | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G5                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                                  | spec-0011 05, 06, `tdd/test-list.md`                     | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                                     | Confirmations for this spec (P2C-18)                     | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source                | Elements, node rulings, P3-C1                            | PASS                         |
| 10   | solution-architect                                             | phase3-write-W4                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                                   | spec-0011 `10_Plan.md`; ledger cells                     | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                             | Plans conform; no new validate error                     | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D3                                | Phase 4: the delta record and this evidence file    | Batch record, Phase 2c and Phase 3 carry lists                 | spec-0011 `09_delta.md`; this file                       | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0011                  | Review pack `review-20260924014832174`; review rulings D6, D8c | spec-0011 `10_Plan.md`, `09_delta.md`; this file         | PASS                         |
| 266  | requirements-analyst                                           | review2-fix-Y                                  | Apply D17 to next-test selection                    | Review pack `review-20260924053652061`; D17                 | spec-0011 AC, BR, EX, TC, ledger, plan, delta; this file | PASS                         |

## Gaps / Open risks

- The shipped `minimal-implementation.md` governs this repository's own agents
  as soon as it lands. It is committed after the P7 commit that migrates this
  repository, and with or after spec-0001's Article V rewrite.
- The `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that TC-0011-0013 to 0018 and
  the E2E rows raise in the dogfood lanes clear only when pull request 2 carries
  the ATDD and implementation tests (P3-C1).
- The Reviewer Gate's re-review of this record has not run.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
