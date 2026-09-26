# Evidence: /qfai-sdd (spec-0008)

## Objective

- Spec target: spec-0008
- Objective: state what `/qfai-atdd` and `qfai atdd scaffold` do on the story
  tree — BF tests from E2E, AC tests from integration or API, a scaffold keyed by
  story or flow, and a completion gate, evidence file and Coverage Depth Matrix
  per business flow — and record where each change lands.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`, REQ-0001, REQ-0009, REQ-0010,
  REQ-0013 and REQ-0015
- `.qfai/evidence/sdd-batch-20260923100952585.md` — the batch record this run
  belongs to
- `.qfai/specs/spec-0008/01_Spec.md` to `06_Test-Cases.md`, `10_Plan.md` and
  `tdd/test-list.md`
- `.qfai/specs/spec-0008/09_delta.md` — the `## Triage (2026-09-23 spec-to-story)`
  rows
- `.qfai/contracts/cli/qfai-atdd-scaffold.md` — `#story-tree-layout`
- `.qfai/contracts/cli/qfai-validate.md` — `#what-counts-as-a-test`,
  `#finding-families`, `#atdd-scaffold-findings`, `#flow-scope`

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                                                                                              | Subject                                                                                                | Operation | Sub-op | Approved By   | Rationale                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010, discussion-20260923063306456#REQ-0015 | ATDD writes the BF (E2E) and AC (integration or API) tests                                             | UPDATE    | MODIFY | -             | Slice B, lands P7. No TC changes its Level or obligation column, and no ledger row is deleted                    |
| discussion-20260923063306456#REQ-0009                                                                               | Remove the `QFAI:SPEC-*` and `QFAI:CON-API` annotation obligations and the TC forbidden-reference rule | UPDATE    | REMOVE | yusuke_senaga | Slice B, lands P7 with the ATDD rewrite and the asset tests annotating these TCs; retired TDD-IDs are tombstoned |
| discussion-20260923063306456#REQ-0015                                                                               | `qfai atdd scaffold --story US-NNNN-NNNN`: one skeleton per AC under the integration home              | UPDATE    | MODIFY | -             | Slice C, lands P7. Decided by the user (N19). `D-SCAFFOLD-FOREIGN-HOME` is retired (N35)                         |
| discussion-20260923063306456#REQ-0015                                                                               | `qfai atdd scaffold --flow BF-NNNN`: one E2E skeleton per flow                                         | UPDATE    | APPEND | -             | Slice C, lands P7. Decided by the user (N19)                                                                     |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The scoped completion gate moves from `--spec <spec-id>` to `--flow BF-NNNN`                           | UPDATE    | MODIFY | -             | Slice C, lands P7. Follows the user's answer Q2 and spec-0004's `--flow` rows                                    |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The ATDD evidence file and the Coverage Depth Matrix are keyed by business flow (US/AC/EX)             | UPDATE    | MODIFY | -             | Slice C, lands P7. Follows Q2: skills gate per flow. Adopted in Phase 2c (P2C-O8)                                |

The full Rationale of each row is in `09_delta.md`.

## Open questions

- OQ-0170 (`_policies`): how this repository migrates its own tree at the P7
  cutover. It keeps the list of items whose spec-pack clause is dropped at
  landing. — Disposition: open
- OQ-0178 (`_policies`): how a test-exception row links to its BF, AC or EX. —
  Disposition: resolved
- NFR-0003's fate at landing: restated, not retired, with the target wording
  in `09_delta.md` (review ruling D8c). — Disposition: resolved
- TDD-0030's owning module: `atddTraceability.ts` in the cell, while the Phase 3
  plan puts the undeclared-annotation family in `storyTreeObligations.ts`. —
  Disposition: open

## Decisions made

- N19: `qfai atdd scaffold` takes a story or a flow — decided by the user.
- Q2: `--flow BF-NNNN` replaces `--spec`, and skills gate per flow — decided by
  the user.
- N35: `D-SCAFFOLD-FOREIGN-HOME` is retired — adopted by agents.
- P2C-O8: a new MODIFY row keys the evidence file and the matrix by flow —
  adopted by agents.
- X1, X2, X3: layout-conditioned clauses beside the current ones; existing test
  cases keep their text until landing; REMOVE items stay until landing.
- G5-5: the references the REMOVE row would leave dangling are repaired at
  landing.
- P3-C1: no dogfood pin for `QFAI-ATDD-111` and `QFAI-ATDD-112`; pull request 2
  carries the ATDD and implementation tests — decided by the user.
- Review rulings applied in cycle 1: D2 (one ledger row per rejection reason
  or check; another input to the same check is a selector entry), D3 (argument
  errors exit 2, runtime failures exit 1, `--spec` exits 2 naming `--story`
  and `--flow`), D8c (NFR-0003 rewritten at landing, not retired).

