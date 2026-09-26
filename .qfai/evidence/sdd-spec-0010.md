# Evidence: /qfai-sdd (spec-0010)

## Objective

- Spec target: spec-0010
- Objective: make the paths spec-0010 cites follow the
  `rule/ skill/ agent/ prompt/` assistant tree, where
  `research-first-protocol.md` moves to `rule/`, in the batch run
  `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0017, REQ-0018.
- `.qfai/contracts/cli/qfai-init.md`, section The assistant tree.
- `.qfai/specs/spec-0010/01_Spec.md` to `06_Test-Cases.md`, `09_delta.md`,
  `10_Plan.md` and `tdd/test-list.md`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`,
  its step 1 and its `project_memory` block.
- The `qfai-sdd` delta and evidence templates, and
  `references/sdd-phase-checklists.md`.
- `.qfai/evidence/sdd-batch-20260923100952585.md`, the batch record.

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                           | Subject                                                                                                      | Operation | Sub-op | Approved By | Rationale                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0017, #REQ-0018 | `research-first-protocol.md` moves to `rule/`; the `project_memory` layer list and the `skill/` paths follow | UPDATE    | MODIFY | -           | Slice B, lands P6. Adopted (OQ-0177), with the P6 co-change list in `09_delta.md` |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0177: the placement of the merged assistant files — Disposition: resolved
- OQ-0186: the Triage row says the `project_memory` layer list follows the
  move, but the shipped block holds no layer list — Disposition: open

## Decisions made

- Phase 2 node ruling G6-10: the move is text only; no AC, BR, EX or TC
  changes, because no spec-0010 item names the protocol.
- Cross-group ruling X1: a path true before and after the rename is rewritten
  in place (`<paths.skillsDir>` in US-0010-0004 and US-0010-0005); otherwise
  the new path stands beside the current one.
- Phase 3: two source files and four asset tests move with the protocol.
- Phase 4 / this run's `09_delta.md` record: the landing list, the
  co-changes and the recorded drift; no decision beyond the rulings above.

## Work performed

- Phase 2: `01_Spec.md` Evidence Summary and Relevant Requirements;
  `02_User-stories.md` US-0010-0004 and US-0010-0005.
- Phase 3: `10_Plan.md` story-tree subsections.
- Phase 4: `.qfai/specs/spec-0010/09_delta.md`, section
  `2026-09-24 — Spec-to-story run`, and this file.
- Review cycle 1 fixes: `10_Plan.md` gains `## NFR approach`, stating how
  NFR-0001 to NFR-0003 are met and the test case whose failure measures each
  breach; `09_delta.md` records it.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0010 --format github
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- Validate run id `run-20260924142649375`, scope `--profile sdd --spec spec-0010`: fail, error=1,
  warning=30, info=4, after this cycle's fixes. The error is `QFAI-TDDLIST-017` on TC-0010-0006's four ledger rows, which
  predates this run and is in the batch's baseline. The warnings are the same as
  the run before these fixes, repository-wide, and none names this spec's files.

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

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                         | Input (refs)                                                                                             | Output (refs)                                     | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table | Pack REQ/NFR, active spec summaries                                                                      | `09_delta.md` § Triage (2026-09-23 spec-to-story) | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds      | Triage drafts rev 1 and rev 2                                                                            | REVISE (F1–F5), then PASS with named fixes N1–N4  | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G6                                 | Phase 2 item plan and open decisions for this spec | Phase 2 plan brief, Triage, Phase 0 decisions                                                            | Item plan (orchestrator scratchpad)               | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups         | Eight item plans                                                                                         | Rulings X1–X14, node ruling G6-10                 | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G6                               | Phase 2 wave A: 01_Spec and 02–04                  | Write brief, plans, rulings                                                                              | `01_Spec.md`, `02_User-stories.md`                | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                 | Carry list, Phase 2 output                                                                               | No change to this spec                            | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                         | Phase 2 items, contracts, plan template, source                                                          | Elements, node rulings, P3-C1                     | PASS                         |
| 10   | solution-architect                                             | phase3-write-W5                                | Phase 3: `10_Plan.md`                              | Phase 3 rulings, write brief                                                                             | `10_Plan.md`                                      | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate             | Seven plans, P3-C2                                                                                       | 195 files conform; no new validate error          | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D4                               | Phase 4: `09_delta.md` and this file               | Batch record, Phase 2c and Phase 3 notes                                                                 | `09_delta.md`, this file                          | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0010                 | Review pack `review-20260924014832174`; review rulings (completion-reviewer finding on the NFR approach) | spec-0010 `10_Plan.md`, `09_delta.md`; this file  | PASS                         |

Step numbers are the batch record's. Step 5 amended no row of this spec, and
step 7 wrote nothing here: no example, test case or ledger row changed.

## Gaps / Open risks

- The `project_memory` layer list the Triage row names does not exist in the
  shipped skill, and no row adds or drops it (OQ-0186).
- `QFAI-TDDLIST-017` on TC-0010-0006's four ledger rows predates this run and
  stays in the `sdd` gate's error count.
- A citation of `constitution/research-first-protocol.md` that survives the
  P6 move; the move, the two source readers and the repointed tests land in
  one change.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
