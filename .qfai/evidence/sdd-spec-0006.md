# Evidence: /qfai-sdd (spec-0006)

## Objective

- Spec target: spec-0006
- Objective: point the two prose lines that cite deleted `.qfai/steering/`
  entries at where their content is already recorded. No US, AC, BR, EX, TC or
  ledger row changes. This run is one target of the batch recorded in
  `.qfai/evidence/sdd-batch-20260923170018664.md`.

## Inputs reviewed

- Discussion pack `discussion-20260923060900824` (REQ-0014), read as reference
  input. The discussion tree is not tracked, so this names the session rather
  than a file to open.
- `.qfai/evidence/sdd-batch-20260923170018664.md`
- `.qfai/specs/spec-0006/07_Decisions.md`, `09_delta.md`, `tdd/test-list.md`
- `.qfai/evidence/implement-spec-0006.md`, the ruling "`TDD-0039` escalates to
  T2"
- `.qfai/decisions/CR-20260818-0002-a-declined-only-tree-is-told-its-workflows-match.md`

## Preflight summary path

- Preflight run id `run-20260923170018664`: ready, 17 imported requirements,
  no blockers. Stage 1 Triage was taken against this run.
- Preflight run id `run-20260923172043151`, the latest: ready, 17 imported
  requirements, no pack gaps. Its summary differs from the earlier run's only
  in the run id.

## Triage decisions

| Source                                | Subject                                                                                                     | Operation | Sub-op | Approved By | Rationale                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------------------- |
| discussion-20260923060900824#REQ-0014 | Rewrite the `.qfai/steering/` entry paths in the `tdd/test-list.md` notes and the CHG-007 carry-over bullet | UPDATE    | MODIFY | -           | Prose only; no US, AC, BR, EX, TC or ledger row changes |

The table with its full rationale is `## Triage (2026-09-23)` in
`.qfai/specs/spec-0006/09_delta.md`.

## Open questions

- none

## Decisions made

Each is a `DR-*` in `07_Decisions.md` and a `DL-*` in `09_delta.md`, adopted
from the Phase 2 griller's recommendation.

- DR-0006-0006 / DL-0001: the ledger note names the ruling in
  `.qfai/evidence/implement-spec-0006.md`, and the carry-over bullet names
  `CR-20260818-0002` — both targets already exist, so the Triage row's
  rationale stays as written.
- DR-0006-0007 / DL-0002: `/qfai-sdd` rewrites the ledger note at Phase 2b and
  the delta bullet at Phase 4 — the prose is upstream of `/qfai-implement`.
- DR-0006-0008 / DL-0003: only the changed first line of the carry-over bullet
  is rewritten, in English — its continuation does not change.
- DR-0006-0009 / DL-0004: TDD-0037's `Evidence` cell keeps its work-log phrase,
  and no rewrite goes to `/qfai-implement` — the cell ends with an anchor into
  `.qfai/evidence/implement-spec-0006.md`, which holds the moved content. Taken
  in the Reviewer Gate fix by `test-design-analyst`, without a pre-draft
  grilling round, and adjudicated by cycle 2 (A2-DEC).
- Recorded in this file only, because it fixes nothing in the spec pack: P3-D1
  (the usage-reference check counts only what this change adds). No decision
  of Phase 2c or Phase 3 binds this spec, so `07_Decisions.md` and
  `09_delta.md` gain nothing from those phases.

## Work performed

- `.qfai/specs/spec-0006/tdd/test-list.md` (Phase 2b): the Tiers note names
  the ruling "`TDD-0039` escalates to T2" in
  `.qfai/evidence/implement-spec-0006.md`. Ledger rows: 50 before, 50 after.
- `.qfai/specs/spec-0006/09_delta.md`: the first line of the carry-over bullet
  in the CR-20260810-0001 section names `CR-20260818-0002`. This Phase 4 pointer
  was written during Phase 2, by the Phase 2b author (Work Orders step 4),
  against DR-0006-0007's phase assignment. The Phase 2b and Phase 4 edits to
  `09_delta.md` have one owner, and the pointer is one line whose text no later
  phase changes, so writing it early changed nothing downstream. The `Evidence`
  cell of TDD-0037 is not touched.