## Work performed

- `.qfai/specs/spec-0008/01_Spec.md` — Scope, NFR-0001, REQ-0002, REQ-0003 and
  the pack requirement lines
- `.qfai/specs/spec-0008/02_User-stories.md` — US-0008-0001, 0002, 0004 to 0007
- `.qfai/specs/spec-0008/03_Acceptance-Criteria.md` — AC-0008-0015, 0016 added;
  six changed
- `.qfai/specs/spec-0008/04_Business-Rules.md` — BR-0008-0013, 0014 added; six
  changed
- `.qfai/specs/spec-0008/05_Examples.md` — EX-0008-0014 to 0018 added; six
  changed
- `.qfai/specs/spec-0008/06_Test-Cases.md` — TC-0008-0019 to 0023 added
- `.qfai/specs/spec-0008/tdd/test-list.md` — TDD-0027 to 0031 at `todo`, and
  TDD-0032 to 0035 from the review cycle below
- `.qfai/specs/spec-0008/10_Plan.md` — the story-tree subsections
- `.qfai/specs/spec-0008/09_delta.md` — the Triage rows, and the section
  `## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands`:
  the landing of six rows; what the REMOVE row retires, with three ledger rows to
  tombstone; two reference repairs; four co-change lines; five drift lines
- Review cycle 1 fixes:
  - AC-0008-0010, BR-0008-0008, EX-0008-0014 and TC-0008-0019: every argument
    error exits 2, `--spec` exits 2 with a message naming `--story` and
    `--flow`, and exit 1 is kept for a runtime failure (review ruling D3)
  - `tdd/test-list.md`: TDD-0027 and TDD-0030 gain `Boundary` slugs, and
    TDD-0032 to 0035 are added at `todo`, one row per rejection reason or
    check (review ruling D2)
  - `10_Plan.md`: the exit codes, the `exitCodes.ts` help row at P7, the
    contract `qfai-atdd-scaffold.md` as an element with its usages, the split
    rows in the test table, and NFR-0003's target wording
  - `09_delta.md`: the 2026-09-24 record states the same

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0008 --format github
node 'C:\Users\pc\AppData\Local\Temp\claude\C--Users-pc-Documents-GitHub-QFAI--claude-worktrees-qfai-specs-restructure-ec45fd\f0bdcc77-8dc1-4976-973b-d9ca34906cef\scratchpad\cli\index.cjs' validate --profile sdd --fail-on error --spec spec-0008 --format text
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- After the Round-2b NFR and crosswalk corrections, bundled-CLI text run
  `run-20260924165912853` passed: error=0, warning=30, info=4.
- Validate run id `run-20260924142643848`, scope `--profile sdd --spec spec-0008`: pass, error=0,
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

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                                       | Output (refs)                                                               | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries, `sdd-triage.md`               | Triage sections in the delta files, this spec's included                    | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                                      | REVISE (F1–F5), then PASS with named fixes N1–N4                            | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G5                                 | Phase 2 item plan for spec-0008, 0011 and 0014      | Phase 2 plan brief, Triage, Phase 0 decisions                      | Item plan                                                                   | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                                   | Rulings X1–X14, node rulings, Q1–Q3                                         | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                   | Griller ruling, user answers Q2, Q3                                | This spec's `--story`, `--flow` and gate rows among others                  | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G5                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plan, rulings                                         | spec-0008 01–04                                                             | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G5                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                                      | spec-0008 05, 06, `tdd/test-list.md`                                        | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                                         | The per-flow evidence row (P2C-O8), EX-0008-0018 and TC-0008-0023           | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source                    | Elements, node rulings, P3-C1                                               | PASS                         |
| 10   | solution-architect                                             | phase3-write-W4                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                                       | spec-0008 `10_Plan.md`; ledger cells                                        | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                                 | Plans conform; no new validate error                                        | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D3                                | Phase 4: the delta record and this evidence file    | Batch record, Phase 2c and Phase 3 carry lists                     | spec-0008 `09_delta.md`; this file                                          | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0008                  | Review pack `review-20260924014832174`; review rulings D2, D3, D8c | spec-0008 03–06, `tdd/test-list.md`, `10_Plan.md`, `09_delta.md`; this file | PASS                         |

## Gaps / Open risks

- The `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that TC-0008-0019 to 0023 and
  the E2E rows raise in the dogfood lanes clear only when pull request 2 carries
  the ATDD and implementation tests (P3-C1).
- TDD-0030's owning module, listed under Open questions.
- No test case covers the `--spec` rejection of `atdd scaffold` on its own: it
  is a second input to the no-option row (TDD-0027).
- The Reviewer Gate's re-review of this record has not run.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
