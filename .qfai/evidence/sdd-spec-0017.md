# Evidence: /qfai-sdd (spec-0017)

## Objective

- Spec target: spec-0017
- Objective: make the repository toolchain follow the story-tree change — the
  assistant-tree mirror covering the renamed `rule/ skill/ agent/ prompt/`
  directories, the lane map merged into `rule/test-layers.md`, and the shape
  table moving in the same pull request as the leak guards — in the batch run
  `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0017, REQ-0018,
  REQ-0024, NFR-0004, NFR-0009.
- `.qfai/contracts/cli/qfai-init.md`, section The assistant tree.
- `.agents/rules/distributed-surface.local.md` and the clause list
  `packages/qfai/tests/integration/agentsRulesSurface.test.ts` holds for it.
- `scripts/link-assistant-tree.mjs` and
  `packages/qfai/src/core/assistantAssetProvenance.ts`.
- `.qfai/specs/spec-0017/01_Spec.md` to `06_Test-Cases.md`, `09_delta.md`,
  `10_Plan.md`, `16_Traceability-ledger.md` and `tdd/test-list.md`.
- The `qfai-sdd` delta and evidence templates, and
  `references/sdd-phase-checklists.md`.
- `.qfai/evidence/sdd-batch-20260923100952585.md`, the batch record.

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage table
  was persisted: ready, 24 REQ imported, no blockers and no pack gaps.

## Triage decisions

| Source                                                      | Subject                                                                                            | Operation | Sub-op | Approved By | Rationale                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0017, #REQ-0018, #NFR-0009 | `pnpm sync:ssot` covers the renamed tree; the layer-to-CI-lane mapping document leaves `catalog/`  | UPDATE    | MODIFY | -           | Slice B, lands P6. The spec owns exactly CAP-0017, so no SPLIT. P6 co-change list in `09_delta.md` |
| discussion-20260923063306456#REQ-0024, #NFR-0004            | The shape table in `.agents/rules/distributed-surface.local.md` moves in the same PR as the guards | UPDATE    | MODIFY | -           | Slice A; this spec's NFR-0005 governs moving the pattern set in one PR                             |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0177: the lane map merges into `rule/test-layers.md` — Disposition:
  resolved
- OQ-0182: `scripts/link-assistant-tree.mjs` throws once P7 empties
  `catalog/`, and no item covers it — Disposition: open

## Decisions made

- DELTA-0002 in `09_delta.md`: the change summary of this run.
- Phase 2 node ruling G6 C1: the lane map merges into `rule/test-layers.md` as
  a MODIFY; BR-0017-0063 is restated rather than removed; OC-76's placement
  clause is amended in `_policies`.
- Phase 2 node rulings G6-13 and G6-14: the overlay suite pins one token per
  new shape; two new stories.
- Phase 2 question Q1, answered by the user: the `QFAI-TRACE-001` findings the
  03 and 04 edits raise are pinned in `scripts/dogfood-backlog.json` as a
  one-off exception.
- Phase 3 escalations P3-C2 and P3-C3, answered by the user: the shape table
  lands with the guards in a P1 pull request of its own; the memo exception is
  removed in a third pull request.
- Phase 4 / this run's `09_delta.md` record: the landing list, the co-changes
  and the recorded drift; no decision beyond the rulings above.
- Review cycle 1: ruling D9 withdraws TC-0017-0096 and TDD-0105, and moves the
  smoke scan into a test helper; P3-C2 is recorded as the authority for the
  P1 pull request's reading of NFR-0005.

## Work performed

- Phase 2: `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` and
  `tdd/test-list.md` — US-0017-0010 and US-0017-0011, AC-0017-0037 and
  AC-0017-0038, BR-0017-0070 to BR-0017-0072, EX-0017-0071 to EX-0017-0073,
  TC-0017-0093 to TC-0017-0096, TDD-0102 to TDD-0107; TC-0017-0096 and
  TDD-0105 were later withdrawn under D9.
- Phase 3: `10_Plan.md` story-tree subsections and the `Owning module` cells.
- Phase 4: `.qfai/specs/spec-0017/09_delta.md` — DELTA-0002 and section
  `2026-09-24 — Spec-to-story run` — and this file, which replaces the record
  of the earlier cycle.
- `.qfai/evidence/atdd-spec-0017.md`, lines 25 to 31: the ledger counts it
  states were brought to the current ledger after this run appended TDD-0102
  to TDD-0107, because `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`
  compares those counts with the ledger. The same lines now say which rows
  that stage reviewed and which this run appended. They were edited again
  when TDD-0105 was withdrawn: 106 rows, 84 `Integration`, 11 `Unit`;
  81 `refactor`, 6 `blocked`, 19 `todo`.
- Review cycle 1 fixes:
  - TC-0017-0096 and its ledger row TDD-0105 withdrawn (ruling D9). The
    `agentsRulesSurface.test.ts` token block is still written in P1, under
    `.agents/rules/root-additions-policy.local.md` step 4, and the plan cites
    that step. `06_Test-Cases.md` Coverage summary restated for 95 cases.
  - The P1 step names `packages/qfai/tests/helpers/distributedSurfaceScan.ts`
    as where the smoke test's pattern set lives, in the table of guards.
  - The NFR approach records P3-C2 as the authority for reading NFR-0005's
    "zero template edits" as nothing beyond re-spelling IDs in the P1 pull
    request.
  - The `QFAI-TRACE-001` pin risk row names its six keys and counts, the Q1
    exception, and the re-pin when a keyed file changes.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0017 --format github
npx qfai validate --profile sdd --fail-on error --spec spec-0017 --format text
```

