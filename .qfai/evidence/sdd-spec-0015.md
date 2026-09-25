# Evidence: /qfai-sdd (spec-0015)

## Objective

- Spec target: spec-0015
- Objective: state the agent and routing surface of the
  `rule/ skill/ agent/ prompt/` assistant tree — the card frontmatter as the
  only agent definition, routing and review-profile defaults built into the package with
  whole-entry overrides in `qfai.config.yaml`, decision records under
  `.qfai/evidence/decision/`, the migration skill's routing entry — and record <!-- qfai:not-a-citation -->
  the approved removal of the review-gate bound, in the batch run
  `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0012, REQ-0016,
  REQ-0017, REQ-0018, REQ-0019, NFR-0010.
- `.qfai/contracts/cli/qfai-init.md`, sections Configuration and The
  assistant tree; `.qfai/contracts/cli/qfai-migration-spec-to-story.md`.
- `.qfai/specs/spec-0015/01_Spec.md` to `06_Test-Cases.md`, `09_delta.md`,
  `10_Plan.md` and `tdd/test-list.md`.
- `packages/qfai/src/core/validators/agentDefinition.ts`, which reports
  `QFAI-AGENT-001` to `QFAI-AGENT-003` for missing manifest files.
- The `qfai-sdd` delta and evidence templates, and
  `references/sdd-phase-checklists.md`.
- `.qfai/evidence/sdd-batch-20260923100952585.md`, the batch record.

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage table
  was persisted: ready, 24 REQ imported, no blockers and no pack gaps.

## Triage decisions

| Source                                           | Subject                                                                                                                                          | Operation | Sub-op | Approved By   | Rationale                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | ------------- | ---------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0016            | Built-in routing and review defaults; `qfai.config.yaml` overrides replace the matching entry; the card frontmatter is the only agent definition | UPDATE    | MODIFY | -             | Slice B, lands P6, with the P6 co-change list in `09_delta.md`                     |
| discussion-20260923063306456#REQ-0017            | Constitution files and the shared baselines move to `rule/`                                                                                      | UPDATE    | MODIFY | -             | Slice B, lands P6, with the P6 co-change list in `09_delta.md`                     |
| discussion-20260923063306456#REQ-0018, #NFR-0010 | Decision records under `.qfai/evidence/decision/` stay tracked and listed by the audit log <!-- qfai:not-a-citation -->                          | UPDATE    | MODIFY | -             | Slice B, lands P6                                                                  |
| discussion-20260923063306456#REQ-0012            | Approval references point to `decisions.md`                                                                                                      | UPDATE    | MODIFY | -             | Slice C. Depends on OQ-0170                                                        |
| discussion-20260923063306456#REQ-0019            | Routing entry for `/qfai-migration-spec-to-story`                                                                                                | UPDATE    | APPEND | -             | Slice A; lands P5                                                                  |
| discussion-20260923063306456#REQ-0016, #REQ-0017 | Remove the `review-gate.rules.yml` bound and the handling of an adopter's `review-profiles.yml`                                                  | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the built-in defaults. OQ-0177 resolved "removed", so the row stands |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0170: how this repository migrates its own tree at the P7 cutover, which
  the REQ-0012 row depends on — Disposition: open
- OQ-0177: the placement of the merged assistant files, and that
  `review-gate.rules.yml` is removed — Disposition: resolved
- OQ-0181: what becomes of `QFAI-AGENT-001` to `QFAI-AGENT-003` once no
  project holds a manifest file — Disposition: open, for the validate contract
- OQ-0187: `CLI-AUDIT` is indexed but its contract file is not tracked —
  Disposition: open
- OQ-0184: whether CR-20260913-0007 closes when the REMOVE row retires the
  part of its scope it still waits on — Disposition: open

## Decisions made

- DL-0002 / DELTA-0002 in `09_delta.md`: routing and review-profile defaults
  live in the package, and an override replaces a default entry whole; the
  card frontmatter is the only agent definition.
- Phase 2 node rulings: `mission` as a key of its own (G6-7, griller ruling
  (b)); whole-entry overrides with unmatched entries added (G6-5); optional
  review modes not overridable (G6-6); the architecture-heavy routing entry
  for the migration skill (G6-8); approval links recorded now and rewritten
  at P7 (G6-9); AC-0015-0023 under US-0015-0001 (G6-11); AC-0015-0009 retired
  whole at P6, its test cases re-pointed at landing (G6-12, X2).
- Phase 3 node P3-D01: the defaults ship under `packages/qfai/assets/defaults/`,
  found through `getInitAssetsDir()`; `rule/agent-selection.md` states the
  path once; the shipping lint scans the new root.
- Review cycle 1: ruling D2 (one ledger row per check for TC-0015-0038),
  ruling D7 (AC-0015-0024 is an exception to X1, adopted), and user answer
  U3 (a local install is a precondition; an agent that cannot find the
  package stops and names the install command).
- Phase 4 / this run's `09_delta.md` record: the landing list, the REMOVE
  retirement list, the co-changes and the recorded drift.

## Work performed

- Phase 2: `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` and
  `tdd/test-list.md` — AC-0015-0023 and AC-0015-0024, BR-0015-0018 to
  BR-0015-0021, EX-0015-0019 to EX-0015-0022, TC-0015-0037 to TC-0015-0043,
  TDD-0054 to TDD-0060.
- Phase 3: `10_Plan.md` story-tree subsections and the `Owning module` cells.
- Phase 4: `.qfai/specs/spec-0015/09_delta.md` — DELTA-0002, the Update
  History row, DL-0002 and section `2026-09-24 — Spec-to-story run` — and
  this file, which replaces the record of the earlier cycle.
- Review cycle 1 fixes:
  - TC-0015-0038 restated per planted violation, each naming its check, and
    split into TDD-0055, TDD-0061, TDD-0062 and TDD-0063 (ruling D2).
  - TDD-0060 owned by `packages/qfai/assets/defaults/agent-routing.yml`.
  - `10_Plan.md` gains the local-install precondition and the README change
    as P6 co-changes, with a risk row (user answer U3).
  - `09_delta.md` records AC-0015-0024 as an adopted exception to X1 (ruling
    D7), the split, and the co-changes.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0015 --format github
npx qfai validate --profile sdd --fail-on error --spec spec-0015 --format text
```

