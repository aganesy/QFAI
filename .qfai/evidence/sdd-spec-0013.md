# Evidence: /qfai-sdd (spec-0013)

## Objective

- Spec target: spec-0013
- Objective: the `/qfai-sdd` skill names the spec-pack home of each record, and
  its approval stop writes nothing beyond the Triage table and the stop report.

## Inputs reviewed

- `discussion-20260923060900824` (REQ-0007, REQ-0008), read through the batch
  record.
- `.qfai/evidence/sdd-batch-20260923170018664.md`: Stage 1, Phase 0 and Phase 1.
- `.qfai/specs/spec-0013/**` and `09_delta.md` `## Triage (2026-09-23)`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`,
  `references/sdd-execution-playbook.md` and `references/sdd-triage.md`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/volume-policy.md`
  (tier table).

## Preflight summary path

- Preflight run id `run-20260923170018664`: ready, 17 imported requirements, no
  blockers. Stage 1 Triage was taken against this run.
- Preflight run id `run-20260923172043151`, the latest: ready, 17 imported
  requirements, no pack gaps. Its summary differs from the earlier run's only
  in the run id.

## Triage decisions

| Source                                | Subject                                                                                     | Operation | Sub-op | Approved By | Rationale                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0007 | Append AC-0013-0028, BR-0013-0021, EX-0013-0021, TC-0013-0036: record homes                 | UPDATE    | APPEND | -           | No item covers this text, and the acceptance signal needs a test                                    |
| discussion-20260923060900824#REQ-0008 | Append AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0037: the approval stop in 3 files | UPDATE    | APPEND | -           | The record of a stop is the `Approved By: -` cell, the `QFAI-TRIAGE-005` errors and the stop report |

## Open questions

- none

## Decisions made

- DR-0013-0005 / DL-0001: the skill names `07_Decisions.md`,
  `08_Open-questions.md` and a Change Request, not `Blocked-By`.
- DR-0013-0006 / DL-0002: texts of the REQ-0007 items, with no Decision Log
  mention and no settled or unsettled split.
- DR-0013-0007 / DL-0003: texts of the REQ-0008 items; the same three stop steps
  in three files, and no "work-log" or `consultation-needed` in any of them.
- DR-0013-0008 / DL-0004: AC-0013-0028, BR-0013-0021 and EX-0013-0021 state the
  tree-wide absence clause, and TC-0013-0036 checks it.
- DR-0013-0009 / DL-0005: `- Source:` lines on the new ACs and qualified
  requirement lines in `01_Spec.md`.
- DR-0013-0010 / DL-0006: one BR, EX and TC per new AC.
- DR-0013-0011 / DL-0007: TDD-0044..TDD-0049 are `T2`.
- DR-0013-0012 / DL-0008: their owning module is the skill directory.
- DR-0013-0013 / DL-0009: `Tier` is seeded on the new rows only.
- DR-0013-0014 / DL-0010: BR-0013-0021 and BR-0013-0022 are realized by the
  shipped skill text, with no contract — a contract for skill text is not
  needed.
- DR-0013-0015 / DL-0011: the plan names where the skill text is edited and
  cites spec-0004's plan for the order — the text lands with the check removal.
- DR-0013-0016 / DL-0012: TC-0013-0036 holds four ledger rows (TDD-0044,
  TDD-0046, TDD-0047, TDD-0048) and TC-0013-0037 two (TDD-0045, TDD-0049), one
  per boundary, because each is fixed by a different edit and RED on one row
  would observe only the first. Taken in the Reviewer Gate fix by
  `test-design-analyst`, without a pre-draft grilling round, and adjudicated by
  cycle 2 (A2-DEC).
