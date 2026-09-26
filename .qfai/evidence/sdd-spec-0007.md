# Evidence: /qfai-sdd (spec-0007)

## Objective

- Spec target: spec-0007
- Objective: read guardrails from `01_policy/` and the contract layer on the
  story tree, and record the guardrail grammar question the change leaves
  open.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456` (24 REQ, NFR-0001..0008)
- `.qfai/evidence/sdd-batch-20260923100952585.md`, rulings X1–X14, the Phase
  0, 2, 2c and 3 decisions, P3-C1 to P3-C3
- `.qfai/specs/spec-0007/` 01–06, `09_delta.md`, `10_Plan.md`,
  `tdd/test-list.md`
- `.qfai/specs/_policies/09_Open-questions.md` (OQ-0170, OQ-0180)
- Source read to check claims: `packages/qfai/src/core/decisionGuardrails.ts`
  and its callers, `packages/qfai/tests/cli/guardrails.test.ts`,
  `packages/qfai/tests/cli/main.test.ts`

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage was
  persisted: ready, 24 imported requirements, no blockers and no pack gaps. The
  Triage was drafted against `run-20260923180635586`, which reported the same.

## Triage decisions

| Source                                                                                                              | Subject                                                  | Operation | Sub-op | Approved By | Rationale                                  |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------ |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005 | Guardrails are read from `01_policy/` and `03_contract/` | UPDATE    | MODIFY | -           | Slice C; BR-0007-0001 names the old source |

## Open questions

- OQ-0170: how this repository migrates itself at the P7 cutover; this spec's
  row depends on it — Disposition: open
- OQ-0180: which guardrail grammar the story tree uses, RFC 2119 keywords or
  `DG-NNNN` entries — Disposition: deferred

## Decisions made

- G3 C1 (Phase 2): only BR-0007-0001's source clause changes; the grammar
  mismatch is deferred as OQ-0180.
- X1, X2 (Phase 2): the story-tree clause is added beside the current one;
  existing TCs and ledger rows unchanged.
- Phase 3: the P7 change moves the scan roots only, and all three callers of
  `loadDecisionGuardrails` pass both directories.
- P3-C1 to P3-C3 (user, Phase 3): three pull requests; no dogfood pin for
  `QFAI-ATDD-112`.
- DELTA-0002: `09_delta.md` `## 2026-09-24 — spec-to-story batch record`.

## Work performed

- Phase 2: BR-0007-0001 changed by a marked clause; EX-0007-0012 added; three
  lines in `01_Spec.md`.
- Phase 2b: TC-0007-0012 and ledger row TDD-0015 added at `todo`.
- Phase 3: `10_Plan.md` `### Story-tree layout` subsections; the `Owning
module` cell of TDD-0015.
- Phase 4: `.qfai/specs/spec-0007/09_delta.md` DELTA-0002 and batch record —
  landing of 1 Triage row, co-changes, 3 drift lines.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0007 --format github
```

Run with the CLI built from this worktree's source. The counts below are read
from the run log the command names.

## Validate evidence paths

- Validate run id `run-20260924142959605`, scope `sdd, spec-0007`: pass, 0
  errors, 31 warnings. The warnings are the same findings as the run before the Reviewer Gate corrections; none is new.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ---------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                            | Input (refs)                                      | Output (refs)                                        | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table    | Pack REQ/NFR, active spec summaries               | `09_delta.md` `## Triage (2026-09-23 spec-to-story)` | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds         | Triage drafts rev 1 and rev 2                     | REVISE (F1–F5), then PASS with named fixes N1–N4     | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G3                                 | Phase 2 item plan for spec-0003, spec-0006, spec-0007 | Phase 2 plan brief, Triage, Phase 0 decisions     | G3 item plan (orchestrator scratchpad)               | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups            | Eight item plans                                  | Rulings X1–X14, node rulings, Q1–Q3                  | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G3                               | Phase 2 wave A: 01_Spec and 02–04                     | Write brief, plans, rulings                       | `01_Spec.md`, 04                                     | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G3                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger        | Wave A output                                     | 05, 06, `tdd/test-list.md`                           | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                    | Carry list, Phase 2 output                        | Contract corrections; OQ-0180 deferred               | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                            | Phase 2 items, contracts, plan template, source   | Elements, node rulings, P3-C1                        | PASS                         |
| 10   | solution-architect                                             | phase3-write-W1..W7                            | Phase 3: `10_Plan.md` and the `Owning module` cells   | Phase 3 rulings, write brief                      | `10_Plan.md`; ledger cell                            | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate                | Seven plans, P3-C2                                | 195 files conform; no new validate error             | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D2                                | Phase 4: delta record and this evidence               | Phase 4 brief, batch record, Phase 2c and 3 notes | `09_delta.md` DELTA-0002 and batch record; this file | PASS                         |

## Gaps / Open risks

- OQ-0180 is open until before the P7 cutover. Until it is answered, a
  migrated project lists no guardrail, and TC-0007-0012 cannot pass.
- US-0007-0001 and AC-0007-0001 still name `_policies/` as the source. Open.
- `QFAI-ATDD-112` fires for TC-0007-0012 until `/qfai-atdd` and
  `/qfai-implement` write its test in the same pull request (P3-C1).

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
