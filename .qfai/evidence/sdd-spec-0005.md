# Evidence: /qfai-sdd (spec-0005)

## Objective

- Spec target: spec-0005
- Objective: specify the `qfai report` side of the move to the story-based
  spec tree: one report per business flow, `qfai report --flow BF-NNNN`, the
  refusal of `--spec` there, and record how the approved `--spec` REMOVE row
  lands.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456` (24 REQ, NFR-0001..0008)
- `.qfai/evidence/sdd-batch-20260923100952585.md`, rulings X1–X14, the Phase
  0, 2, 2c and 3 decisions, P3-C1 to P3-C3
- `.qfai/specs/spec-0005/` 01–06, `09_delta.md`, `10_Plan.md`,
  `tdd/test-list.md`
- `.qfai/contracts/cli/qfai-validate.md#flow-scope`
- `.qfai/specs/_policies/09_Open-questions.md` (OQ-0024, OQ-0170)
- Source read to check claims: `packages/qfai/src/cli/commands/report.ts`,
  `packages/qfai/src/core/report.ts`, `packages/qfai/tests/cli/report.test.ts`

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage was
  persisted: ready, 24 imported requirements, no blockers and no pack gaps. The
  Triage was drafted against `run-20260923180635586`, which reported the same.

## Triage decisions

| Source                                                                       | Subject                                                                                                        | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | The spec-pack report becomes a spec-tree report                                                                | UPDATE    | MODIFY | -             | Slice C; the old report ends when the rewrite lands                                                                                                                                                                                                                                                                       |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | `qfai report --flow BF-NNNN` scopes the run to one business flow; `qfai report --spec` on a story tree exits 2 | UPDATE    | APPEND | -             | Slice A, selected by the detected layout. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow. Conservation pairs with this spec's `--spec` REMOVE row                                                                                                         |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013 | Remove the `--spec <spec-id>` scope of `qfai report`                                                           | UPDATE    | REMOVE | yusuke_senaga | Slice C, lands P7. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow; the answer approves this row. No item in this spec states the scope today, so the row removes the flag in code and the tests that pin it. Replacement: this spec's `--flow` APPEND row |

## Open questions

- OQ-0170: how this repository migrates itself at the P7 cutover; every row
  landing at P7 depends on it — Disposition: open
- OQ-0024: no test carries a spec-0005 annotation — Disposition: open

## Decisions made

- Q2 (user, Phase 2): `--flow BF-NNNN` replaces `--spec`, and `--spec` on the
  story tree exits 2; the answer approves the `--spec` REMOVE row.
- G4-15 (Phase 2): on the story tree the report unit is the business flow,
  one `<outDir>/business-flow-NNNN/` per flow.
- Phase 2c: the validate contract's `### Flow scope` section states `--flow`
  for both validate and report.
- X1, X2, X3, X14 (Phase 2): marked clauses beside the current ones; existing
  TCs and ledger rows unchanged; REMOVE items untouched until landing; retired
  IDs never reissued.
- Phase 3: report consumes the flow scope and `scopedReportPath` of
  spec-0004's plan and adds no helper of its own.
- P3-C1 to P3-C3 (user, Phase 3): three pull requests; no dogfood pin for
  `QFAI-ATDD-111` and `QFAI-ATDD-112`.
- DELTA-0002: `09_delta.md` `## 2026-09-24 — spec-to-story batch record`.

## Work performed

- Phase 2: US-0005-0009, AC-0005-0011..0013, BR-0005-0013..0016 and
  EX-0005-0014..0017 added; US-0005-0007 and AC-0005-0007 changed by a marked
  clause; `01_Spec.md` updated.
- Phase 2b: TC-0005-0014..0017 and ledger rows TDD-0019..0026 added at `todo`.
- Phase 3: `10_Plan.md` `### Story-tree layout` subsections; `Owning module`
  cells of the new ledger rows.
- Phase 4: `.qfai/specs/spec-0005/09_delta.md` DELTA-0002 and batch record —
  landing of 3 Triage rows, the items the REMOVE row retires, co-changes, 3
  drift lines.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0005 --format github
```

Run with the CLI built from this worktree's source. The counts below are read
from the run log the command names.

## Validate evidence paths

- Validate run id `run-20260924142953767`, scope `sdd, spec-0005`: pass, 0
  errors, 30 warnings. The warnings are the same findings as the run before the Reviewer Gate corrections; none is new.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ---------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                      | Output (refs)                                        | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries               | `09_delta.md` `## Triage (2026-09-23 spec-to-story)` | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                     | REVISE (F1–F5), then PASS with named fixes N1–N4     | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G4                                 | Phase 2 item plan for spec-0004 and spec-0005       | Phase 2 plan brief, Triage, Phase 0 decisions     | G4 item plan (orchestrator scratchpad)               | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                  | Rulings X1–X14, node rulings, Q1–Q3                  | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                   | Griller ruling, user answers Q2, Q3               | This spec's `--flow` and `--spec` Triage rows        | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G4                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plans, rulings                       | `01_Spec.md`, 02–04                                  | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G4                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                     | 05, 06, `tdd/test-list.md`                           | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                        | Contract corrections, EX/TC pairs and ledger rows    | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source   | Elements, node rulings, P3-C1                        | PASS                         |
| 10   | solution-architect                                             | phase3-write-W1..W7                            | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                      | `10_Plan.md`; ledger cells                           | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                | 195 files conform; no new validate error             | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D2                                | Phase 4: delta record and this evidence             | Phase 4 brief, batch record, Phase 2c and 3 notes | `09_delta.md` DELTA-0002 and batch record; this file | PASS                         |

## Gaps / Open risks

- `qfai report` has no contract file; BR-0005-0014..0016 cite the validate
  contract's flow-scope section. Open.
- No test carries a spec-0005 annotation, and ledger rows TDD-0001..0008 cite
  a test file that does not exist (OQ-0024).
- TDD-0019, TDD-0020 and TDD-0023 cannot go green before the P7 rewrite of
  `specPackReport.ts`.
- `QFAI-ATDD-111` and `QFAI-ATDD-112` fire for this spec's new cases until
  `/qfai-atdd` and `/qfai-implement` write their tests in the same pull
  request (P3-C1).

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
