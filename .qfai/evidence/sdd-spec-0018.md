# Evidence: /qfai-sdd (spec-0018)

## Objective

- Spec target: spec-0018
- Objective: create the spec for `/qfai-migration-spec-to-story`, the skill
  whose ten step scripts move an adopter from spec packs to the story tree, in
  the batch run `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0018, REQ-0019,
  REQ-0020, REQ-0023, NFR-0001, NFR-0002, NFR-0003, NFR-0008, NFR-0010, story
  `DUS-006`.
- `.qfai/specs/_policies/03_Capabilities.md`, `.qfai/specs/_policies/10_delta.md`
  and `.qfai/specs/_policies/11_Slice-Policy.md`.
- `.qfai/contracts/cli/qfai-migration-spec-to-story.md`,
  `.qfai/contracts/cli/qfai-init.md` and `.qfai/contracts/cli/qfai-validate.md`.
- The `qfai-sdd` spec, evidence and delta templates, and
  `references/sdd-phase-checklists.md`.
- `.qfai/evidence/sdd-batch-20260923100952585.md`, the batch record.

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage table
  was persisted: ready, 24 REQ imported, no blockers and no pack gaps.

## Triage decisions

| Source                                                                                                                                                                                                                                                                          | Subject                                                                                                  | Operation | Sub-op | Approved By   | Rationale                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0019, discussion-20260923063306456#REQ-0020, discussion-20260923063306456#NFR-0001, discussion-20260923063306456#NFR-0002, discussion-20260923063306456#NFR-0003, discussion-20260923063306456#NFR-0008, discussion-20260923063306456#NFR-0010 | `spec-0018`: `/qfai-migration-spec-to-story`, migration steps 1–2, 4–6 and 8–10, and the migration guide | CREATE    | -      | yusuke_senaga | Slice A. `CAP-0018` maps to `spec-0018`. No active spec owns project migration, and the slice policy puts one skill in one spec |
| discussion-20260923063306456#REQ-0019, discussion-20260923063306456#REQ-0023                                                                                                                                                                                                    | Migration step 3: move catalog and manifest content into the five merged files, stating each fact once   | UPDATE    | APPEND | -             | Slice B                                                                                                                         |
| discussion-20260923063306456#REQ-0019                                                                                                                                                                                                                                           | Migration step 7: turn each EX's `BR-Ref` into BR-to-EX citations in the contract's form                 | UPDATE    | APPEND | -             | Slice B                                                                                                                         |
| discussion-20260923063306456#REQ-0018, discussion-20260923063306456#REQ-0019                                                                                                                                                                                                    | Migration step 1 renames `skills.local` to `skill.local`                                                 | UPDATE    | APPEND | -             | Slice A. Adopted (N11)                                                                                                          |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0170: how this repository migrates its own tree at the P7 cutover, which
  runs this skill — Disposition: open
- OQ-0172: how IDs are renumbered when a flow splits or reorders, outside this
  spec's scope — Disposition: open
- OQ-0176 and OQ-0177: the contract rule schema and the placement of the merged
  assistant files, which steps 3 and 7 depend on — Disposition: resolved

## Decisions made

- DR-0018-0001..0013 / DELTA-0001: the thirteen decisions in `07_Decisions.md`,
  recorded as DL-0001..0013 in `09_delta.md`. Each took the griller's
  recommendation in the Phase 2 grilling.
- Phase 2c settled the five gaps the Phase 2 writers reported, the overlap of
  the keyword rows with the origin-first Content rule, and a step 4 plan that
  disagrees with the ID map (exit 2). The user decided that the migration
  writes into a configured `paths.specsDir` or `paths.contractsDir` outside
  `.qfai/` (P2C-05b).
- Phase 3 settled the migration as package code with ten thin entry points, the
  export of `runMigrationStep` from the package's entry, and one shared loader
  (P3-D07 to P3-D09).
- Phase 4 applied a Phase 2c carry-over correction to this run's own items:
  BR-0018-0027, and EX-0018-0035 and TC-0018-0035 with it, name
  `<paths.contractsDir>/tech.md` where they named `03_contract/tech.md`, as
  Phase 2c settled. The plan's references still hold; `09_delta.md` §
  Corrections to this run's own items records it.
- Review cycle 1: user answer U2 adds to BR-0018-0058 that 2.x does not read
  the spec-pack layout, carried into AC-0018-0027, EX-0018-0072, TC-0018-0072
  and the plan's P5 step.

## Work performed

- Created `.qfai/specs/spec-0018/` 01 to 10 and `tdd/test-list.md`: 10 US,
  27 AC, 60 BR, 82 EX, 82 TC, 94 ledger rows at `todo`, 13 decision records and
  the plan. The BR, EX, TC and ledger totals include the cycle-2 work-log
  re-key cases.
- Created `.qfai/contracts/cli/qfai-migration-spec-to-story.md`, which Phase 0
  decided (N14), and corrected it in Phase 2c.
- Filled `.qfai/specs/spec-0018/09_delta.md` from its template: Change Summary,
  Update History, DL-0001..0013, rationale, candidates, landing, co-changes,
  recorded drift and the gaps settled in Phase 2c.
- Wrote this file.
- Review cycle 1 fixes:
  - `06_Test-Cases.md` "How `Level` was derived" matches the plan: in
    process through `runStep`, and the four entry-point cases spawn the
    script.
  - US-0018-0004 Notes name `<paths.contractsDir>/`.
  - The two drift entries these close are dropped from `09_delta.md`
    Follow-ups.
  - `10_Plan.md` lists `qfai-migration-spec-to-story.md` as element 4 with
    its usages.
  - BR-0018-0058, AC-0018-0027, EX-0018-0072, TC-0018-0072 and the plan's P5
    step carry the U2 statement.
- Review cycle 2: D13 adds BR-0018-0060, EX-0018-0081 and 0082,
  TC-0018-0081 and 0082, and TDD-0093 and 0094 for step 4's work-log re-key.
  EX-0018-0081 covers all four re-keyed fields, both YAML list forms,
  unmappable values and unaffected values. The plan orders the re-key before
  the P7 work-log reader change and places element 4 after element 3.
- Implementation clarification: the CLI contract fixes the minimal
  `plan.yaml` shape, the old-flow H2 selector and its reserved unnamed-flow
  value, explicit AC ownership only where ambiguous, and prewrite refusal of
  invalid schema, assignments and paths. BR-0018-0004, 0031, 0032 and 0034,
  EX/TC-0018-0005, 0040, 0041 and 0077, and `10_Plan.md` use the same
  behavior. Step 9 preserves occupied user-owned host paths with exit 3 and
  refuses inspection failure before writing with exit 2; BR-0018-0053 and
  EX/TC-0018-0067 cover both cases.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0018 --format github
npx qfai validate --profile sdd --fail-on error --spec spec-0018 --format text
node packages/qfai/assets/scripts/check-mdschema.mjs --scope all
node 'C:\Users\pc\AppData\Local\Temp\claude\C--Users-pc-Documents-GitHub-QFAI--claude-worktrees-qfai-specs-restructure-ec45fd\f0bdcc77-8dc1-4976-973b-d9ca34906cef\scratchpad\cli\index.cjs' validate --profile sdd --fail-on error --spec spec-0018 --format text
```