- `.qfai/specs/spec-0006/09_delta.md`: `## Decision Log` DL-0001 to DL-0003.
- `.qfai/specs/spec-0006/07_Decisions.md`: DR-0006-0006 to DR-0006-0008.
- Phase 2c: nothing to reconcile. This run added or changed no BR or AC in this
  spec (`## Triage (2026-09-23)` in `09_delta.md`).
- Phase 3: `10_Plan.md` is unchanged. The plan never names the work-log
  surface, and this run's triage changes prose only.
- Critical Constraint 10: no finding. The plan gains nothing, so no
  architectural element is introduced. The earlier sections were finalized by
  the runs that introduced them and were not re-audited (P3-D1).
- Phase 4: the carry-over bullet rewrite above is this phase's pointer
  (DR-0006-0007), written ahead of the phase. `09_delta.md` also gains a
  `## Update History` row for each of DL-0001 to DL-0003, and entry DELTA-0002
  inside the existing
  `## Change Summary`. The Triage row and the dated history stay as written. No
  `## Change Requests` row: the change record is the approved Triage set
  (P1-D5). Phase 4 settles no design decision, so no grilling row.
- Test-design review fix, cycle 1 (`test-design-analyst`, `tda-reviewfix`):
  the handling of TDD-0037's `Evidence` cell is confirmed, and the cell is
  unchanged (DR-0006-0009, DL-0004). No case or ledger row changed. Ledger:
  50 rows before and after.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- none. This run added or changed no BR or AC in this spec.
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract, and nothing under `.qfai/contracts/` declares a `CON-API-*` or
  `CON-DB-*`. This phase wrote no contract, so its scope did not re-expand.

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0006 --format text
npx prettier --write .qfai/specs/spec-0006/07_Decisions.md .qfai/specs/spec-0006/09_delta.md .qfai/specs/spec-0006/tdd/test-list.md
npx markdownlint-cli2 .qfai/specs/spec-0006/07_Decisions.md .qfai/specs/spec-0006/09_delta.md .qfai/specs/spec-0006/tdd/test-list.md
npx prettier --write .qfai/specs/spec-0006/09_delta.md
node scripts/check-mdschema.mjs --scope all
node scripts/check-mermaid.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0006 --format text
```

## Validate evidence paths

- Validate run id `run-20260923183927176`, scope `sdd` on spec-0006: fail, 2
  errors, 29 warnings. Both errors are `QFAI-TDDLIST-017` on TC-0006-0029 and
  TC-0006-0030, whose sibling rows name no `Boundary`. They were present before
  this run, and this run changes no ledger row.
- Validate run id `run-20260923191419041`, scope `sdd` on spec-0006, after
  Phase 2c and Phase 3: fail, 2 errors, 29 warnings, 4 info. The errors are the
  same two `QFAI-TDDLIST-017`, and no finding is new.
- Validate run id `run-20260923193803249`, scope `sdd` on spec-0006, after Phase 4:
  fail, 2 errors, 29 warnings, 4 info. The errors are the same two
  `QFAI-TDDLIST-017`, and no finding is new. The whole-repository run is in the
  batch record.
- Final run `run-20260923214113936`, scope `sdd`, whole repository,
  after the Reviewer Gate closed: 15 errors repository-wide, all pinned and
  pre-existing. This spec's files carry 2 errors, both the pinned `QFAI-TDDLIST-017` and 4 warnings. Details in the batch record.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                                                                                                     | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------- |
| 2     | run     | 2026-09-23T09:24:22Z | 2026-09-23T09:38:27Z | 3 settled, 0 escalated                                                                                       | #work-orders-summary |
| 2c.1  | skipped | -                    | -                    | empty: answered by `09_delta.md` `## Triage (2026-09-23)`, which changes no US, AC, BR, EX, TC or ledger row | -                    |
| 3     | run     | 2026-09-23T10:05:29Z | -                    | 1 settled, 0 escalated                                                                                       | #work-orders-summary |