The `github` run is the template's command. The `text` run gives the
per-severity counts recorded below; both report the same findings.

The CLI was the one built from this branch's source, not a published copy.

## Validate evidence paths

- Validate run ids `run-20260924143032661` (`--format github`) and
  `run-20260924143013885` (`--format text`), scope `sdd` profile,
  `--spec spec-0015`, after the review-cycle 1 fixes: passed, 0 errors,
  30 warnings, 4 info. No finding is new against the Phase 4 run
  `run-20260924101434130`; the warnings are repository-wide (work-log links,
  triage-to-policies notices, the host-link warning, the sample brand, the
  optional traceability ledger) and none names this spec's files.

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

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                    | Output (refs)                                            | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries             | `09_delta.md` § Triage (2026-09-23 spec-to-story)        | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                   | REVISE (F1–F5), then PASS with named fixes N1–N4         | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G6                                 | Phase 2 item plan and open decisions for this spec  | Phase 2 plan brief, Triage, Phase 0 decisions   | Item plan (orchestrator scratchpad)                      | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                | Rulings X1–X14, node rulings G6-5 to G6-12               | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G6                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plans, rulings                     | `01_Spec.md`, `02`–`04`                                  | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G6                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                   | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md` | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                      | Init contract override keys                              | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source | Elements, node ruling P3-D01, P3-C1                      | PASS                         |
| 10   | solution-architect                                             | phase3-write-W5                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                    | `10_Plan.md`, ledger `Owning module` cells               | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                              | 195 files conform; no new validate error                 | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D4                               | Phase 4: `09_delta.md` and this file                | Batch record, Phase 2c and Phase 3 notes        | `09_delta.md`, this file                                 | PASS                         |

Step numbers are the batch record's; step 5 amended no row of this spec.

## Gaps / Open risks

- The drift recorded in `09_delta.md`: `QFAI-AGENT-001` to `QFAI-AGENT-003`
  after P6 (OQ-0181); the untracked `CLI-AUDIT` contract (OQ-0187);
  CR-20260913-0007's open `Applied at` (OQ-0184).
- 13 `Owning module` cells name paths the P6 rename moves or removes.
- A project that runs QFAI only through `npx qfai@latest` has no routing
  defaults an agent can read after P6; the plan's risk row carries it.
- Cards and skills lose the routing if any still cites a manifest file after
  P6; `rule/agent-selection.md` states the defaults path once.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate returned REVISE in cycle 1. Its fixes for this
  spec are applied; the gate has not re-run.