- Recorded in this file only, because neither fixes anything in the spec pack:
  P3-D1 (the usage-reference check counts only what this change adds) and
  P3-D4 (new plan text goes inside the template's sections, in English).

## Work performed

- Phase 2: appended AC-0013-0028..0029, BR-0013-0021..0022,
  EX-0013-0021..0022 and TC-0013-0036..0037 (`Level: integration`,
  `Type: normal`); added `discussion-20260923060900824#REQ-0007` and `#REQ-0008`
  to `01_Spec.md` `## Relevant Requirements`; recorded DR-0013-0005..0013 in
  `07_Decisions.md`.
- Phase 2b: appended TDD-0044 (TC-0013-0036) and TDD-0045 (TC-0013-0037) to
  `tdd/test-list.md` at `todo` (`Integration`, `T2`, owning module
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, `BR-Ref`
  BR-0013-0021 and BR-0013-0022). No row was reset or retired. Prettier
  re-padded the table; a cell-level comparison against `HEAD` shows the 43
  existing rows unchanged.
- `09_delta.md`: ledger bullets under `## Triage (2026-09-23)`, including the
  `Tier` limit, plus `## Update History` and `## Decision Log` DL-0001..0009.
- The duplicate headings AC-0013-0008..0010 were left as they are.
- Phase 2c: `07_Decisions.md` DR-0013-0014, `09_delta.md` DL-0010 and its
  `## Update History` row. No contract and no obligation changed.
- Phase 3: `10_Plan.md` gains one paragraph under `## Implementation approach`.
  `07_Decisions.md` DR-0013-0015, `09_delta.md` DL-0011 and its
  `## Update History` row.
- Critical Constraint 10: no finding. The new plan text introduces no
  architectural element: it names an edit inside one skill and cites
  spec-0004's plan for the order. The earlier sections were finalized by the
  runs that introduced them and were not re-audited (P3-D1).
- Phase 4: `09_delta.md` gains a `## Change Summary` with entry DELTA-0001,
  since the file had none. Its `## Update History` already holds DL-0001..0011.
  Each `### Plan` heading in the Decision Log now carries its DL-ID, which
  clears three markdownlint MD024 duplicates. The Triage rows and the dated
  history stay as written. No `## Change Requests` row: the change record is
  the approved Triage set (P1-D5). Phase 4 settles no design decision, so no
  grilling row.
- Test-design review fix, cycle 1 (`test-design-analyst`, `tda-reviewfix`):
  TC-0013-0036 names four boundaries (TDD-0044, TDD-0046, TDD-0047,
  TDD-0048) and TC-0013-0037 two (TDD-0045, TDD-0049), one row each
  (DR-0013-0016, DL-0012). Ledger: 45 rows before, 49 after.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0013-0021 and AC-0013-0028: no contract under `.qfai/contracts/**`;
  realized by the shipped skill files under
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`.
  `07_Decisions.md` and `08_Open-questions.md` resolve to the spec-pack
  templates and their schemas under `packages/qfai/assets/mdschema/spec/`. A
  Change Request resolves to `.qfai/decisions/CR-*` (DR-0013-0014).
- BR-0013-0022 and AC-0013-0029: the same skill files, with no contract.
  `Approved By` resolves to the Triage table of the `09_delta.md` template, and
  `QFAI-TRIAGE-005` to `specPack.ts`. The stop report is output and stores
  nothing (DR-0013-0014).
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract, and nothing under `.qfai/contracts/` declares a `CON-API-*` or
  `CON-DB-*`. This phase wrote no contract, so its scope did not re-expand.

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0013 --format github
npx prettier --check --ignore-path .git/info/exclude <touched spec-0013 files>
npx prettier --write .qfai/specs/spec-0013/07_Decisions.md .qfai/specs/spec-0013/09_delta.md .qfai/specs/spec-0013/10_Plan.md
npx markdownlint-cli2 .qfai/specs/spec-0013/07_Decisions.md .qfai/specs/spec-0013/09_delta.md .qfai/specs/spec-0013/10_Plan.md
node scripts/check-mdschema.mjs
node scripts/check-doc-clarity.mjs
npx prettier --write .qfai/specs/spec-0013/09_delta.md
npx markdownlint-cli2 .qfai/specs/spec-0013/*.md .qfai/specs/spec-0013/tdd/*.md
node scripts/check-mdschema.mjs --scope all
node scripts/check-mermaid.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0013 --format text
```

## Validate evidence paths

- Validate run id `run-20260923182835652`, scope `sdd`, `--spec spec-0013`,
  before any write: fail, 3 errors, 26 warnings, 4 info. The three errors are
  `QFAI-ID-002` on the duplicate headings AC-0013-0008..0010.
- Validate run id `run-20260923184012522`, scope `sdd`, `--spec spec-0013`, after the
  writes: fail, the same 3 errors, 26 warnings, 4 info. No finding is new.
- Validate run id `run-20260923191427680`, scope `sdd`, `--spec spec-0013`,
  after Phase 2c and Phase 3: fail, the same 3 `QFAI-ID-002` errors, 26
  warnings, 4 info. No finding is new.
- Validate run id `run-20260923193808473`, scope `sdd`, `--spec spec-0013`, after
  Phase 4: fail, the same 3 `QFAI-ID-002` errors, 26 warnings, 4 info. No
  finding is new. The whole-repository run is in the batch record.
- Final run `run-20260923214113936`, scope `sdd`, whole repository,
  after the Reviewer Gate closed: 15 errors repository-wide, all pinned and
  pre-existing. This spec's files carry 3 errors, all three the pinned `QFAI-ID-002` and 1 warning. Details in the batch record.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier               | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ---------------------- | -------------------- |
| 2     | run     | 2026-09-23T09:24:22Z | 2026-09-23T09:33:18Z | 9 settled, 0 escalated | #work-orders-summary |
| 2c.1  | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:09:45Z | 1 settled, 0 escalated | #work-orders-summary |
| 3     | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:11:42Z | 4 settled, 0 escalated | #work-orders-summary |

- Batch record: `.qfai/evidence/sdd-batch-20260923170018664.md`

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance           | Task title                                                                                                                                                               | Input (refs)                                                                          | Output (refs)                                                                                                                                                                                                                                | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-reviewer | p2-griller               | grilling(2/agents): the skill names the spec-pack homes, not `Blocked-By`                                                                                                | S13-D1                                                                                | REQ-0007 asks for each home "in the skill that reaches it", and `/qfai-sdd` holds no in-progress ledger row; narrows the Triage subject, so it is recorded; author agreed                                                                    | PASS                         |
| 2    | requirements-reviewer | p2-griller               | grilling(2/agents): texts of AC-0013-0028, BR-0013-0021, EX-0013-0021, TC-0013-0036                                                                                      | S13-D2                                                                                | Dropped the Decision Log mention and the settled or unsettled split, which the traceability rules already state; widened the absence clause to the tree; disagreeing position: requirements-analyst (both kept)                              | PASS                         |
| 3    | requirements-reviewer | p2-griller               | grilling(2/agents): texts of AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0037                                                                                      | S13-D3                                                                                | The three files must state one stop; after the skill edit "work-log" appears nowhere else in them, so a whole-file absence check is safe; author agreed                                                                                      | PASS                         |
| 4    | requirements-reviewer | p2-griller               | grilling(2/agents): TC-0013-0036 carries the tree-wide absence check                                                                                                     | X-D1                                                                                  | Every acceptance signal needs a test and no id is added; AC, BR and EX state the clause too; disagreeing position: requirements-analyst (only the TC widened)                                                                                | PASS                         |
| 5    | requirements-reviewer | p2-griller               | grilling(2/agents): `- Source:` line on each new AC and qualified requirement lines                                                                                      | X-D2                                                                                  | The local REQ-0007 and REQ-0008 mean something else; every AC needs a Source and a copy-down; author agreed                                                                                                                                  | PASS                         |
| 6    | requirements-reviewer | p2-griller               | grilling(2/agents): one BR and one TC per AC                                                                                                                             | X-D3                                                                                  | The Triage lists one item per layer; `QFAI-COV-207` warnings go to the density review; author agreed                                                                                                                                         | PASS                         |
| 7    | requirements-reviewer | p2-griller               | grilling(2/agents): Tier `T2` on the new rows                                                                                                                            | X-D4                                                                                  | The rows read shipped files, which the tier table places at `T2`; author agreed                                                                                                                                                              | PASS                         |
| 8    | requirements-reviewer | p2-griller               | grilling(2/agents): owning module is the skill directory                                                                                                                 | X-D5                                                                                  | The two rows share a module and run in order, apart from spec-0011's TDD-0021; author agreed                                                                                                                                                 | PASS                         |
| 9    | requirements-reviewer | p2-griller               | grilling(2/agents): seed Tier only on new and reset rows                                                                                                                 | X-D6                                                                                  | No driving Change Request; re-deriving would reset `done` rows the change does not touch; found by griller                                                                                                                                   | PASS                         |
| 10   | requirements-analyst  | p2-author-0011-0013-0015 | Phase 2 and 2b draft: spec-0013                                                                                                                                          | settled S13-D1..D3, X-D1..X-D6                                                        | `01_Spec.md`, `03`..`07`, `09_delta.md`, `tdd/test-list.md` (TDD-0044, TDD-0045); validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding                                                                  | PASS                         |
| 11   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 open decisions                                                                                                                                      | Phase 2 texts of BR-0013-0021 and BR-0013-0022; `10_Plan.md`                          | P2C-D6 and P3-D1..D9 with positions; no critical recommendation                                                                                                                                                                              | PASS                         |
| 12   | architecture-reviewer | p2c3-griller             | grilling(2c/agents): BR-0013-0021 and BR-0013-0022 are realized by the shipped `qfai-sdd` skill text, with no contract                                                   | P2C-D6                                                                                | Each named home resolves to a template, a schema, a validator or `.qfai/decisions/`; a contract for skill text is not needed; author agreed                                                                                                  | PASS                         |
| 13   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the usage-reference check counts only elements this change adds, which is none                                                                       | P3-D1                                                                                 | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                                                                            | PASS                         |
| 14   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the removal order lives in spec-0004's plan, and this plan cites it                                                                                  | P3-D2                                                                                 | spec-0004 owns every validator that makes the order matter, and six copies drift; author agreed                                                                                                                                              | PASS                         |
| 15   | architecture-reviewer | p2c3-griller             | grilling(3/agents): new plan text goes in subsections or paragraphs inside the template's sections, in English                                                           | P3-D4                                                                                 | Keeps clear of the plan heading checks by construction, and follows the repository language; author agreed                                                                                                                                   | PASS                         |
| 16   | architecture-reviewer | p2c3-griller             | grilling(3/agents): one paragraph naming the edit path `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`, then `pnpm sync:ssot`, and citing spec-0004's order | P3-D7                                                                                 | The text must land with the removal of `QFAI-TDDLIST-015`, which a reader of this plan alone would miss. Griller amended the paragraph to state the edit path; disagreeing position: solution-architect (skill files named without the path) | PASS                         |
| 17   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 draft: spec-0013                                                                                                                                    | settled steps 12-16                                                                   | `07_Decisions.md` DR-0013-0014 and DR-0013-0015, `09_delta.md` DL-0010 and DL-0011, `10_Plan.md`; Critical Constraint 10: no finding; validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding              | PASS                         |
| 18   | requirements-analyst  | p4-author                | Phase 4 delta update: spec-0013                                                                                                                                          | `09_delta.md` DL-0001..0011, `## Triage (2026-09-23)`                                 | `09_delta.md` `## Change Summary` DELTA-0001, `### Plan (DL-NNNN)` headings; markdownlint 0 errors; validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding                                                | PASS                         |
| 19   | test-design-analyst   | tda-reviewfix            | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                                                     | `.qfai/specs/spec-0013/03..06`, `tdd/test-list.md`, `09_delta.md`; cycle-1 R03 A1     | TC-0013-0036 names four boundaries and TC-0013-0037 two; TDD-0046..TDD-0049 added; DR-0013-0016, DL-0012; ledger 45 -> 49 rows                                                                                                               | PASS                         |
| 20   | completion-reviewer   | gate-c1-completion       | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst                                                                                                                                         | REVISE                       |
| 21   | architecture-reviewer | gate-c1-architecture     | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R02: REVISE — DR-0296 wording                                                                                                                                                                                     | REVISE                       |
| 22   | qa-gatekeeper         | gate-c1-qa               | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R03: PASS                                                                                                                                                                                                         | PASS                         |
| 23   | completion-reviewer   | gate-c2-completion       | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R01: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 24   | architecture-reviewer | gate-c2-architecture     | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R02: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 25   | qa-gatekeeper         | gate-c2-qa               | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                                                                           | PASS                         |

## Gaps / Open risks

- `QFAI-ID-002` on AC-0013-0008..0010 keeps the spec-scoped validate at 3
  errors. The duplicate headings predate this change and are out of its scope.
- TDD-0044..TDD-0049 wait on `/qfai-atdd` for their tests and on the
  skill-text edit (`discussion-20260923060900824#REQ-0007`, `#REQ-0008`). They
  must leave no ledger or ATDD error at the head of the change.
- TDD-0048 (`no-surface-reference-in-tree`) also waits on other specs' rows: it
  passes only after the spec-0011 and spec-0003 / spec-0004 rows remove the
  other references to the surface, in the same change.
- TDD-0048 has no production edit of its own once its siblings are done, so its
  GREEN arrives through other rows. Its falsifiability at the completion gate
  must be its own mutation of a predicate it asserts on — for example,
  re-adding `.qfai/steering/` to one shipped file — not a sibling's.
- `tests/assets/autoModeApprovalDegrade.test.ts` asserts the
  `consultation-needed` work-log sentences this change removes. Rewrite those
  assertions to the new stop text rather than deleting them: the file also pins
  the `--auto` stop itself.

## Final status

- Final status: PASS
- Rationale: every routed blocking reviewer returned PASS in cycle 2
  (`review-20260923121814104`), and only the 15 pinned pre-existing errors
  remain repository-wide, three of them the `QFAI-ID-002` in this spec.