- Batch record: `.qfai/evidence/sdd-batch-20260923170018664.md`

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance       | Task title                                                                                                                           | Input (refs)                                                                          | Output (refs)                                                                                                                                                                               | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-reviewer | p2-griller           | grilling(2/agents): the pointers name the implement-evidence ruling and `CR-20260818-0002`; the Triage row's rationale is not edited | S6-D1                                                                                 | Both targets already exist, recorded in DR-0006-0006 and DL-0001; the Triage row is a dated record. Disagreeing position: requirements-analyst (update the "content moves first" rationale) | PASS                         |
| 2    | requirements-reviewer | p2-griller           | grilling(2/agents): the ledger note is rewritten at Phase 2b and the delta bullet at Phase 4, both by `/qfai-sdd`                    | S6-D2                                                                                 | The drift protocol lets a downstream stage edit only the ledger cells it names, and this prose is upstream; author agreed                                                                   | PASS                         |
| 3    | requirements-reviewer | p2-griller           | grilling(2/agents): only the changed first line of the carry-over bullet is rewritten, in English                                    | S6-D3                                                                                 | The continuation does not change; author agreed                                                                                                                                             | PASS                         |
| 4    | requirements-analyst  | p2-author-0003-0006  | Phase 2b draft and the Phase 4 pointer: spec-0006                                                                                    | steps 1-3, `## Triage (2026-09-23)`                                                   | `tdd/test-list.md`, `09_delta.md`, `07_Decisions.md` as listed under Work performed; validate `sdd` on spec-0006: no new finding                                                            | PASS                         |
| 5    | architecture-reviewer | p2c3-griller         | grilling(3/agents): the usage-reference check counts only elements this change adds; this plan gains none and stays unchanged        | P3-D1                                                                                 | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                           | PASS                         |
| 6    | solution-architect    | p2c3-author          | Phase 2c and Phase 3 record: spec-0006                                                                                               | step 5, `## Triage (2026-09-23)`                                                      | No obligation to reconcile; `10_Plan.md` unchanged; Critical Constraint 10: no finding; validate `sdd` on spec-0006: the 2 existing errors, no new finding                                  | PASS                         |
| 7    | requirements-analyst  | p4-author            | Phase 4 delta update: spec-0006                                                                                                      | `09_delta.md` DL-0001..0003, `## Triage (2026-09-23)`                                 | `09_delta.md` `## Update History`, `## Change Summary` DELTA-0002; markdownlint 0 errors; validate `sdd` on spec-0006: the 2 existing errors, no new finding                                | PASS                         |
| 8    | test-design-analyst   | tda-reviewfix        | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                 | `.qfai/specs/spec-0006/tdd/test-list.md` TDD-0037, `09_delta.md`; cycle-1 R03 A1      | The recorded handling of TDD-0037's `Evidence` cell is confirmed; cell unchanged; DR-0006-0009, DL-0004; ledger 50 rows before and after                                                    | PASS                         |
| 9    | completion-reviewer   | gate-c1-completion   | Reviewer Gate cycle 1                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record                               | `review-20260923104053102` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst                                                                                        | REVISE                       |
| 10   | architecture-reviewer | gate-c1-architecture | Reviewer Gate cycle 1                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record                               | `review-20260923104053102` R02: REVISE — DR-0296 wording                                                                                                                                    | REVISE                       |
| 11   | qa-gatekeeper         | gate-c1-qa           | Reviewer Gate cycle 1                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record                               | `review-20260923104053102` R03: PASS                                                                                                                                                        | PASS                         |
| 12   | completion-reviewer   | gate-c2-completion   | Reviewer Gate cycle 2                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record, the cycle-1 answered demands | `review-20260923121814102` R01: PASS, advisories only                                                                                                                                       | PASS                         |
| 13   | architecture-reviewer | gate-c2-architecture | Reviewer Gate cycle 2                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record, the cycle-1 answered demands | `review-20260923121814102` R02: PASS, advisories only                                                                                                                                       | PASS                         |
| 14   | qa-gatekeeper         | gate-c2-qa           | Reviewer Gate cycle 2                                                                                                                | this file, `.qfai/specs/spec-0006/**`, the batch record, the cycle-1 answered demands | `review-20260923121814102` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                          | PASS                         |

## Gaps / Open risks

- `QFAI-TDDLIST-017` on TC-0006-0029 and TC-0006-0030 keeps the spec-scoped
  `sdd` gate failing. Naming a `Boundary` on those rows is Phase 2b work outside
  this run's Triage.
- The carry-over bullet mixes English and Japanese until its continuation is
  next changed.

## Final status

- Final status: PASS
- Rationale: every routed blocking reviewer returned PASS in cycle 2
  (`review-20260923121814102`), and only the 15 pinned pre-existing errors
  remain repository-wide, two of them the `QFAI-TDDLIST-017` in this spec.