The `github` run is the template's command. The `text` run gives the
per-severity counts recorded below; both report the same findings.

The CLI was the one built from this branch's source, not a published copy.

## Validate evidence paths

- Validate run ids `run-20260924143038229` (`--format github`) and
  `run-20260924143016419` (`--format text`), scope `sdd` profile,
  `--spec spec-0017`, after the review-cycle 1 fixes: passed, 0 errors,
  29 warnings, 4 info. No finding is new against the Phase 4 run
  `run-20260924101452119`; the warnings are repository-wide (work-log links,
  triage-to-policies notices, the host-link warning, the sample brand) and none
  names this spec's files.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | -------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

Each row reads `run` for its pre-draft session. Phase 3's P3-C2 and P3-C3
were settled after the first draft and applied in consolidation. Phases 0 and
1 ran once for the batch and are in the batch record.

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                    | Output (refs)                                                  | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries             | `09_delta.md` § Triage (2026-09-23 spec-to-story)              | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                   | REVISE (F1–F5), then PASS with named fixes N1–N4               | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G6                                 | Phase 2 item plan and open decisions for this spec  | Phase 2 plan brief, Triage, Phase 0 decisions   | Item plan (orchestrator scratchpad)                            | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                | Rulings X1–X14, node rulings G6 C1, G6-13, G6-14, Q1           | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G6                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plans, rulings                     | `01_Spec.md`, `02`–`04`                                        | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G6                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                   | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`       | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                      | `catalog/` holding the four seeds unreported between P6 and P7 | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source | Elements, node rulings, P3-C1                                  | PASS                         |
| 10   | solution-architect                                             | phase3-write-W5                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                    | `10_Plan.md`, ledger `Owning module` cells                     | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                              | 195 files conform; no new validate error                       | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D4                               | Phase 4: `09_delta.md` and this file                | Batch record, Phase 2c and Phase 3 notes        | `09_delta.md`, this file                                       | PASS                         |

Step numbers are the batch record's; step 5 amended no row of this spec.

## Gaps / Open risks

- The `QFAI-TRACE-001` pin is not in `scripts/dogfood-backlog.json` yet. It
  is a co-change of the P2 to P8 pull request, shared with spec-0014; until
  it lands, the `tdd` and `full` dogfood lanes each report 13 findings, nine
  of them on files this spec's ledger links.
- The drift recorded in `09_delta.md`: the P7 throw in
  `scripts/link-assistant-tree.mjs` (OQ-0182); the size signal of 38 criteria and 95
  cases.
- A stale plural link passes `--check` today, because the check skips
  symbolic links; TC-0017-0094 plants one.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate returned REVISE in cycle 1. Its fixes for this
  spec are applied; the gate has not re-run.
