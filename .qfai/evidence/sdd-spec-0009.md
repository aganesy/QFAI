# Evidence: /qfai-sdd (spec-0009)

## Objective

- Spec target: spec-0009
- Objective: state what `/qfai-configure` does on the story tree and with the
  `rule/ skill/ agent/ prompt/` assistant tree — `paths.specsDir` written when
  absent, the five merged policy and contract files, and routing and
  review-profile overrides in `qfai.config.yaml` — in the batch run
  `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0001, REQ-0002,
  REQ-0005, REQ-0016, REQ-0023.
- `.qfai/contracts/cli/qfai-init.md`, sections The spec tree and
  Configuration.
- `.qfai/specs/spec-0009/01_Spec.md` to `06_Test-Cases.md`, `09_delta.md`,
  `10_Plan.md` and `tdd/test-list.md`.
- `.qfai/specs/spec-0015/04_Business-Rules.md` (BR-0015-0019, BR-0015-0020),
  which the override rule depends on.
- The `qfai-sdd` delta and evidence templates, and
  `references/sdd-phase-checklists.md`.
- `.qfai/evidence/sdd-batch-20260923100952585.md`, the batch record.

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                                      | Subject                                                                             | Operation | Sub-op | Approved By | Rationale                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------- | ------ | ----------- | -------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001                       | `/qfai-configure` writes `paths.specsDir: .qfai/spec` for a new-layout project      | UPDATE    | APPEND | -           | Slice A                                                        |
| discussion-20260923063306456#REQ-0002, #REQ-0005, #REQ-0023 | Configure refreshes the `01_policy` and `03_contract` files, stating each fact once | UPDATE    | MODIFY | -           | Slice B, lands P7 (P4 merged into cutover). Depends on OQ-0170 |
| discussion-20260923063306456#REQ-0016                       | Configure writes the project's overrides to `qfai.config.yaml`                      | UPDATE    | MODIFY | -           | Slice B, lands P6, with the P6 co-change list in `09_delta.md` |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0170: how this repository migrates its own tree at the P7 cutover, which
  the P7 row depends on — Disposition: open
- OQ-0177: the placement of the merged assistant files — Disposition: resolved

## Decisions made

- Phase 2 node rulings G6-1 to G6-5: `paths.specsDir` written only when
  absent; the new criteria attach to US-0009-0002; AC-0009-0003 absorbs two
  rows in one MODIFY; the five merged files replace the four catalog files;
  overrides as a top-level `routing:` list and `reviewProfiles:` map, each
  entry whole.
- Cross-group rulings X1 to X3: a layout-conditioned target clause beside the
  current one; existing test cases keep their text until landing; no removal
  now.
- Phase 2c: `tech.md` and `structure.md` follow `paths.contractsDir`
  (BR-0009-0008); the override keys stated in the init contract's
  Configuration section.
- Phase 3: the change is skill text only, in two steps, P6 and P7; test
  oracles read a product artifact (P3-D11).
- Phase 4 / this run's `09_delta.md` record: the landing list, the
  co-changes and the recorded drift; no decision beyond the rulings above.
- Review rulings applied in cycle 1: D2 (one ledger row per rejection); the
  `<paths.contractsDir>` form follows the Phase 2c settlement BR-0009-0008
  already states.

## Work performed

- Phase 2: `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` and
  `tdd/test-list.md` — AC-0009-0008, BR-0009-0006 to BR-0009-0008,
  EX-0009-0006 to EX-0009-0008, TC-0009-0010 to TC-0009-0015, TDD-0015 to
  TDD-0020.
- Phase 3: `10_Plan.md` story-tree subsections and the `Owning module` cells.
- Phase 4: `.qfai/specs/spec-0009/09_delta.md`, section
  `2026-09-24 — Spec-to-story run`, and this file.
- Review cycle 1 fixes:
  - `01_Spec.md`, US-0009-0003, AC-0009-0004 and TC-0009-0014 write
    `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md`;
    EX-0009-0008's Given states the default `paths.contractsDir`
  - TC-0009-0010 to 0015 gain `- Level: integration`
  - `tdd/test-list.md`: TDD-0020 gains a `Boundary` slug, and TDD-0021 and
    TDD-0022 are added at `todo`, one row per rejection of TC-0009-0015
    (review ruling D2)
  - `10_Plan.md` and `09_delta.md` name the three rows and their oracles

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0009 --format github
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- Validate run id `run-20260924142646728`, scope `--profile sdd --spec spec-0009`: pass, error=0,
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

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                              | Output (refs)                                                                       | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries                       | `09_delta.md` § Triage (2026-09-23 spec-to-story)                                   | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                             | REVISE (F1–F5), then PASS with named fixes N1–N4                                    | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G6                                 | Phase 2 item plan and open decisions for this spec  | Phase 2 plan brief, Triage, Phase 0 decisions             | Item plan (orchestrator scratchpad)                                                 | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                          | Rulings X1–X14, node rulings G6-1 to G6-5                                           | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G6                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plans, rulings                               | `01_Spec.md`, `02`–`04`                                                             | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G6                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                             | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                            | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                                | Init contract override keys; BR-0009-0008 path settlement                           | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source           | Elements, node rulings, P3-C1                                                       | PASS                         |
| 10   | solution-architect                                             | phase3-write-W5                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                              | `10_Plan.md`, ledger `Owning module` cells                                          | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                        | 195 files conform; no new validate error                                            | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D4                               | Phase 4: `09_delta.md` and this file                | Batch record, Phase 2c and Phase 3 notes                  | `09_delta.md`, this file                                                            | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0009                  | Review pack `review-20260924014832174`; review rulings D2 | spec-0009 01–03, 05, 06, `tdd/test-list.md`, `10_Plan.md`, `09_delta.md`; this file | PASS                         |

Step numbers are the batch record's; step 5 amended no row of this spec.

## Gaps / Open risks

- The drift recorded in `09_delta.md`: EX-0009-0003 names a `steering/`
  path no layout has.
- `01_Spec.md` Evidence Summary and the `Owning module` cells of TDD-0015 to
  TDD-0022 name the `skills/` path, which the P6 rename commit repoints.
- The P7 steering text must land with the file moves that create the five
  merged files, or the skill names files the tree does not hold yet.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