The `github` run is the template's command. The `text` run gives the
per-severity counts recorded below; both report the same findings.

## Validate evidence paths

- After D13, bundled-CLI text run `run-20260924154454851` exited 1:
  error=1, warning=30, info=4. The sole error is the repository-wide
  `TRACE_SHARED_SCOPE_VIOLATION` on `_policies/10_delta.md` for
  `BR-0004-0081`; it is outside spec-0018.
- After the shared policy delta was corrected, text run
  `run-20260924154622725` passed: error=0, warning=30, info=4.
- Validate run ids `run-20260924143044240` (`--format github`) and
  `run-20260924143018995` (`--format text`), scope `sdd` profile,
  `--spec spec-0018`, after the review-cycle 1 fixes: passed, 0 errors,
  30 warnings. It raised the same findings as the Phase 4 run
  `run-20260924101213380`. One names this spec: `QFAI-TRACE-002`, because the spec has no optional
  `16_Traceability-ledger.md`. The other 29 are repository-wide findings about
  worklog links, `_policies` triage rows, the sample `DESIGN.md` and host links.
- `check-mdschema --scope all`: 195 files conform.

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

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                                         | Input (refs)                                    | Output (refs)                                                                | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table                 | Pack REQ/NFR, active spec summaries             | `09_delta.md` § Triage (2026-09-23 spec-to-story)                            | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds                      | Triage drafts rev 1 and rev 2                   | REVISE (F1–F5), then PASS with named fixes N1–N4                             | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G2                                 | Phase 2 item plan and open decisions for this spec                 | Phase 2 plan brief, Triage, Phase 0 decisions   | Item plan (orchestrator scratchpad)                                          | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups                         | Eight item plans                                | Rulings X1–X14, node rulings G2-2 to G2-4                                    | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G2                               | Phase 2 wave A: 01_Spec and 02–04, and 07_Decisions                | Write brief, plans, rulings                     | `01_Spec.md`, `02`–`04`, `07_Decisions.md`                                   | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G2                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger                     | Wave A output                                   | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                     | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                                 | Carry list, Phase 2 output                      | Migration contract corrections, gap settlements, EX/TC pairs and ledger rows | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                                         | Phase 2 items, contracts, plan template, source | Elements, node rulings P3-D07 to P3-D09, P3-C1                               | PASS                         |
| 10   | solution-architect                                             | phase3-write-W7                                | Phase 3: `10_Plan.md` and the `Owning module` cells                | Phase 3 rulings, write brief                    | `10_Plan.md`, ledger `Owning module` cells                                   | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate                             | Seven plans, P3-C2                              | 195 files conform; no new validate error                                     | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D5                               | Phase 4: `09_delta.md`, the BR-0018-0027 wording fix and this file | Batch record, Phase 2c and Phase 3 notes        | `09_delta.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`  | PASS                         |
| 266  | requirements-analyst                                           | review2-fix-Y                                 | Apply D13 to work-log re-key                         | Review pack `review-20260924053652061`; D13    | spec-0018 BR, EX, TC, ledger, plan, delta; this file                  | PASS                         |

Step numbers are the batch record's; step 5 amended no row of this spec.

## Gaps / Open risks

- The drift recorded in `09_delta.md` § Follow-ups: BR-0018-0003 against the
  loader's resolution from the script location.
- TDD-0039, TDD-0067, TDD-0068, TDD-0091 and TDD-0092 cannot go green before
  P6 lands.
- The ten E2E ledger rows raise `QFAI-ATDD-111` under `tdd` and `full` until
  `/qfai-atdd` writes the journey test, inside the P2–P8 pull request (P3-C1).

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate returned REVISE in cycle 1. Its fixes for this
  spec are applied; the gate has not re-run.
