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
| discussion-20260923060900824#REQ-0007 | Append AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038: record homes                 | UPDATE    | APPEND | -           | No item covers this text, and the acceptance signal needs a test                                    |
| discussion-20260923060900824#REQ-0008 | Append AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039: the approval stop in 3 files | UPDATE    | APPEND | -           | The record of a stop is the `Approved By: -` cell, the `QFAI-TRIAGE-005` errors and the stop report |

## Open questions

- none

## Decisions made

- DR-0013-0005 / DL-0001: the skill names `07_Decisions.md`,
  `08_Open-questions.md` and a Change Request, not `Blocked-By`.
- DR-0013-0006 / DL-0002: texts of the REQ-0007 items, with no Decision Log
  mention and no settled or unsettled split.
- DR-0013-0007 / DL-0003: texts of the REQ-0008 items; the same three stop steps
  in three files, and no "work-log" or `consultation-needed` in any of them.
- DR-0013-0008 / DL-0004: AC-0013-0030, BR-0013-0023 and EX-0013-0023 state the
  tree-wide absence clause, and TC-0013-0038 checks it.
- DR-0013-0009 / DL-0005: `- Source:` lines on the new ACs and qualified
  requirement lines in `01_Spec.md`.
- DR-0013-0010 / DL-0006: one BR, EX and TC per new AC.
- DR-0013-0011 / DL-0007: TDD-0110..TDD-0115 are `T2`.
- DR-0013-0012 / DL-0008: their owning module is the skill directory.
- DR-0013-0013 / DL-0009: `Tier` is seeded on the new rows only.
- DR-0013-0014 / DL-0010: BR-0013-0023 and BR-0013-0022 are realized by the
  shipped skill text, with no contract — a contract for skill text is not
  needed.
- DR-0013-0015 / DL-0011: the plan names where the skill text is edited and
  cites spec-0004's plan for the order — the text lands with the check removal.
- DR-0013-0016 / DL-0012: TC-0013-0038 holds four ledger rows (TDD-0110,
  TDD-0112, TDD-0113, TDD-0114) and TC-0013-0039 two (TDD-0111, TDD-0115), one
  per boundary, because each is fixed by a different edit and RED on one row
  would observe only the first. Taken in the Reviewer Gate fix by
  `test-design-analyst`, without a pre-draft grilling round, and adjudicated by
  cycle 2 (A2-DEC).
- Recorded in this file only, because neither fixes anything in the spec pack:
  P3-D1 (the usage-reference check counts only what this change adds) and
  P3-D4 (new plan text goes inside the template's sections, in English).

## Work performed

- Phase 2: appended AC-0013-0029..0030, BR-0013-0022..0023,
  EX-0013-0022..0023 and TC-0013-0038..0039 (`Level: integration`,
  `Type: normal`); added `discussion-20260923060900824#REQ-0007` and `#REQ-0008`
  to `01_Spec.md` `## Relevant Requirements`; recorded DR-0013-0005..0013 in
  `07_Decisions.md`.
- Phase 2b: appended TDD-0110 (TC-0013-0038) and TDD-0111 (TC-0013-0039) to
  `tdd/test-list.md` at `todo` (`Integration`, `T2`, owning module
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd`, `BR-Ref`
  BR-0013-0023 and BR-0013-0022). No row was reset or retired. Prettier
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
  TC-0013-0038 names four boundaries (TDD-0110, TDD-0112, TDD-0113,
  TDD-0114) and TC-0013-0039 two (TDD-0111, TDD-0115), one row each
  (DR-0013-0016, DL-0012). Ledger: 45 rows before, 49 after.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0013-0023 and AC-0013-0030: no contract under `.qfai/contracts/**`;
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
| 2    | requirements-reviewer | p2-griller               | grilling(2/agents): texts of AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038                                                                                      | S13-D2                                                                                | Dropped the Decision Log mention and the settled or unsettled split, which the traceability rules already state; widened the absence clause to the tree; disagreeing position: requirements-analyst (both kept)                              | PASS                         |
| 3    | requirements-reviewer | p2-griller               | grilling(2/agents): texts of AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039                                                                                      | S13-D3                                                                                | The three files must state one stop; after the skill edit "work-log" appears nowhere else in them, so a whole-file absence check is safe; author agreed                                                                                      | PASS                         |
| 4    | requirements-reviewer | p2-griller               | grilling(2/agents): TC-0013-0038 carries the tree-wide absence check                                                                                                     | X-D1                                                                                  | Every acceptance signal needs a test and no id is added; AC, BR and EX state the clause too; disagreeing position: requirements-analyst (only the TC widened)                                                                                | PASS                         |
| 5    | requirements-reviewer | p2-griller               | grilling(2/agents): `- Source:` line on each new AC and qualified requirement lines                                                                                      | X-D2                                                                                  | The local REQ-0007 and REQ-0008 mean something else; every AC needs a Source and a copy-down; author agreed                                                                                                                                  | PASS                         |
| 6    | requirements-reviewer | p2-griller               | grilling(2/agents): one BR and one TC per AC                                                                                                                             | X-D3                                                                                  | The Triage lists one item per layer; `QFAI-COV-207` warnings go to the density review; author agreed                                                                                                                                         | PASS                         |
| 7    | requirements-reviewer | p2-griller               | grilling(2/agents): Tier `T2` on the new rows                                                                                                                            | X-D4                                                                                  | The rows read shipped files, which the tier table places at `T2`; author agreed                                                                                                                                                              | PASS                         |
| 8    | requirements-reviewer | p2-griller               | grilling(2/agents): owning module is the skill directory                                                                                                                 | X-D5                                                                                  | The two rows share a module and run in order, apart from spec-0011's TDD-0021; author agreed                                                                                                                                                 | PASS                         |
| 9    | requirements-reviewer | p2-griller               | grilling(2/agents): seed Tier only on new and reset rows                                                                                                                 | X-D6                                                                                  | No driving Change Request; re-deriving would reset `done` rows the change does not touch; found by griller                                                                                                                                   | PASS                         |
| 10   | requirements-analyst  | p2-author-0011-0013-0015 | Phase 2 and 2b draft: spec-0013                                                                                                                                          | settled S13-D1..D3, X-D1..X-D6                                                        | `01_Spec.md`, `03`..`07`, `09_delta.md`, `tdd/test-list.md` (TDD-0110, TDD-0111); validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding                                                                  | PASS                         |
| 11   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 open decisions                                                                                                                                      | Phase 2 texts of BR-0013-0023 and BR-0013-0022; `10_Plan.md`                          | P2C-D6 and P3-D1..D9 with positions; no critical recommendation                                                                                                                                                                              | PASS                         |
| 12   | architecture-reviewer | p2c3-griller             | grilling(2c/agents): BR-0013-0023 and BR-0013-0022 are realized by the shipped `qfai-sdd` skill text, with no contract                                                   | P2C-D6                                                                                | Each named home resolves to a template, a schema, a validator or `.qfai/decisions/`; a contract for skill text is not needed; author agreed                                                                                                  | PASS                         |
| 13   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the usage-reference check counts only elements this change adds, which is none                                                                       | P3-D1                                                                                 | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                                                                            | PASS                         |
| 14   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the removal order lives in spec-0004's plan, and this plan cites it                                                                                  | P3-D2                                                                                 | spec-0004 owns every validator that makes the order matter, and six copies drift; author agreed                                                                                                                                              | PASS                         |
| 15   | architecture-reviewer | p2c3-griller             | grilling(3/agents): new plan text goes in subsections or paragraphs inside the template's sections, in English                                                           | P3-D4                                                                                 | Keeps clear of the plan heading checks by construction, and follows the repository language; author agreed                                                                                                                                   | PASS                         |
| 16   | architecture-reviewer | p2c3-griller             | grilling(3/agents): one paragraph naming the edit path `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/`, then `pnpm sync:ssot`, and citing spec-0004's order | P3-D7                                                                                 | The text must land with the removal of `QFAI-TDDLIST-015`, which a reader of this plan alone would miss. Griller amended the paragraph to state the edit path; disagreeing position: solution-architect (skill files named without the path) | PASS                         |
| 17   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 draft: spec-0013                                                                                                                                    | settled steps 12-16                                                                   | `07_Decisions.md` DR-0013-0014 and DR-0013-0015, `09_delta.md` DL-0010 and DL-0011, `10_Plan.md`; Critical Constraint 10: no finding; validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding              | PASS                         |
| 18   | requirements-analyst  | p4-author                | Phase 4 delta update: spec-0013                                                                                                                                          | `09_delta.md` DL-0001..0011, `## Triage (2026-09-23)`                                 | `09_delta.md` `## Change Summary` DELTA-0001, `### Plan (DL-NNNN)` headings; markdownlint 0 errors; validate sdd `--spec spec-0013`: the 3 existing `QFAI-ID-002` errors only, no new finding                                                | PASS                         |
| 19   | test-design-analyst   | tda-reviewfix            | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                                                     | `.qfai/specs/spec-0013/03..06`, `tdd/test-list.md`, `09_delta.md`; cycle-1 R03 A1     | TC-0013-0038 names four boundaries and TC-0013-0039 two; TDD-0112..TDD-0115 added; DR-0013-0016, DL-0012; ledger 45 -> 49 rows                                                                                                               | PASS                         |
| 20   | completion-reviewer   | gate-c1-completion       | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst                                                                                                                                         | REVISE                       |
| 21   | architecture-reviewer | gate-c1-architecture     | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R02: REVISE — DR-0296 wording                                                                                                                                                                                     | REVISE                       |
| 22   | qa-gatekeeper         | gate-c1-qa               | Reviewer Gate cycle 1                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record                               | `review-20260923104053104` R03: PASS                                                                                                                                                                                                         | PASS                         |
| 23   | completion-reviewer   | gate-c2-completion       | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R01: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 24   | architecture-reviewer | gate-c2-architecture     | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R02: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 25   | qa-gatekeeper         | gate-c2-qa               | Reviewer Gate cycle 2                                                                                                                                                    | this file, `.qfai/specs/spec-0013/**`, the batch record, the cycle-1 answered demands | `review-20260923121814104` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                                                                           | PASS                         |

## Gaps / Open risks

- `QFAI-ID-002` on AC-0013-0008..0010 keeps the spec-scoped validate at 3
  errors. The duplicate headings predate this change and are out of its scope.
- TDD-0110..TDD-0115 wait on `/qfai-atdd` for their tests and on the
  skill-text edit (`discussion-20260923060900824#REQ-0007`, `#REQ-0008`). They
  must leave no ledger or ATDD error at the head of the change.
- TDD-0114 (`no-surface-reference-in-tree`) also waits on other specs' rows: it
  passes only after the spec-0011 and spec-0003 / spec-0004 rows remove the
  other references to the surface, in the same change.
- TDD-0114 has no production edit of its own once its siblings are done, so its
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

---

## Prior run (2026-09-24, intent-driven entry)

### Objective

Apply the approved UPDATE rows of the 2026-09-24 intent-driven entry Triage to spec-0013.

### Inputs reviewed

- `discussion-20260923171450572` (reference, not normative)
- `.qfai/specs/spec-0013/09_delta.md` `## Triage (2026-09-24 intent-driven entry)`
- `.qfai/contracts/cli/qfai-workflow.md`, `workflow-files.schema.md`, `qfai-init.md`, `qfai-validate.md`

### Preflight summary path

- Stage 0: `run-20260924042956656`; ready, 68 REQs, no blockers.
- After Triage: `run-20260924050220859`; ready, 68 REQs, no blockers.

### Triage decisions

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| REQ-0042 | Stage 1 checks a routing-time `CREATE` authorization instead of asking | UPDATE | APPEND | - | D5. Stage 1 checks that the `human_decision` exists, matches the row's operation and capability and is not stale. If it is missing, mismatched or stale, the stage stops and the run waits in `awaiting_input`. The other approval-required operations keep today's question. No spec-0013 item covers Stage 1 approval today, and the policy half is in `_policies/11_Slice-Policy.md`. Size signal: 30 AC headings today, 27 distinct IDs, because AC-0013-0008 to AC-0013-0010 are used twice. New ACs are numbered from AC-0013-0043, and the appends in this table take the count past 30. spec-0013 owns only CAP-0013, so there is no split |
| REQ-0043 | The triage row format carries a reference to its workflow authorization | UPDATE | APPEND | - | Covers `references/sdd-triage.md` and the Stage 1 text. OQ-0006 decides between a new column and a value form |
| REQ-0044 | `--auto` stays a no-question mode inside and outside a run | UPDATE | APPEND | - | An approval-required row under `--auto` still stops with a `consultation-needed` entry and `Approved By` left `-`. The degrade regression test keeps active-run authority and legacy `--auto` as separate cases |
| REQ-0047 | Phase 2b seeds a diagnosed missing-test row without a Change Request | UPDATE | APPEND | - | D13. The TC and its ledger row are appended with the diagnosed defect as the reason, AC and BR are unchanged, and the row runs from `todo` to RED to GREEN. An acceptance-layer row gets its test from ATDD. This is the `sdd_append` stage of REQ-0006 under the predicate `missing_test_row_needed`, and OQ-0009 fixes its name |
| REQ-0013 | Work-order target binding: a missing target never means every capability | UPDATE | APPEND | - | A work order carries a fixed operation and target. A new spec arrives as `target: new_capability` and is bound to the created ID afterwards. US-0013-0004 and BR-0013-0007, the standalone no-argument batch, are unchanged |
| REQ-0053 | Standalone `/qfai-sdd` ends at SDD and never continues into implementation | UPDATE | APPEND | - | A request to go "to the end" is handed to a whole run |
| REQ-0051, REQ-0052, REQ-0056 | Orchestrated mode for `/qfai-sdd`: the entry check, the work-order scope and Stage 0 shared-snapshot reuse | UPDATE | APPEND | - | One reference cited by one line from `SKILL.md` (D12) |

### Open questions

- Recorded in `.qfai/specs/spec-0013/08_Open-questions.md` where this change opened or resolved one; the source pack's deferred OQs that this batch settled are cited from the settled sets in the Work Orders Summary below.

### Decisions made

- User decisions this batch used: CREATE CAP-0018 approved; OQ-0020 = A; OQ-0012 = A; TD-22 English seeds; N47 = C (spec-0018 not UI-bearing); J2 = B; Y1 = A; P04 = B (draft PR, merge only when every lane is green); the pack's D1..D18.
- Every other decision was adopted from the griller's recommendation and is listed as a `grilling(<phase>/agents)` row in the Work Orders Summary.
- Recorded decisions for this spec live in `07_Decisions.md` and the Decision Log of `09_delta.md`.

### Work performed

- Phase 2 Slice: `01`..`06` appended/amended per the approved Triage rows (see `09_delta.md` change summary).
- Phase 2b: `tdd/test-list.md` delta rows appended; column-only re-runs for `Blocked-By` and `Test file` (Phase 3 P01/P02).
- Phase 2c: reconciled against CLI-WF / CLI-WFFILE / CLI-INIT / CLI-VAL through the Phase 2c checkpoints recorded below (contract writes W01..W16 recorded in the batch record).
- Phase 3: `10_Plan.md` subsection `### Intent-driven entry (CAP-0018)` in all four sections; Plan gate PASS on cycle 2 (cycle 2).
- Phase 4: `09_delta.md` change summary lines for each phase.

### Contract executability

- none (no `db/` contract authored or changed)

### Commands executed

- `node packages/qfai/dist/cli/index.cjs sdd preflight --fail-on error` (Stage 0) and again after Triage
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --spec spec-0013 --fail-on error --format text`
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --format github`
- `node scripts/check-mdschema.mjs`, `node scripts/check-mermaid.mjs`, `node_modules/.bin/prettier --check`
- The repository build was used rather than `npx qfai`, which resolves a stale published copy; `packages/qfai/dist` was rebuilt from HEAD source with tsup.

### Validate evidence paths

- Spec-scoped validation: `run-20260924143657707`, fail, error=3, warning=25.
- Batch-wide sdd validation: `run-20260924145952965`, fail, error=27, warning=85. Twelve errors were pending review summaries; the other 15 are pre-existing pins in `scripts/dogfood-backlog.json`. The skill stop condition of error=0 was not met.

### Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 2     | run     | 2026-09-23T23:20:27.401Z | 2026-09-23T23:31:33.835Z | 36 settled (J2 by the user), 0 escalated | #work-orders-summary |
| 2c.1   | run     | 2026-09-24T01:02:25.952Z | 2026-09-24T01:03:17.857Z | 20 settled, 0 escalated | #work-orders-summary |
| 2c.2   | run     | 2026-09-24T01:21:57.179Z | 2026-09-24T01:22:52.841Z | 6 settled, 0 escalated | #work-orders-summary |
| 2c.3   | run     | 2026-09-24T01:32:36.673Z | 2026-09-24T01:33:16.642Z | 6 settled, 0 escalated | #work-orders-summary |
| 3      | run     | 2026-09-24T02:07:28.733Z | 2026-09-24T02:34:07.860Z | 19 settled (P04 by the user), 0 escalated | #work-orders-summary |

- Batch record: `sdd-batch-20260924045712999.md` (Phase 0 and Phase 1).

### Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X01 Contract citation form | settled recommendation and cited specifications | Decision: A `## Contract Realization` table at the end of `04_Business-Rules.md` for each added or modified BR; `## Applicable Contracts` in `01_Spec.md`; `Contract-Refs` untouched, or `-` on new table rows; reason: S06; the template admits only `CON-*`; disagreeing: none | PASS |
| 2 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X02 No cross-spec BR citation | settled recommendation and cited specifications | Decision: A wave-2 spec cites contracts, pack IDs and policy DRs, never another spec's BR, AC or TC ID; reason: S22 applied inside wave 2; lets all nine run in parallel; disagreeing: none | PASS |
| 3 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X03 Shared-asset owner map | settled recommendation and cited specifications | Decision: The SA-03 map, and each Scope's In and Out lines per RA-12. **One correction:** the `agents/openai.yaml` clause of REQ-0051 is spec-0003's (what `init` writes), so it goes in spec-0001's Out line; reason: One owner per line of each shared file; disagreeing: SA (the `openai.yaml` bullet in spec-0001; not taken) | PASS |
| 4 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X04 Operations tables | settled recommendation and cited specifications | Decision: One BR per skill spec, "the table lists exactly the operations CLI-WFFILE `### Vocabulary` assigns"; the literal set in one L3 TC. The skill set is defined by reference, "every skill a built-in plan names", which includes `qfai-maintain` (its file is spec-0018's), recorded as DR-0001-0010; reason: Trigger (b) fails closed on a missing table; S16; disagreeing: none | PASS |
| 5 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X05 orchestrated-mode.md and the ceiling | settled recommendation and cited specifications | Decision: One reference per stage skill; exactly one added SKILL.md line; every other SKILL.md edit in place. NFR-0003 in `## Applicable NFR` with its measurement, no BR; reason: `qfai-implement` reaches exactly 800; disagreeing: none | PASS |
| 6 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X06 The DTC-19 carve-out | settled recommendation and cited specifications | Decision: One BR in each of spec-0001, spec-0011 and spec-0013, each scoped to its own lines and citing DR-0297; implemented as one change; reason: DR-0297 says the four rules change together; disagreeing: none | PASS |
| 7 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X07 needs_repair owner | settled recommendation and cited specifications | Decision: Adopt, as R1. The findings listed on a `needs_repair` result are routing data, not run debts; reason: As SA wrote it, the sentence would make every repair finding a `debt-open` that no rule ever resolves, because CLI-WF defines no resolution (only `debt-open`, "a debt is unresolved"). So `finish` could never complete after any repair loop; disagreeing: SA (findings as ordinary `debts`; not taken as worded) | PASS |
| 8 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X08 Authorization-Ref grammar | settled recommendation and cited specifications | Decision: Adopt, as R2 and R3; the spec-0004 matrix gains `resolves-malformed`; reason: The value comes from a file, which is a trust boundary. Validation there is on the safety floor (`minimal-implementation.md` § 2), and neither contract fixes the value form: CLI-WFFILE says only "minted by the core, unique within the run"; disagreeing: none | PASS |
| 9 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X09 Next free IDs | settled recommendation and cited specifications | Decision: The RA rule: above the highest ID cited anywhere, ranges included, above every approved unapplied CR, skipping annotation strings in tests. The RA table is adopted, re-checked at write time; reason: The same hazard the traceability rules fix for `TDD-*`; disagreeing: TD (the F16 table, which for spec-0012 collides with CR-20260923-0001 at US-0012-0143, EX-0012-0187..0189 and TC-0012-0484..0488, and for spec-0013 with CR-20260913-0012 at BR/EX-0013-0021 and TC-0013-0036/0037; not taken) | PASS |
| 10 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X10 Story granularity | settled recommendation and cited specifications | Decision: One new story per journey the skill takes part in; a MODIFY adds none. Each new story gets an E2E row `Blocked-By` spec-0018, discharged by the spec-0018 journey through that stage, annotated with both story IDs; reason: N34; one journey per story; disagreeing: none | PASS |
| 11 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X11 AC form and Source | settled recommendation and cited specifications | Decision: A heading, a `- US-Refs:` line and a `gherkin` block with `# Source:`; a modified item keeps its ID and gains no Source; reason: The reader selects blocks by info string; disagreeing: none | PASS |
| 12 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X12 BR kinds | settled recommendation and cited specifications | Decision: Contract-surface and full rules; every BR with an AC, an EX and a TC; reason: S05; `QFAI-COV-102..104`; disagreeing: none | PASS |
| 13 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X13 Relevant Requirements | settled recommendation and cited specifications | Decision: A `### discussion-20260923171450572 (2026-09-24)` table, pack-qualified; existing lists not renumbered; reason: Local numbers collide with pack numbers (spec-0004 `REQ-0043`, three local `REQ-0013`); disagreeing: none | PASS |
| 14 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X14 Recording D5, D13, D14, D18 | settled recommendation and cited specifications | Decision: The RA table: D5 and D13 cited in `## Applicable Policy` (DR-0299, DR-0297); D14 as DR-0008-0004 and DR-0011-0015; D18 as DR-0011-0016; each with a DL twin. **Plus** the J2 user answer as DR-0015-0010 with DL-0002; reason: A fresh clone cannot read the pack; two owners of one policy DR are forbidden; disagreeing: none | PASS |
| 15 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X15 Open questions | settled recommendation and cited specifications | Decision: Each file keeps its own convention; no new OQ row; reason: Four files state rows only while unresolved; disagreeing: none | PASS |
| 16 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X16 09_delta.md | settled recommendation and cited specifications | Decision: `## Change Summary` (items, resolved pack OQs, size line where over, reserved ranges) and `## Decision Log` where a DR is added; triage rows not edited; reason: The rows are the approved record; disagreeing: none | PASS |
| 17 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X17 Level and directory of skill-text TCs | settled recommendation and cited specifications | Decision: `L3`, with the test under `packages/qfai/tests/integration/**`, never `tests/assets/**`; reason: An L3 oracle reads a shipped file, and an annotation under `tests/assets/` answers no layer (`test-layers.md` `### Annotation routing`); disagreeing: the brief (`tests/assets/**`) | PASS |
| 18 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X18 New test files | settled recommendation and cited specifications | Decision: One new file per spec and subject; existing files are edited only for the rewritten MODIFY TCs whose rows carry no Revision; reason: A changed test file stales a `done` row (`QFAI-TDDLIST-009`); disagreeing: none | PASS |
| 19 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X19 Matrix TCs | settled recommendation and cited specifications | Decision: Matrix only where each boundary has its own runtime observable: spec-0004's two matrices (the passing and the `QFAI-TRIAGE-011` matrix, with `resolves-malformed` added by X08); reason: One file read is one observation; disagreeing: none | PASS |
| 20 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X20 Append layout per file | settled recommendation and cited specifications | Decision: The TD-04 table, including spec-0010's new table under a heading not named "Test Case Table"; new rows spell `L1`..`L3`; reason: The parser reads only inside that section; disagreeing: none | PASS |
| 21 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X21 Kept failures | settled recommendation and cited specifications | Decision: The skill's half only, per the TD-05 table, plus the spec-0012 non-UI stop (F2); reason: The core's refusals are spec-0018's tests; disagreeing: none | PASS |
| 22 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X22 No payload JSON in stage references | settled recommendation and cited specifications | Decision: Fields in prose or a table; examples only in `qfai-run`'s reference; reason: Keeps the spec-0018 parser test off wave-2 assets; disagreeing: none | PASS |
| 23 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X23 Properties an existing guard holds | settled recommendation and cited specifications | Decision: No new TC for the line ceiling, the description length and `<`/`>`, the emitted-code registry, or manifest well-formedness. The `disable-model-invocation` row is settled by A5; reason: N46; disagreeing: none | PASS |
| 24 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X24 MODIFY TCs | settled recommendation and cited specifications | Decision: Rewrite a TC in place only when the MODIFY makes its `Expected` false; otherwise add one; the re-observation is recorded in the Phase 2b evidence as owed to the row's test owner; reason: Backward transitions are forbidden (BR-0011-0002); disagreeing: none | PASS |
| 25 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X25 Blocked-By spec-0018 | settled recommendation and cited specifications | Decision: A TC whose oracle reads a spec-0018 asset, and every new story's E2E row, is `Blocked-By` `spec-0018`; reason: S22, S28; disagreeing: none | PASS |
| 26 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X26 Phase 2b is a delta | settled recommendation and cited specifications | Decision: Rows appended only; no pinned finding is repaired; every profile is run after Phase 2b so no count moves. Correction to the brief recorded: spec-0013 carries no `QFAI-TDDLIST-017`; its sdd pin is 3 × `QFAI-ID-002`; reason: The request bounds the tree; any pinned-count change fails CI; disagreeing: none | PASS |
| 27 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X27 CI sequencing | settled recommendation and cited specifications | Decision: **Delivery constraint:** this batch's SDD commits reach CI only together with its ATDD work, in the same push to the pull request, so the annotated tests exist when the `full` lane runs. Owner: the orchestrator, with the delivery-planner for Phase 3. No carrier edit, no re-pin; reason: Otherwise `QFAI-ATDD-111`/`-112` fire under `full` against held-at-zero or pinned counts; disagreeing: none | PASS |
| 28 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X28 The Stage 0 reuse key | settled recommendation and cited specifications | Decision: CLI-WF has no `inputSnapshotDigest` (the `### Work order` fields are identity, `inputs` digests, `scope.digest` and the rest), and none is added. The Stage 0 output the stage already writes records its own key over the REQ-0056 list, using the digest function the core uses. A later stage recomputes the key and compares before reusing. No new field, file or writer, and no contract revision. The BR names what the key covers (RA-03), and the TC asserts the rule text (TD-03); reason: The field SA cited does not exist; REQ-0056 asks only for validate-then-reuse; disagreeing: SA (key on `inputSnapshotDigest`; not taken, the field does not exist) | PASS |
| 29 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G1 AC numbering against CR-20260913-0012 | settled recommendation and cited specifications | Decision: W15, as above; reason: The security floor; DPOL-02, DPOL-04; closes the second route to the files 2C2-SA-01 kept out; disagreeing: SA (no contract write this pass; superseded by the finding) | PASS |
| 30 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G2 Stories | settled recommendation and cited specifications | Decision: US-0013-0015..0017 as tabled; US-0013-0004 and BR-0013-0007 unchanged; reason: X10; disagreeing: none | PASS |
| 31 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G3 The Stage 1 authorization check | settled recommendation and cited specifications | Decision: As proposed, citing DR-0299 and CLI-WF `## Authorizations`, with no staleness trigger restated; two `L3` TCs, the stop being the kept failure; reason: M10, M13; disagreeing: none | PASS |
| 32 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G4 The triage row format | settled recommendation and cited specifications | Decision: As proposed; the value form is the R2 grammar, cited from CLI-VAL; waits on R2; reason: X08; disagreeing: none | PASS |
| 33 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G5 --auto inside and outside a run | settled recommendation and cited specifications | Decision: TD-04 A: the existing guard keeps the legacy case; one new `L3` TC in `tests/integration/` holds the active-run case; reason: X17; REQ-0044 keeps the two cases separate; disagreeing: none | PASS |
| 34 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G6 Defect row seeding | settled recommendation and cited specifications | Decision: As proposed, citing DR-0297; the appended TC names an existing AC and an existing EX or `—`, with the reason in `Notes` naming the run ID and no runtime path; reason: NFR-0014; X06; disagreeing: none | PASS |
| 35 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G7 Binding, standalone, orchestrated mode | settled recommendation and cited specifications | Decision: As proposed; Operations {`new-capability`, `delta-or-applicability-check`, `defect-row-seeding`}; Stage 0 reuse per X28; reason: X04, X28; disagreeing: none | PASS |
| 36 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): G8 Records, OQ, size, Phase 2b | settled recommendation and cited specifications | Decision: DR-0299 and DR-0297 cited; three resolved OQs in `09_delta.md`; size line naming the reservation; the ID-002 count stays 3; reason: X16, X26; disagreeing: none | PASS |
| 37 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K1 regression_fix receipts | settled recommendation and cited specifications | Decision: Contract: `regressionFix: { testId, rerunRef, reviewRef }` on a `regression_fix` result, and `invalid-input` reason `regression-fix-receipt`. BR-0018-0039 unchanged; BR-0011-0019 names the field; TC-0018-0068 gains the refusal pair; reason: D18 names the same test, and only a field carries that; it mirrors `testFix`; disagreeing: none | PASS |
| 38 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K2 Direct-exclusion seeds | settled recommendation and cited specifications | Decision: Rewrite ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024 to cover the four missing direct-exclusion classes while keeping the 24 fault and 64 route seed counts; reason: REQ-0007 requires a routing seed for each excluded class. Those four seeds duplicate cases already carried by ROUTE-014, ROUTE-021 or ROUTE-031 after the user chose English-only prompts, so their slots can cover environment settings, SQL files, generated files and QFAI-owned skills or constitution. Each rewritten seed forbids `direct`; disagreeing: SA proposed recording a gap and adding no seed; rejected because it would leave four required classes untested | PASS |
| 39 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K3/K4 Non-CREATE approvals in a run | settled recommendation and cited specifications | Decision: `Authorization-Ref` is valid only on CREATE rows. Other approval-required operations keep the Stage 1 human question; the answer reaches the next attempt through `authorizationRefs`, and the row copies `answeredBy@date` into `Approved By` for the existing validator check; reason: D5 and REQ-0042/0043 require a reference for the routing-time CREATE approval, while DR-0299 preserves the existing questions for the other operations. DPOL-04 requires a recorded human answer without requiring a second carrier on those rows; one CLI-VAL change removes an unreachable Binding branch; disagreeing: RA proposed a new question kind, operation and target fields, and a Binding branch for every approval; rejected as more mechanism than the request needs | PASS |
| 40 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K5 The shared-obligation Boundary rule | settled recommendation and cited specifications | Decision: **A new rule, BR-0013-0036** (AC-Refs AC-0013-0034): a seeded row on an obligation that already has a row names a `Boundary`, and each existing sibling lacking one gains its slug, with `Status` and `Evidence` unchanged. EX-0013-0028's `BR-Ref` names BR-0013-0028 and BR-0013-0036; reason: BR-0013-0028's title says seeding changes no existing row; the slug is the one change to an existing row, so as a bullet it would contradict its own BR; disagreeing: SA (a bullet on BR-0013-0028; not taken) | PASS |
| 41 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K6 The owner of a missing environment | settled recommendation and cited specifications | Decision: Merged. Contract: CLI-WF `### Stage result` states `resolvingOwner`'s domain, a skill a plan names or `operator`. Obligation: BR-0014-0030 is **split**. Three repair kinds return `needs_repair` with `resolvingOwner` `qfai-sdd`, `qfai-atdd` or `qfai-implement`. A missing environment is not a repair: verify returns `blocked`, blocker `stage-blocked`, cleared by `operator`. AC-0014-0027 is reworded to match; reason: The field needs a domain the core can dispatch to, and the environment case already fits the blocker set (REQ-0039); disagreeing: none | PASS |
| 42 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K7 A blocked seam-only result | settled recommendation and cited specifications | Decision: Contract, the seam paragraph: a `blocked` or `unrun` seam-only result blocks the run like any result; the parent acceptance attempt stays open; once `resume` clears it, `next` reissues the seam-only work order as a new attempt; a `needs_repair` seam result routes by its `debts` (R1). No BR changes; one TC in spec-0011; reason: What `next` issues is the core's behaviour; disagreeing: none | PASS |
| 43 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K8 BR-0001-0019's "three" | settled recommendation and cited specifications | Decision: RA-07 A: BR-0001-0019 says the drift protocol's minimal whitelist keeps every exception it lists and gains the two bugfix exceptions (DR-0297); EX-0001-0015 changes only if it counts entries; reason: The spec owns the change to the whitelist, not a copy of it; disagreeing: none | PASS |
| 44 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-09 The unrecorded stop | settled recommendation and cited specifications | Decision: BR-0018-0076: "at the next `resume`"; reason: CLI-WF fires `running → interrupted` from `resume` only (N28); disagreeing: none | PASS |
| 45 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-10 Choosing between runs | settled recommendation and cited specifications | Decision: BR-0018-0066: the worktree's one non-terminal run is what "continue" resumes, so REQ-0002's choice is never put; reason: `run-active` and `identity-mismatch` rule out two candidates (N09, N10); disagreeing: none | PASS |
| 46 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-11 start inputs | settled recommendation and cited specifications | Decision: BR-0018-0011 names `request`, `completionTarget` and `harness`, and says the scope is fixed at routing; reason: CLI-WF `### start`; disagreeing: none | PASS |
| 47 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-12 Debt resolution | settled recommendation and cited specifications | Decision: Option C. **Contract** (CLI-WF `## Completion`): a debt is resolved when the `finish` validate, or a later accepted result of the stage kind that detected it, no longer reports its `findingCode` at its `path`; otherwise it stays `debt-open` with its `resolvingOwner`. **Obligation** (BR-0018-0026): a debt only another spec can resolve keeps the run from completing, as REQ-0037 states, and is repaired by that spec outside the run; reason: Without a resolution, completion is unreachable after any debt; closes the wave-2 advisory; disagreeing: none | PASS |
| 48 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-13 The request-kind clause | settled recommendation and cited specifications | Decision: Contract, the `scope-escape` row of `### Route proposal`: "…, or `requestKind` is not `change`"; reason: It writes down what S27 and DR-0018-0013 already took the row to say; disagreeing: none | PASS |
| 49 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-14 A replan's list | settled recommendation and cited specifications | Decision: Contract: each `priorStageReceiptRefs` entry of a work order is `{ ref, validity }`, with `validity` `valid`, `stale` or `unknown`; the remaining obligations are `ledger.rowIds`. BR-0018-0045 cites it; reason: REQ-0039's list becomes observable on the work order after a replan; disagreeing: none | PASS |
| 50 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-15 R5 narrowed | settled recommendation and cited specifications | Decision: Contract (`## Fail-closed`): a `reviewer-missing` message names `qfai init --force` when the shipped routing entry is absent, and otherwise names the manifest file and the dropped reviewer; reason: `--force` restores an absent entry but not a dropped reviewer. The user's J2 answer concerned what a plain upgrade leaves behind, and K17 of wave 3 already applies this line to R4; disagreeing: none | PASS |
| 51 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-16 The diagnosis names its rows | settled recommendation and cited specifications | Decision: Contract: `diagnosis` gains `matchedRowIds`; cause candidates and impact are content of the record `reproductionRef` names. BR-0011-0016 says so; reason: The core needs the row IDs to bind the `regression_fix` or `test_fix` work order (`ledger.rowIds`); disagreeing: none | PASS |
| 52 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-17 Evidence against write-scope | settled recommendation and cited specifications | Decision: Contract (`### Stage result`), **corrected**: `changedFiles` lists every changed path git does not ignore, and each must lie in a write area. A file a stage writes that git ignores is named in `artifactRefs`, is not a changed file, and is outside `write-scope`. BR-0011-0015: "changes no tracked project file"; reason: SA's directory list ("`.qfai/evidence/` apart from `workflow/`") is wrong. The managed `.gitignore` re-includes tracked governance evidence under `.qfai/evidence/` (`implement-*.md`, `atdd-*.md`, `change-request-*.md`, `decision-*.md`, `decisions/`, `prototyping/grilling.md`), which a stage writes and git tracks. The ignore status is the boundary `finish`'s diff already uses; disagreeing: SA (the directory list; corrected) | PASS |
| 53 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-18 The row digest | settled recommendation and cited specifications | Decision: Contract (`## Ledger row-set check`): the digest covers the row's cells and serves resume reconciliation; `accept` refuses only the two listed changes; any other cell edit is the stage owner's, judged by review; reason: The C3/E4 test fixes edit `Test file` and `Selector`; disagreeing: none | PASS |
| 54 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-19 Missing realization rows | settled recommendation and cited specifications | Decision: Rows added in spec-0018 (13) and spec-0015 (BR-0015-0003); reason: Phase 2c diffs the tables; disagreeing: none | PASS |
| 55 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-20 Lock keys on Windows | settled recommendation and cited specifications | Decision: Contract (CLI-INIT `### Windows parity`): "lock keys are project-relative paths with `/`"; reason: BR-0003-0058 states it, and no contract did; disagreeing: none | PASS |
| 56 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-21 Settled inputs | settled recommendation and cited specifications | Decision: Contract (`### Work order`): `settled`, listing the checked proposal's routing result ID and every answered question as `{ questionId, text, chosen }`. It is runtime only, and the tracked summary copies none of it. BR-0010-0013, AC-0010-0013, BR-0015-0021 and BR-0018-0058 cite it; reason: `inputs` is `{ path, digest }` and no file holds the answers; one field, no new file or writer; NFR-0014 holds, since the work order is under `.qfai/runs/`; disagreeing: none | PASS |
| 57 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-01 Record areas | settled recommendation and cited specifications | Decision: W14, narrowed as above: a separate `recordAreas` keyed on stage kind and bound spec; approval records, `workflow/` and spec `01`..`05`/`07`/`08`/`10` never included; the announcement and `scope.digest` cover the authorized scope only; reason: W05 needs the stage's own tracked records to pass `write-scope`; SA's wording let a stage write approval records and other specs' evidence; disagreeing: SA (the whole tracked evidence tree; narrowed) | PASS |
| 58 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-02 ROUTE-028 | settled recommendation and cited specifications | Decision: Rewrite ROUTE-028, keeping the counts at 24 and 64: one non-terminal run beside a terminal one, conversation binding missing; expected `requestKind: "resume"`, `requiresHumanInput: false`, `must: ["resume_checkpoint"]`, and a `forbid` token for resuming the terminal run, typed in the vocabulary by N41's rule; reason: The seed expects a choice between two live runs, which `run-active` makes unreachable (BR-0018-0066, 2C-SA-10); it stays distinct from ROUTE-027, which has no distractor; disagreeing: none | PASS |
| 59 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-03 DR-0018-0012's counts | settled recommendation and cited specifications | Decision: Four D5 rewrites (ROUTE-014, 035, 055, 056); the K2 bullet (ROUTE-044, 045, 022, 024) unchanged; a new ROUTE-028 bullet; Context counts matched. The DL-0012 twin matches; reason: The record must state what was rewritten; disagreeing: none | PASS |
| 60 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-04 The safety-relevant floor | settled recommendation and cited specifications | Decision: No fixed number anywhere. The floor is whatever N42's rule derives from the rewritten seed file and the typed vocabulary, recomputed before the delivery-planner records the list (by 2026-11-09). N42's "24" is superseded as a planning figure; OQ-0018-0015's text says "derived by the rule"; reason: Both inputs are still changing, and a literal floor in a TC would fail a correct recompute; disagreeing: none | PASS |
| 61 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-05 spec-0013 titles | settled recommendation and cited specifications | Decision: Accept, with one word more: BR-0013-0028 and AC-0013-0034 read "no existing row's status or evidence"; reason: It restates K5's outcome; the only edit to an existing row is the `Boundary` slug, which W11 leaves to the stage owner; disagreeing: none | PASS |
| 62 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-06 spec-0017 is reached | settled recommendation and cited specifications | Decision: Recorded: W13 reaches BR-0017-0071's realization row; re-read with no amendment. The 2c.1 "not reached" line is corrected; reason: BR-0017-0071's realization names CLI-INIT `### Windows parity`; disagreeing: none | PASS |
| 63 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): G1 Approval records at the proposal level | settled recommendation and cited specifications | Decision: W15, as above; reason: The security floor; DPOL-02, DPOL-04; closes the second route to the files 2C2-SA-01 kept out; disagreeing: SA (no contract write this pass; superseded by the finding) | PASS |
| 64 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-01 Tracked records of sdd, sdd_delta, discussion and UI-bearing prototype | settled recommendation and cited specifications | Decision: **Adopted, with conditions.** A spec-0018 rule says `qfai-run`'s proposal names, in `proposedWriteScope`, each file those stages write that the project's git does not ignore, **narrowest per kind**. `sdd_delta`: the packs its `affectedSpecIds` name. `sdd` for a new capability: `.qfai/specs/**` and `_policies/**`, the scope the CREATE question already puts. `discussion`: its non-ignored records, and `DESIGN.md` for a UI-bearing target. UI-bearing `prototype`: `.qfai/contracts/design/**`. Ignore status is the project's own (W05): in an adopter's managed block `.qfai/evidence/discussion-*.md` is ignored and needs no naming, while this repository tracks it. The announcement names these areas in the operator's words (REQ-0011). No path in `protected-surface`, W15 included, can be named. **TC:** one L3 asset TC reads `qfai-run`'s routing reference for the per-kind list; the core's `write-scope` behaviour is already covered and is not repeated per kind; reason: Stays within REQ-0012: every such write is inside the checked, announced scope the operator authorizes, and a wider read set widens nothing. It follows W14's own rule for a record outside the table, and these files are upstream SSOT the operator should see; disagreeing: SA (one L1 TC per kind; replaced by one L3 asset TC, since the core behaviour is already tested) | PASS |
| 65 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-02 Upstream drift found inside a run | settled recommendation and cited specifications | Decision: **Adopted, with conditions.** Inside a run a stage writes no Change Request and no decision record (W14, W15). A stage that finds upstream drift returns one of two things. (a) `needs_repair` with the finding owned by `qfai-sdd`, **only when** the upstream item lies inside the run's checked write scope, the part the operator authorized changing (REQ-0039: "a verify finding in a spec file produces an SDD work order"); if the repair would change an item's meaning beyond what the request asked, it goes the REQ-0039 replan way, which "updates the authorization". (b) Otherwise `blocked` with blocker `scope-dependency`, a member of CLI-WF's blocker set, whose halt notice names the drift and says the Change Request is raised through the drift protocol by invoking the owning stage by name, after which `resume` revalidates. **TCs:** the `blocked` / `scope-dependency` L1 row; a result writing `.qfai/decisions/CR-*.md` refused `write-scope` and a proposal naming it refused `protected-surface` (W15), as boundaries if TC-0018-0248 covers only `change-request-*.md`; reason: The drift protocol is kept, not bypassed. Its step 1 (stop the affected downstream work) is the run's `blocked` state, and its step 2 (create the CR at `Status: open`) is performed by the stage invoked by name, which is allowed to write it. No rule requires the raiser to be the same invocation. DPOL-02 and DPOL-04 hold: approval stays human, in the CR's approval fields. spec-0001 needs no edit; disagreeing: none | PASS |
| 66 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-03 spec-0013 titles | settled recommendation and cited specifications | Decision: Accepted as written ("no upstream item and no existing row's status or evidence"); no action; reason: 2C2-SA-05; disagreeing: none | PASS |
| 67 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-04 spec-0012's non-UI stop | settled recommendation and cited specifications | Decision: Consistent: no grant on a non-UI target, and BR-0012-0138 writes nothing there; reason: W14 `prototype` row; wave-2 F2; disagreeing: none | PASS |
| 68 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-05 The 2c.2 obligation writes | settled recommendation and cited specifications | Decision: Realized: BR-0018-0123, AC-0018-0047 and TC-0018-0246..0251 each resolve against W14. After W15, BR-0018-0123's never-granted list may cite `protected-surface`; that is a 2c.4 check; reason: Read in this pass; disagreeing: none | PASS |
| 69 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P01 Blocked-By on todo rows | settled recommendation and cited specifications | Decision: **SA-05 A.** The Phase 2b re-run clears `Blocked-By` on every `todo` row of this batch that holds a bare spec ID: the E2E rows of both directions, and the TCs X25 marked `Blocked-By spec-0018`. The order lives in the plans: TD-05's tiers in `## Test approach`, SA-04's units in `## Implementation approach`, and spec-0018's per-journey prerequisite rows as `spec-NNNN:TDD-NNNN`. An implementer who really blocks a row writes the grammatical cell then. **X25 is amended accordingly**; reason: `obligation-columns.md`: "Required on `blocked` rows, blank otherwise", in the form `<blocker> — blocked at <status>`. That no validator parses a `todo` cell (`parseBlockedBy` runs only on `blocked` rows) does not make the value grammatical. X25, my own wave-2 node, was wrong against it; disagreeing: TD (keep the cells; not taken) | PASS |
| 70 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P02 Test-module granularity | settled recommendation and cited specifications | Decision: **TD-10 A.** Test modules one per BR, and several TCs in one module only when they share a BR. The Phase 2b re-run rewrites spec-0018's `Test file` column, splitting `decide.test.ts` (273 rows) and `cli.test.ts` (75) by BR. **`Owning module` stays as seeded (SA-01)**: `decide.ts` whole, the production write set unchanged. For wave-2 and wave-3 specs the ledgers hold `Test file` `-`, and each plan names its modules per BR. **X18 is clarified**: "one new file per spec and subject" means per BR group, never one file per spec; reason: `test-layers.md`: "Default: one test module per `TC-*` … Grouping … when they verify the same BR … Above that, split by BR … A single `Test file` value shared by every row of a spec is an anti-pattern … `qfai-sdd` should emit a per-item `Test file`". SA-01 concerns the production file, which this leaves alone; disagreeing: none | PASS |
| 71 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P03 Journeys for the unreached stories | settled recommendation and cited specifications | Decision: Adopted as **three variants of existing spec-0018 journeys**, recorded in spec-0018 `06` `## E2E journeys`: a `discovery` variant through the discussion stage (US-0010-0013), a `feature` variant with `prototype_decision_needed` (US-0012-0144), and a handover variant asserting the deterministic half (US-0001-0010: a result with an unissued work-order ID is refused and nothing changes, and `qfai-run` is installed where the entry check points; the model's pickup stays release evidence). Each is annotated with the stage story's ID. **No new spec-0018 story or ledger row**: the E2E rows are the stage specs' own, which already exist. **No upgrade journey for US-0003-0029**: K01 of wave 3 settled that it is discharged by the spec-0018 journey whose first step runs `qfai init`, with the upgrade half held in L3 rows. TD-03's mapping table goes in spec-0018's plan; reason: Within the request: X10 already committed the spec-0018 journeys to discharge each stage story, and `QFAI-ATDD-111` needs them. Marking the stories `planned` would defer obligations the approved triage carries; disagreeing: TD (new journeys with ledger rows, and the upgrade journey; not taken) | PASS |
| 72 | architecture-reviewer (griller) | p3-griller | grilling(3/user): P04 X27 and pushes | working notes | B: push freely to a draft PR, merge only when every lane is green (user); decision and reason recorded in this row | PASS |
| 73 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P05 Coverage Depth Matrix pins | settled recommendation and cited specifications | Decision: The push that adds a spec's first matrix (spec-0001, 0004, 0010, 0011, 0012, 0015) also re-pins `full` with `--profile full --pin`, which strikes that spec's `QFAI-ATDD-131` entry. The six plans say so in `## Test approach`. No matrix is written in SDD; reason: The backlog rule re-pins a file that improves in the same change, and a count below its pin fails; disagreeing: none | PASS |
| 74 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P06 Units and tiers | settled recommendation and cited specifications | Decision: **Both, reconciled.** SA's six units are the implementation order in `## Implementation approach`; TD's five tiers are the green order in `## Test approach`. U1 = tier 1; U2, U3, U4 = tier 2; U6 = tiers 3 and 4, with the stage E2E rows closing at tier 5. **The Windows job (U5) lands after U1 and U4**, once its suite entries resolve (BR-0017-0074, TC-0017-0095), and does not wait for the journeys. The routing eval comes last, at release; reason: The Windows job needs its suites, not the journeys; disagreeing: TD (Windows at tier 5 after the journeys; not taken) | PASS |
| 75 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P07 Plan headings and form | settled recommendation and cited specifications | Decision: Under each existing section, one English subsection **`### Intent-driven entry (CAP-0018)`**, in all four sections and all eleven existing plans. A line this change makes false is rewritten in place, in English (TD-01; G14 in spec-0001). Legacy text and legacy risk rows are not touched. A risk section without the four columns gets its new rows as a four-column table inside the subsection (RA-01). spec-0018's new plan needs no subsection; reason: The validator's `QFAI-PLAN-003` matches `changelog`, `history` and `update history`, not a date, so both headings pass. A subject-named heading states what the plan covers, not when, which suits OC-04 (history belongs in `07` and `09`); disagreeing: RA, TD (`(2026-09-24)`; not taken) | PASS |
| 76 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P08 Risk-row ownership and form | settled recommendation and cited specifications | Decision: RA-04 A: one risk row per limit, in the plan that owns its record or mechanism; others cite it in an NFR bullet; L4 and L6 get two rows each, one per failure. RA-05 ratings (`low`/`med`/`high`, as `likelihood / impact`) and observable triggers. **Batch-level risks:** X27's row is in spec-0018's plan only, written from P04's answer. **RA-06's other two rows are dropped**: the `Blocked-By` cycle is removed by P01, and the module names are fixed by P02's re-run. spec-0008's third row (RA-10) is reworded to "the order is spec-0018's plan (P06)", since its cell is cleared; reason: One owner per mitigation stops five copies drifting; a resolved risk is not a risk; disagreeing: SA (X27 in every plan that adds E2E or ATDD rows; not taken) | PASS |
| 77 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P09 NFR approach | settled recommendation and cited specifications | Decision: RA-02 A: the three groups; group 2 (NFR-0002, 0015, 0017 wherever a shipped asset or an operator string changes) cites the existing guard. RA-03 A: a measurement is an observation that exists or is scheduled. NFR-0006, 0008 and 0018 are measured at a release step, with no claim before it (OC-80); reason: N46; OC-80; disagreeing: none | PASS |
| 78 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P10 spec-0018's new 10_Plan.md | settled recommendation and cited specifications | Decision: Three authors, one file, written in sequence to avoid conflicting edits. The solution-architect creates the file and writes `## Implementation approach` (the seven elements with their usages, U1..U6, the SSOT-modules step, and what it leaves out). Then the test-design-analyst writes `## Test approach` (TD-31, the tiers, the P03 mapping and variants, the fault-seed index, the eval). Then the requirements-analyst writes `## NFR approach` and `## Risk mitigation` (RA-18 rows, minus the two dropped under P08); reason: Each section is its owner's; disagreeing: none | PASS |
| 79 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P11 Elements, usages and what each plan leaves out | settled recommendation and cited specifications | Decision: Adopted as proposed: spec-0018's seven elements with at least three usages each; spec-0001 and spec-0003 each introduce one element; the others none, said in one line; the leave-out lists; the CLI-WF/CLI-WFFILE SSOT-modules move in U1; reason: The template's element rule; disagreeing: none | PASS |
| 80 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P12 Y1 in the plans | settled recommendation and cited specifications | Decision: spec-0014's and spec-0017's plans record Y1 = A with the counts (4 and 3) and the trigger "count differs, or `build` gains `origin/main`". Both record the CI gap that the dogfood lanes cannot run `QFAI-TRACE-001`; reason: Records the user's answer and decides nothing; disagreeing: none | PASS |
| 81 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P13 CR-20260913-0005's ID clash | settled recommendation and cited specifications | Decision: Out of this batch: one risk row in spec-0014's plan saying the CR takes the next free TDD ID at its approval; reason: Not this batch's change; disagreeing: none | PASS |
| 82 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P14 Windows job test approach | settled recommendation and cited specifications | Decision: Adopted, with P06's land order. spec-0003's tests go in `tests/integration/init/`; links are created in temp dirs; CRLF comes from fixtures; the temp root is read from the environment; the build is in the job; the trial run sets the baseline under Y6; reason: S24, S30, Y6; disagreeing: none | PASS |
| 83 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P15 The routing eval | settled recommendation and cited specifications | Decision: Adopted: the deterministic halves are CI rows; the runner is manual, run last at release; the record carries the three digests; two open inputs (OQ-0018-0013, OQ-0018-0015); English only; reason: N40, N42, N45, M20; disagreeing: none | PASS |
| 84 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P16 Known findings each plan records | settled recommendation and cited specifications | Decision: Adopted; the X27 line is written from P04's answer (under B, the expected-findings list per push); reason: A reviewer must not read them as new; disagreeing: none | PASS |
| 85 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P17 spec-0017 Tier | settled recommendation and cited specifications | Decision: Raise the seven spec-0017 rows to T2 in the P02 re-run **only if** the Phase 2b seeding rule ("seed `Tier` … from … what the item touches") names CI infrastructure as a raising factor; the test-design-analyst checks its text at write time and otherwise leaves `-`; reason: It applies an existing seeding rule, or nothing; disagreeing: none | PASS |
| 86 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P18 Per-spec risk and NFR rows | settled recommendation and cited specifications | Decision: Adopted as listed, with the P08 rewording for spec-0008 and the P04 answer for any X27 citation; reason: P08, P09; disagreeing: none | PASS |
| 87 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P19 Per-spec test approaches | settled recommendation and cited specifications | Decision: Adopted as listed, with three changes: TD-21's US-0003-0029 journey is K01's, not an upgrade journey (P03); each spec's order line cites P06; each module list is per BR (P02); reason: P02, P03, P06; disagreeing: TD (the upgrade journey; not taken) | PASS |

### Gaps / Open risks

- Pushes before ATDD and implementation land show `QFAI-ATDD-111/112` and RED acceptance tests; each push lists its expected findings in the relevant Plan under `Findings carried on purpose` and merge waits for every lane to be green (P04 = B).
- The push carrying this batch re-pins `full` for `discussion-20260418170937652` (pinned 2, now 0) and strikes the first-matrix `QFAI-ATDD-131` pins (spec-0001, 0004, 0010, 0011, 0012, 0015).

### Final status

- Final status: REVISE
- Rationale: reviewer findings are being addressed; the batch-wide sdd validation still contains pinned errors.

### CR-20260913-0012 scoped owner rerun

- Scope: This addendum records the approved Option 1 rerun only. The earlier batch's `Final status: REVISE` above remains its historical result.
- Approval and application: the user explicitly selected Option 1; `Applied at` is `2026-09-24T19:55:40Z`.
- Re-derived chain: the first `AC-0013-0008/0009/0010` headings retain their IDs; the contradictory second `0008` and superseded second `0010` are removed; the live optional-artifact criterion is `AC-0013-0042 → BR-0013-0021 → EX-0013-0021 → TC-0013-0036/0037`.
- Ledger: Phase 2b added `TDD-0129/0062` at `todo` with this CR in `DR-ID`. The preceding 60 rows retained their obligations, status and evidence.
- Validation: scoped SDD PASS, error 0 (run `20260925045254975`, report not committed); scoped drift PASS, error 0 (run `20260925045300751`, report not committed). The independent SDD completion review returned PASS.
- Remaining work: `/qfai-implement spec-0013` preflight, `/qfai-atdd spec-0013` for the two new rows and other owed ATDD rows, then implement resume. Binding to `sddPreflight.test.ts` must preserve or re-record spec-0002 `TDD-0001`'s file-hash evidence.
- Repository gate: the gate owner refreshed the `sdd` dogfood backlog pin with `node scripts/check-dogfood-backlog.mjs --profile sdd --pin` (exit 0). It now records 10 existing errors across 3 files; those global backlog errors remain outside this scoped PASS.

# Run: re-derive after the merge (2026-09-25)

## Objective

- Spec target: spec-0013
- Mode: `re-derive`. No Change Request drives it. The driving decision is
  DR-0013-0017 (`09_delta.md` DL-0013).
- Objective: move this pack's work-log removal chain off the IDs main gave the
  optional side artifact rules, onto the next free IDs, without changing its
  wording or obligations.

## Inputs reviewed

- Merge commit `eeadf8142` (parents `e37b2fa82` and `8214d0fdd`) and fix commit
  `25d428853`.
- `.qfai/specs/spec-0013/**`, and `09_delta.md` "Renumbering after the merge
  (2026-09-25)".
- Main's spec-0013 at `8214d0fdd`: last IDs `AC-0013-0028`, `BR-0013-0021`,
  `EX-0013-0021`, `TC-0013-0037` and `TDD-0109`.
- `.qfai/decisions/CR-20260913-0012-spec-0013-declares-three-acceptance-criterion-ids-twice.md`
  and
  `.qfai/decisions/CR-20260923-0010-five-spec-0013-rules-were-repointed-with-no-change-request-on-record.md`,
  which allocated the old IDs to main's rules.
- Grilling session `split-2026-09-25` S1: decision D6 and lookups L9, L10 and
  L11.
- Every file that cites the chain: spec-0011 `07_Decisions.md` and
  `09_delta.md`, spec-0004 `10_Plan.md`, `.qfai/evidence/sdd-spec-0011.md`,
  `.qfai/evidence/sdd-batch-20260923170018664.md`,
  `.qfai/evidence/atdd-spec-0004.md`, `.qfai/evidence/implement-spec-0004.md`,
  `.qfai/evidence/atdd-spec-0011.md`, `.qfai/evidence/atdd-spec-0013.md`,
  `.qfai/evidence/coverage-depth-spec-0013.md`,
  `packages/qfai/tests/integration/spec0013RecordHomes.test.ts`,
  `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts` and
  `packages/qfai/tests/assets/openRowAlreadyTested.test.ts`.

## Preflight summary path

- Preflight run id `run-20260925104025803`: ready, source `discussion-pack`,
  selected pack `discussion-20260923060900824`, 17 imported requirements, no
  pack gaps, no blockers. It rewrote the tracked latest-run pointer with this
  run's id.
- That result describes the tree after the renumber was written. An earlier
  preflight, run id `run-20260925062004313`, taken before the merge, was also
  ready on the same pack with 17 imported requirements and no pack gaps.

## Triage decisions

| Source       | Subject                                                                                                                                                                                                 | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR-0013-0017 | Renumber the work-log removal chain: AC-0013-0028 to AC-0013-0030, BR-0013-0021 to BR-0013-0023, EX-0013-0021 to EX-0013-0023, TC-0013-0036/0037 to TC-0013-0038/0039, TDD-0044..0049 to TDD-0110..0115 | UPDATE    | MODIFY | -           | Main's approved allocation gave the old IDs their meaning first. Wording and obligations do not change. No ledger row is deleted from the merged ledger, so `sdd-triage.md` Procedure step 5 asks no approval |

- Persisted in `09_delta.md` as `## Triage (2026-09-25)`, with `Existing Spec`
  `spec-0013` and `Depends-On` `-`, under `## Change Summary` and before
  `## Triage (2026-09-23)`.
- Impact cascade: spec-0011 and spec-0004 cite the chain only from a decision
  record, a delta note, a plan step and evidence. None of their US, AC, BR, EX
  or TC items names it, so the cascade adds no Triage row on those specs.
- **The fixed phase order was not kept.** The actual order:
  1. D6 settled the renumber in session `split-2026-09-25` S1, which ended at
     2026-09-25T00:04:49Z.
  2. The merge `eeadf8142` (00:50:12Z) wrote the renumber into the Phase 2,
     Phase 2b, Phase 3 and Phase 4 artifacts, and the fix `25d428853`
     (01:19:31Z) corrected it.
  3. This record's author reset the six `Evidence` cells (Phase 2b) and wrote
     the Stage 1 table `## Triage (2026-09-25)`.
  4. Stage 0 ran as `run-20260925104025803` (01:40:25Z).
  5. The `delivery-planner` Triage gate, the `solution-architect` design gate
     and the Reviewer Gate ran last.
- Cause: the renumber was made while the merge conflict with main was being
  resolved, so it was written before any Stage 0 or Stage 1 step ran.
- Why no harm follows:
  - D6 settled the operation before the first write.
  - `UPDATE` / `MODIFY` is approval-free, and the run deletes no ledger row.
  - Stage 1 stops for an approval-required row and for a `CREATE` row with no
    registered capability. This run has neither, so the late table bypassed
    nothing Stage 1 stops for.
  - Stage 0 `ready` holds for the tree after the edits, and the preflight taken
    before the merge was `ready` on the same input.

## Open questions

- none

## Decisions made

- DR-0013-0017 / DL-0013: the work-log removal chain moves to the next free
  IDs. Main's IDs keep their meaning.
  - Reason: main's approved `CR-20260913-0012` and `CR-20260923-0010` allocated
    the old IDs before this branch minted them, and main writes them into
    tests, evidence and four Change Requests.
  - Rule 4 of `spec-traceability-rules.md` ("a written `TDD-ID` is never
    renumbered") cannot hold on both sides. This side breaks it only in commit
    messages that have not merged, and the renumbering section maps them.
  - Rejected, recorded as `do_not` in DL-0013: renumbering main's side, and
    keeping both chains on the same IDs.
  - Adjudication `agents`: adopted from the recommendation of `split-griller`,
    and not critical. Disagreeing position: `split-planner`
    (`delivery-planner`) proposed the same route scoped to spec-0013 and the
    spec-0011 cross-spec entry. It was rejected on scope only.
- The six `DR-ID` cells stay `-`. The rows are newly seeded under their new
  IDs, not reset from an earlier state.

## Work performed

- Phase 2, IDs only:
  - `03_Acceptance-Criteria.md` `AC-0013-0030`; `04_Business-Rules.md`
    `BR-0013-0023` and its `AC-Refs`; `05_Examples.md` `EX-0013-0023` and its
    `BR-Ref`; `06_Test-Cases.md` `TC-0013-0038` and `TC-0013-0039` with their
    `EX-Ref` and `AC-Refs`.
  - DR-0013-0005..DR-0013-0016 in `07_Decisions.md` cite the new IDs and change
    nothing else.
  - DR-0013-0017 records the renumber itself.
  - `AC-0013-0029`, `BR-0013-0022` and `EX-0013-0022` keep their IDs.
- Phase 2b, ledger identity. The six rows are appended after main's
  `TDD-0109`, at `todo`, with `DR-ID` `-` and `Evidence` `-`:

  | Old TDD-ID | New TDD-ID | TC-Refs      | BR-Ref       | Boundary                       |
  | ---------- | ---------- | ------------ | ------------ | ------------------------------ |
  | TDD-0044   | TDD-0110   | TC-0013-0038 | BR-0013-0023 | `record-homes-stated`          |
  | TDD-0045   | TDD-0111   | TC-0013-0039 | BR-0013-0022 | `stop-steps-stated`            |
  | TDD-0046   | TDD-0112   | TC-0013-0038 | BR-0013-0023 | `no-worklog-section`           |
  | TDD-0047   | TDD-0113   | TC-0013-0038 | BR-0013-0023 | `no-pending-promotion-example` |
  | TDD-0048   | TDD-0114   | TC-0013-0038 | BR-0013-0023 | `no-surface-reference-in-tree` |
  | TDD-0049   | TDD-0115   | TC-0013-0039 | BR-0013-0022 | `no-worklog-entry-named`       |
  - Against the rows before the merge, Test file, Layer, Tier, owning module
    and Boundary are unchanged. Selector and `BR-Ref` change only in the IDs
    they carry: the six Selectors take the new TC prefix, and the four `BR-Ref`
    cells that named `BR-0013-0021` name `BR-0013-0023`.
  - `Evidence` is `-` on all six. It had kept the trail from before the
    renumber, which no longer describes these rows. Against `25d428853`, those
    six cells are the only change in the ledger.
  - Main's `TDD-0044`..`TDD-0049` and `TDD-0081`..`TDD-0083` are untouched. No
    row is deleted, so no tombstone is owed. The ledger holds 115 rows: main's
    109 and these six.
  - The rows are `todo` because a renumbered row keeps no evidence: D6, the
    reset in `sdd-triage.md` Ledger migration step 5, and the old-to-new
    correspondence of step 3 there, the SUPERSEDE precedent D6 follows. The
    test titles and annotations changed with the IDs, so the recorded runs no
    longer describe the test bytes. Those runs stay in
    `.qfai/evidence/atdd-spec-0013.md` as earlier rounds under the new
    headings.

- Phase 3: `10_Plan.md` cites `BR-0013-0023`. Critical Constraint 10: no
  finding, because the edit adds no architectural element.
- Phase 4:
  - `09_delta.md` gains "Renumbering after the merge (2026-09-25)" with the
    mapping, `## Triage (2026-09-25)` with the renumber row, DL-0013 under
    `## Decision Log` and its `## Update History` row.
  - DELTA-0001, the `## Triage (2026-09-23)` rows, the ledger bullets and the
    earlier Decision Log entries cite the new IDs.
  - There is no `## Change Requests` row, because no Change Request drives this
    run.
  - `## Triage (2026-09-25)` sits under `## Change Summary`, where
    `sdd-quality-gate.md` § Triage Checks places a Triage section.
- Phase 0, Phase 1 and Phase 2c were not entered. No contract and no
  `_policies` file changed. The Phase 2c result DR-0013-0014 still holds under
  the new IDs, and the API-row delta stays vacuous.
- Outside spec-0013, the same commits repointed DR-0011-0005 and the spec-0011
  delta notes, the spec-0004 plan step, `.qfai/evidence/sdd-spec-0011.md`,
  `.qfai/evidence/sdd-batch-20260923170018664.md`, the two test files and
  `openRowAlreadyTested.test.ts`.
- Evidence restating the six rows, corrected by this record's author:
  - `.qfai/evidence/atdd-spec-0013.md` `## First full CI checkpoint`: the
    closed rows are shown mapped, as history.
  - `.qfai/evidence/coverage-depth-spec-0013.md`
    `## Update: the work-log removal`: 39 test cases and 23 business rules.
    The totals are recounted over every scored table in that file:
    ✅ 85 / ⚠️ 119 / ❌ 312, `n/a` 30, across 546 cells. The restatement in
    `.qfai/evidence/atdd-spec-0013.md` `## Coverage Depth Matrix` carries the
    same figures.
- Completeness check. Every remaining occurrence of an old ID in tracked files
  was read:
  - Meaning main's rule: spec-0013 `03`..`06` and ledger rows
    `TDD-0044`..`TDD-0049` and `TDD-0081`..`TDD-0083`; `CR-20260912-0003`,
    `CR-20260913-0012`, `CR-20260923-0010` and `CR-20260924-0003`;
    `.qfai/evidence/atdd-spec-0013.md` and
    `.qfai/evidence/coverage-depth-spec-0013.md`;
    `sddOptionalArtifactPreflight.test.ts`, `specAutoDiscovery.test.ts` and
    `openRowAlreadyTested.test.ts`.
  - Naming the old IDs on purpose: the renumbering section of `09_delta.md`,
    DR-0013-0017, DL-0013, and the `Renumbered:` lines of
    `.qfai/evidence/atdd-spec-0013.md`.
  - Meaning this chain, and repointed by this record's author, each with the
    old ID in parentheses:
    - `.qfai/evidence/atdd-spec-0011.md` `## Cross-spec obligations`: spec-0013
      `TDD-0048` at `done`, now `TDD-0114` at `todo`.
    - Work Orders row 61, written identically in
      `.qfai/evidence/atdd-spec-0004.md` and
      `.qfai/evidence/implement-spec-0004.md`: spec-0013 `TDD-0048`, now
      `TDD-0114`. The first pass of this check read that row as a spec-0004 row
      and missed it.
  - The other `TDD-0044`..`TDD-0049` in the spec-0003, spec-0004, spec-0006,
    spec-0015 and spec-0017 ledgers, evidence and tests are those specs' own
    rows.

## Contract executability

- none

## Commands executed

```sh
git grep -n -E "AC-0013-0028|BR-0013-0021|EX-0013-0021|TC-0013-003[67]" -- .
git grep -n "spec-0013.*TDD-004[4-9]\|TDD-004[4-9].*spec-0013" -- .
git grep -c -E "TDD-004[4-9]" -- .
git diff origin/main HEAD -U0
cd packages/qfai && ./node_modules/.bin/tsup
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0013 --format github
node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec spec-0013 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format github
./node_modules/.bin/prettier --write <the edited spec files>
```

## Validate evidence paths

- Validate run id `run-20260925102605997`, scope `sdd`, `--spec spec-0013`,
  before the review pack was written: pass, 0 errors, 12 warnings, 4 info.
  - Warnings: 9 `QFAI-TRIAGE-010` on `_policies/10_delta.md`, 1
    `QFAI-LINK-001` on this checkout's skill wrappers, 1 `QFAI-DCON-034` on the
    sample `DESIGN.md`, and 1 `QFAI-TRACE-002` because spec-0013 has not
    adopted the optional traceability ledger.
  - No finding names a renumbered ID. The three `QFAI-ID-002` errors the first
    run carried are gone, because main removed the duplicate headings.
- Validate run id `run-20260925103254257`, scope `sdd`, whole repository: fail,
  11 errors, 61 warnings, 5 info. All 11 are `QFAI-TDDLIST-017` at their pins
  (spec-0006: 2, spec-0010: 1, spec-0012: 8). None is in spec-0013.
- Later runs carry the review pack while its verdicts are pending. That adds
  `QFAI-REVIEW-005` (no `Rxx_*.md` yet) and `QFAI-REVIEW-007` (`PENDING` is not
  an accepted status) on pack `review-20260925013156223`, which clear when the
  verdicts are written.
- After the `Evidence` reset, the Triage table and the preflight:
  - Validate run id `run-20260925104054319`, scope `sdd`, `--spec spec-0013`:
    fail, 2 errors, 12 warnings, 4 info. The 2 errors are the pending pack's.
    The new Triage table raises no finding.
  - Validate run id `run-20260925104056747`, scope `sdd`, whole repository:
    fail, 13 errors, 61 warnings, 5 info: the 11 pinned `QFAI-TDDLIST-017` and
    the pending pack's 2.
  - Validate run id `run-20260925104152276`, scope `tdd`, `--spec spec-0013`:
    9 errors, 22 warnings, 5 info. The 9 errors are `QFAI-TEST-003` in spec-0004
    and spec-0006 test files, pinned in `scripts/dogfood-backlog.json`. On the
    six rows only `TDDLIST_STALE_STATUS` remains: each test exists and resolves
    while the row is `todo`, as expected until the rows are completed again.
- After the fixes for review round 1. `summary.json` still reads `PENDING`,
  and `QFAI-REVIEW-005` is gone now that the `Rxx_*.md` files exist:
  - Validate run id `run-20260925111027888`, scope `sdd`, `--spec spec-0013`:
    fail, 1 error (`QFAI-REVIEW-007` on the pack), 12 warnings, 4 info.
  - Validate run id `run-20260925111030150`, scope `sdd`, whole repository:
    fail, 12 errors: the 11 pinned `QFAI-TDDLIST-017` and the same
    `QFAI-REVIEW-007`.
  - Validate run id `run-20260925111119367`, scope `tdd`, `--spec spec-0013`:
    the 9 pinned `QFAI-TEST-003` errors outside spec-0013, and no
    `QFAI-ATDD-13x` finding on the corrected coverage totals.
  - `node scripts/check-mdschema.mjs`: 49 files conform.
- After the verdicts were written into `summary.json`:
  - Validate run id `run-20260925111737225`, scope `sdd`, `--spec spec-0013`:
    pass, 0 errors, 12 warnings, 4 info.
  - Validate run id `run-20260925111739446`, scope `sdd`, whole repository:
    fail, 11 errors, all the pinned `QFAI-TDDLIST-017`.
  - `node scripts/check-mdschema.mjs`: 49 files conform.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                        | Evidence               |
| ----- | ------- | -------------------- | -------------------- | ------------------------------- | ---------------------- |
| 2     | run     | 2026-09-25T00:04:49Z | 2026-09-25T00:50:12Z | 1 settled, 0 escalated          | #work-orders-summary-1 |
| 3     | skipped | -                    | 2026-09-25T00:50:12Z | empty: answered by DR-0013-0017 | -                      |

- Batch record: none
- These rows belong to this run, the re-derive of 2026-09-25. The anchor
  `#work-orders-summary-1` is the second `## Work Orders Summary` in this file,
  the one below.
- The Phase 2 session is `split-2026-09-25` S1. It was a delegated session
  held to plan the split of the pull request, not a `/qfai-sdd` Phase 2
  session, and no Phase 2 drafting role took part. It ran one round and then
  adopted, because the author could not be reached. The convergence rule
  adopts after the second round. Recorded decisions answer D6 on their own:
  `CR-20260913-0012` and `CR-20260923-0010` allocated the old IDs to main. It ended `adopted` at 2026-09-25T00:04:49Z on revision
  `432346e11`, with 7 decisions, 0 open and 0 escalated. D6 is the only one
  that bears on spec-0013. No second session was held for this run.
- `Wrote at` is the merge commit `eeadf8142`, the first write of the renumber.
- Phase 3 only replaced a cited ID, which DR-0013-0017 already decides.
- Phase 2b and Phase 4 run no session. Phase 0, Phase 1 and Phase 2c were not
  entered.

## Work Orders Summary

| Step | Role (sub-agent)                                                                            | Agent instance    | Task title                                                                                                                            | Input (refs)                                                         | Output (refs)                                                                                                                                                                                                                                                                                                  | Status (PASS/REVISE/PENDING) |
| ---- | ------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | qa-gatekeeper                                                                               | split-griller     | grilling(2@re-derive-2026-09-25/agents): D6, renumber the work-log removal chain to the next free IDs and complete the six rows again | `split-2026-09-25` S1, lookups L9–L11                                | Adopted as DR-0013-0017. Main's approved allocation holds the old IDs, and renumbering main's side rewrites an approved record written into tests, evidence and four Change Requests. Disagreeing position: `split-planner` (`delivery-planner`), same route, narrower scope; rejected on scope                | PASS                         |
| 2    | backend-engineer, acting as this re-derive's author; not a drafting role `/qfai-sdd` routes | merge-author      | Apply D6 in the merge: Phase 2, 2b, 3 and 4 writes and the cross-spec repoints                                                        | D6; merge `eeadf8142`                                                | `eeadf8142`: the merge and the renumber across spec-0013 `03`..`07`, `09_delta.md`, `10_Plan.md` and `tdd/test-list.md`, spec-0011 `07` and `09`, spec-0004 `10_Plan.md`, the SDD evidence and the two test files                                                                                              | PASS                         |
| 3    | backend-engineer, acting as this re-derive's author; not a drafting role `/qfai-sdd` routes | postmerge-author  | Settle what the merge left behind in spec-0013                                                                                        | fix `25d428853`                                                      | `25d428853`: `DR-ID` `-` on the six rows, DR-0013-0017 removed (restored by work order 4), and the stale delta sentence fixed                                                                                                                                                                                  | PASS                         |
| 4    | test-design-analyst                                                                         | sdd13-author      | Renumber completeness check, Phase 2b `Evidence` reset, DR-0013-0017 and DL-0013, this run's record and review pack                   | the old and new IDs across the tracked tree; the validate runs above | `Evidence` `-` on TDD-0110..TDD-0115; DR-0013-0017; DL-0013; three references repointed in `.qfai/evidence/atdd-spec-0011.md`, `atdd-spec-0004.md` and `implement-spec-0004.md`; counts corrected in `coverage-depth-spec-0013.md` and `atdd-spec-0013.md`; this block; review pack `review-20260925013156223` | PASS                         |
| 5    | test-design-analyst                                                                         | sdd13-author      | Stage 0 preflight for this re-derive                                                                                                  | current spec and discussion pack                                     | Run id `run-20260925104025803`: ready, 17 imported requirements, no pack gaps                                                                                                                                                                                                                                  | PASS                         |
| 6    | test-design-analyst                                                                         | sdd13-author      | Persist the renumber row as `## Triage (2026-09-25)` in `09_delta.md`                                                                 | this block's Triage row                                              | `09_delta.md` `## Triage (2026-09-25)`; mdschema and markdownlint pass                                                                                                                                                                                                                                         | PASS                         |
| 7    | delivery-planner                                                                            | sdd13-triage-gate | Triage gate (`slice-and-scope`, blocking) on the renumber row                                                                         | the persisted Triage row                                             | Round 1 REVISE: R1 Selector and `BR-Ref` statements, R2 phase order not recorded. Round 2 PASS at `working-tree+e8d99603a2ef1af37759bf647f2da7953b6929fe1828608a44ebe2328c56742b`; its advisory A1 (conservation sentence in the Triage `Rationale`) is applied                                                | PASS                         |
| 8    | solution-architect                                                                          | sdd13-design-gate | `design` span gate (blocking) on the renumbered artifacts                                                                             | spec-0013 `03`..`10`, `tdd/test-list.md`                             | PASS, with advisories A1 to A3, applied                                                                                                                                                                                                                                                                        | PASS                         |
| 9    | completion-reviewer                                                                         | sdd13-cr          | Reviewer Gate cycle 1 of this run                                                                                                     | review pack `review-20260925013156223`                               | `R01` round 1 REVISE: F-B1 and F-B2. Round 2 PASS at `working-tree+e8d99603a2ef1af37759bf647f2da7953b6929fe1828608a44ebe2328c56742b`; its advisories A2-EOL and A2-WO are applied                                                                                                                              | PASS                         |
| 10   | qa-gatekeeper                                                                               | sdd13-qa          | Reviewer Gate cycle 1 of this run                                                                                                     | review pack `review-20260925013156223`                               | `R02` round 1 PASS at `working-tree+bb830f1cec2ff077d793b1584a5f355d48c5b990157695638dc5fe7177da6dad`; its advisory A1 (coverage-depth counts) is applied                                                                                                                                                      | PASS                         |

## Gaps / Open risks

- The fixed phase order was not kept: the renumber was written before Stage 0
  and Stage 1 ran. `## Triage decisions` above records the actual order, the
  cause and why no harm follows.
- The review pack's `revision` is the tree round 2 reviewed, `working-tree+e8d99603a2ef1af37759bf647f2da7953b6929fe1828608a44ebe2328c56742b`. One
  edit followed it: the conservation sentence the Triage gate asked for in
  `09_delta.md` `## Triage (2026-09-25)`. The final tree is
  `working-tree+60123ca0ae373b61aef7016b59f80aabaed7a67d0fb322b5ac41902dcdef6646`.
- `.qfai/evidence/atdd-spec-0011.md` `## Cross-spec obligations` names
  `TDD-0114` at `todo` but still reads `closed`. D4 of session
  `split-2026-09-25` S1 settles what happens to it: the cross-spec tables in
  `.qfai/evidence/atdd-spec-0003.md` and `.qfai/evidence/atdd-spec-0011.md`
  are rewritten in the fields `cross-spec-ownership.md` defines, with an exact
  `File` path and a valid `Resolution` in place of `closed`. The spec-0011
  entry resolves through the completion review of `TDD-0114` when it is
  completed again on the changed tree.
- The six rows need `/qfai-atdd` and `/qfai-implement` again before the change
  is complete.
- The gaps the first run recorded for `TDD-0114` still hold under its new ID.
- Not independent reviewers for this run: `sdd13-author`, `split-griller`,
  `split-planner`, `merge-author` and `postmerge-author`.

## Final status

- Final status: PASS
- Rationale: every routed blocking gate passed. The Triage gate and `R01`
  passed in round 2 on `working-tree+e8d99603a2ef1af37759bf647f2da7953b6929fe1828608a44ebe2328c56742b`, and the design gate and `R02` in round 1. The
  spec-scoped validate reports 0 errors, and the repository carries only the
  11 pinned errors. The six rows still need `/qfai-atdd` and
  `/qfai-implement`, and D4 still owes the cross-spec table rewrite; both are
  downstream work, not gates of this run.

---

# Run: re-derive under CR-20260925-0010 (2026-09-25)

## Objective

- Spec target: spec-0013
- Mode: `re-derive`, driven by the approved
  `.qfai/decisions/CR-20260925-0010-withdraw-the-work-log-absence-obligations.md`
  (step 3 of its rerun plan).
- Objective: withdraw the record-homes and approval-stop obligations and their
  six `red` ledger rows. The replacement `/qfai-sdd` skill text stays.

## Inputs reviewed

- `CR-20260925-0010`, whole record, and the approved Triage group G4.
- The amended pack `discussion-20260923060900824` (commit `4c2c398b4`):
  REQ-0007, REQ-0008, REQ-0017, `10_Policy.md` and `99_delta.md`
  `## Drift Events`.
- Review pack `review-20260925045812201`: `R02` advisory 2 (REQ-0007 and
  NFR-0006), carried to this re-derive.
- `.qfai/specs/spec-0013/**`, `.qfai/evidence/atdd-spec-0013.md`
  `### TDD-0110`..`### TDD-0115`.
- `packages/qfai/tests/integration/spec0013RecordHomes.test.ts`,
  `spec0013ApprovalStop.test.ts`, `packages/qfai/tests/assets/openRowAlreadyTested.test.ts`
  and `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts`.
- `.qfai/assistant/skills/qfai-sdd/SKILL.md`; references `sdd-triage.md`,
  `spec-traceability-rules.md`, `sdd-pre-draft-grilling.md`; template
  `templates/evidence/sdd-spec.md`.

## Preflight summary path

- Preflight run id `run-20260925143420772` (Stage 0): ready, source
  `discussion-pack`, selected pack `discussion-20260923060900824`, 17 imported
  requirements, no pack gaps, no blockers.
- Preflight run id `run-20260925150016061`, after Triage: the same result.

## Triage decisions

| Source                                | Subject                                                                                                                                | Operation | Sub-op | Approved By                            | Rationale                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | -------------------------------------- | ---------------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0007 | Remove AC-0013-0030, BR-0013-0023, EX-0013-0023, TC-0013-0038 and the REQ-0007 source line; TDD-0110, TDD-0112..0114 deleted and tombstoned | UPDATE    | REMOVE | user (Claude Code structured question) | REQ-0007 is checked by review; the rows tested the kept text or absences     |
| discussion-20260923060900824#REQ-0008 | Remove AC-0013-0029, BR-0013-0022, EX-0013-0022, TC-0013-0039 and the REQ-0008 source line; TDD-0111, TDD-0115 deleted and tombstoned   | UPDATE    | REMOVE | user (Claude Code structured question) | The stop steps stay pinned by `autoModeApprovalDegrade.test.ts`              |

- Persisted in `09_delta.md` as `## Triage (2026-09-25, CR-20260925-0010)`,
  under `## Change Summary` and above the renumbering round's
  `## Triage (2026-09-25)`, with `Depends-On` `-` on both rows. The qualifier
  names the Change Request because a second `## Triage (2026-09-25)` would be a
  duplicate heading, which markdownlint rejects.
- Approved by the user through a Claude Code structured question at
  2026-09-25T04:52:16Z. That one structured answer approved the Change Request
  (G0) and all four spec groups, G1 to G4, together.

## Open questions

- none

## Decisions made

- DR-0013-0018 / DL-0014: the record-homes and approval-stop obligations are
  withdrawn. Supersedes DR-0013-0006..DR-0013-0014, DR-0013-0016 and
  DR-0013-0017, and amends DR-0013-0005 and DR-0013-0015, because the skill
  text and the plan paragraph they decided stand. DR-0013-0017, the
  renumbering decision, is in that set because every ID it moved is withdrawn;
  its renumbering table in `09_delta.md` stays as history.
- DR-0013-0019 / DL-0015: `[RE-OPEN]` of DR-0013-0008. DL-0004 had rejected
  leaving an acceptance signal without a test; the user amended REQ-0007 to be
  checked by review. `09_delta.md` `## Rejected` points back at it through
  `Re-opened by:`.

## Work performed

- Phase 2:
  - `01_Spec.md`: the `discussion-20260923060900824#REQ-0007` and `#REQ-0008`
    lines removed.
  - `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`,
    `06_Test-Cases.md`: AC-0013-0029, AC-0013-0030, BR-0013-0022,
    BR-0013-0023, EX-0013-0022, EX-0013-0023, TC-0013-0038 and TC-0013-0039
    removed.
  - `07_Decisions.md`: 11 records marked superseded, 2 amended, two added; the
    count line
    reads 19, the number of records in the file.
- Phase 2b:
  - `tdd/test-list.md`: TDD-0110..TDD-0115 deleted; a new
    `## TDD-ID reservations` section, after the ledger table and before
    `## Notes`, holds their six tombstones. Each names the `red` status and
    points at the rounds recorded in `.qfai/evidence/atdd-spec-0013.md`,
    because the rows carried `Evidence` `-`.
  - Downstream ledger sweep: no row is reset. A cell-by-cell comparison with
    `HEAD` shows the other 109 rows unchanged.
- Phase 3: `10_Plan.md` no longer cites BR-0013-0022 and BR-0013-0023, and says
  the skill text is checked by review with no test of its own. Critical
  Constraint 10: no finding.
- Phase 4: `09_delta.md` gains DELTA-0002 in `## Change Summary`,
  `## Triage (2026-09-25, CR-20260925-0010)`, DL-0014 and DL-0015 with their
  `## Update History` rows, one `## Rejected` candidate with `Re-opened by:`,
  a pointer in DL-0004, and the `CR-20260925-0010` row in `## Change Requests`
  (`Applied at` `-`).
- Carried reviewer advisory (`R02` advisory 2): recorded in the Triage section
  and in DR-0013-0018. The review that checks REQ-0007 searches the shipped
  assistant tree for both `.qfai/steering/` and `worklog-entry.schema.md`.
- Tests to delete, owned by other stages, in the same commit:
  - `/qfai-atdd`: `packages/qfai/tests/integration/spec0013RecordHomes.test.ts`,
    all four `it` blocks (TDD-0110 "the qfai-sdd skill sends a decision ...",
    TDD-0112 "... has no Work-log entries section", TDD-0113 "... cites no
    W-PENDING-PROMOTION example", TDD-0114 "no file of the shipped assistant
    tree names ..."), and
    `packages/qfai/tests/integration/spec0013ApprovalStop.test.ts`, both `it`
    blocks (TDD-0111 "... each state the three stop steps", TDD-0115 "none of
    the three files names a work-log entry or consultation-needed").
  - `/qfai-implement`: the six `KNOWN_OPEN_BUT_TESTED` entries for
    TDD-0110..TDD-0115 at `packages/qfai/tests/assets/openRowAlreadyTested.test.ts:107-112`,
    and the two entries in `packages/qfai/tsconfig.tests.json`.
- Phase 0, Phase 1 and Phase 2c were not entered: no contract, no `_policies`
  file and no remaining obligation changed.

## Contract executability

- none

## Commands executed

```sh
cd packages/qfai && ./node_modules/.bin/tsup
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0013 --format text
node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec spec-0013 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format text
node packages/qfai/dist/cli/index.mjs sdd preflight
./node_modules/.bin/prettier --write <the edited spec files>
./node_modules/.bin/markdownlint-cli2 <the edited spec files>
node scripts/check-mdschema.mjs
node scripts/check-mermaid.mjs
node scripts/check-doc-clarity.mjs
```

## Validate evidence paths

- Validate run id `run-20260925143513072`, scope `sdd`, `--spec spec-0013`,
  before any write: pass, 0 errors, 12 warnings, 4 info.
- Validate run id `run-20260925145242006`, scope `sdd`, `--spec spec-0013`,
  after the writes: pass, 0 errors, 12 warnings, 4 info. The same findings.
- Validate run id `run-20260925145637262`, scope `tdd`, `--spec spec-0013`, on
  the spec files of `HEAD`: 9 errors, 16 warnings, 5 info.
- Validate run id `run-20260925145245192`, scope `tdd`, `--spec spec-0013`,
  after the writes: 11 errors, 16 warnings, 5 info. The two new errors are
  `QFAI-ATDD-102`, one per test file above: each still carries an annotation
  for a removed test case. They clear when the files are deleted. No
  `TDDLIST_TEST_FILE_MISSING` fires. The other 9 are the pinned
  `QFAI-TEST-003`.
- Validate run id `run-20260925145843475`, scope `sdd`, whole repository:
  11 errors, all the pinned `QFAI-TDDLIST-017`.
- After `/qfai-atdd` deleted the ten test files and `/qfai-implement` made its
  test edits, with the package rebuilt:
  - Validate run id `run-20260925155843592`, scope `sdd`, `--spec spec-0013`: 1 error,
    `QFAI-REVIEW-007` on this spec's review pack while its `summary.json`
    reads `PENDING`. The warnings are the same as before the run.
  - Validate run id `run-20260925155846071`, scope `tdd`, `--spec spec-0013`: 9 errors, the
    pinned `QFAI-TEST-003`, as on `HEAD`. No `QFAI-ATDD-102` and no
    `TDDLIST_TEST_FILE_MISSING`.
  - Validate run id `run-20260925155923587`, scope `sdd`, whole repository:
    15 errors: the 11 pinned `QFAI-TDDLIST-017` and one `QFAI-REVIEW-007` per
    pending pack.
- `check-mdschema`: 49 files conform. `check-mermaid`: 50 diagrams parse.
  markdownlint: 0 errors. `check-doc-clarity`: no local identifiers.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at             | Frontier                                                  | Evidence |
| ----- | ------- | -------- | -------------------- | --------------------------------------------------------- | -------- |
| 2     | skipped | -        | 2026-09-25T05:49:04Z | empty: answered by CR-20260925-0010, approved by the user | -        |
| 3     | skipped | -        | 2026-09-25T05:49:04Z | empty: answered by CR-20260925-0010, approved by the user | -        |

- Batch record: none
- These rows belong to this run, the re-derive under `CR-20260925-0010`. The
  anchor of this run's work orders is `#work-orders-summary-2`, the third
  `## Work Orders Summary` in this file.
- The user settled every decision the phases write through `CR-20260925-0010`
  and its Triage group G4, approved at 2026-09-25T04:52:16Z, so no session was
  opened.
- `Wrote at` is the time of the post-write validate run, run id
  `run-20260925144904503`: both phases wrote between spec-0011's validate run
  and that run.
- Phase 2b and Phase 4 run no session. Phase 0, Phase 1 and Phase 2c were not
  entered.

## Work Orders Summary

| Step | Role (sub-agent)         | Agent instance       | Task title                                                                     | Input (refs)                                                                     | Output (refs)                                                                                                                                                                                                                                                                                                               | Status (PASS/REVISE/PENDING) |
| ---- | ------------------------ | -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst     | sdd-withdraw-author  | Stage 0 preflight, and the rerun after Triage                                  | the amended pack                                                                 | Run ids `run-20260925143420772` and `run-20260925150016061`: ready, 17 requirements, no pack gaps                                                                                                                                                                                                                           | PASS                         |
| 2    | requirements-analyst     | sdd-withdraw-author  | Persist Triage group G4 as `## Triage (2026-09-25, CR-20260925-0010)`          | `CR-20260925-0010`; approved Triage draft G4                                     | `09_delta.md` Triage section and the `## Change Requests` row                                                                                                                                                                                                                                                               | PASS                         |
| 3    | requirements-analyst     | sdd-withdraw-author  | Phase 2 and 2b: remove the items, delete and tombstone TDD-0110..0115          | settled by `CR-20260925-0010`                                                    | `01`..`07`, `tdd/test-list.md`; validate sdd `--spec spec-0013`: the baseline findings only                                                                                                                                                                                                                                 | PASS                         |
| 4    | requirements-analyst     | sdd-withdraw-author  | Phase 3 and Phase 4                                                            | `10_Plan.md`, `09_delta.md`                                                      | Plan paragraph; DELTA-0002, DL-0014, DL-0015, `## Rejected` candidate; Critical Constraint 10: no finding                                                                                                                                                                                                                   | PASS                         |
| 5    | delivery-planner         | withdraw-triage-gate | Triage gate (`slice-and-scope`, blocking)                                      | `09_delta.md` Triage section                                                     | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                                     | PASS                         |
| 6    | solution-architect       | withdraw-design-gate | `design` span gate (blocking)                                                  | spec-0013 `01`..`10`, `tdd/test-list.md`                                         | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                                     | PASS                         |
| 7    | completion-reviewer      | -                    | Reviewer Gate                                                                  | review pack `review-20260925150500013`                                           | not yet run                                                                                                                                                                                                                                                                                                                 | PENDING                      |
| 8    | qa-gatekeeper            | -                    | Reviewer Gate: the ledger and coverage changed                                 | review pack `review-20260925150500013`                                           | not yet run                                                                                                                                                                                                                                                                                                                 | PENDING                      |
| 9    | test-design-analyst      | withdraw-tda         | Test-design check of the withdrawal (`design` span)                            | `03`..`06`, `tdd/test-list.md`, `coverage-depth-spec-0013.md`                    | PASS: every surviving AC keeps an EX and a TC, and every TC a ledger row at its layer, as at `HEAD`; no example or TC asks for an absence test; TDD-0110..0115 tombstoned, each pointing at its rounds in `atdd-spec-0013.md`; coverage depth scores no withdrawn row. Corrected the stale coverage-depth bullet under Gaps | PASS                         |
| 10   | requirements-analyst     | sdd-withdraw-author  | Low fix L4/L5: DR-0013-0005 and DR-0013-0015 amended, not superseded           | DR-0013-0005, DR-0013-0015, DR-0013-0018                                         | `07_Decisions.md`: both `accepted` with `Amended by: DR-0013-0018`; DR-0013-0018 and the `09_delta.md` Triage bullet list the new supersede set                                                                                                                                                                             | PASS                         |
| 11   | requirements-analyst     | sdd-withdraw-author  | Low fix (Triage-gate advisory): approval note and post-deletion validate lines | this block; runs after the test deletion                                         | This block `## Triage decisions` (one answer approved G0 and G1 to G4), `## Validate evidence paths` (post-deletion runs), and the `QFAI-ATDD-102` line of `## Gaps / Open risks`                                                                                                                                           | PASS                         |
| 12   | test-design-analyst      | withdraw-tda         | Low fix: the coverage-depth line of `## Gaps / Open risks`                     | `.qfai/evidence/coverage-depth-spec-0013.md`                                     | This block `## Gaps / Open risks`, the coverage-depth line                                                                                                                                                                                                                                                                  | PASS                         |
| 13   | acceptance-test-engineer | withdraw-atdd        | Coverage-depth text and ATDD totals for the withdrawal                         | `.qfai/evidence/coverage-depth-spec-0013.md`; `.qfai/evidence/atdd-spec-0013.md` | Text of `coverage-depth-spec-0013.md` and the totals in `atdd-spec-0013.md`                                                                                                                                                                                                                                                 | PASS                         |

## Gaps / Open risks

- The two `QFAI-ATDD-102` errors cleared when the two test files were deleted
  and the six `openRowAlreadyTested.test.ts` entries removed; the post-deletion
  runs above show none.
- The replacement skill text has no dedicated test. The approval-stop steps
  stay pinned by `autoModeApprovalDegrade.test.ts`, whose absence assertions
  `/qfai-implement` removes under the Change Request's step 4.
- `.qfai/evidence/coverage-depth-spec-0013.md` and the
  `## Coverage Depth Matrix` of `.qfai/evidence/atdd-spec-0013.md` were
  recomputed by the stage that owns them. Neither scores a row for
  TC-0013-0038, TC-0013-0039 or their rules; this run does not edit them.
- The rounds of TDD-0110..TDD-0115 in `.qfai/evidence/atdd-spec-0013.md` stay
  as history, and the tombstones point at them.
- Not independent reviewers for this pack: `sdd-withdraw-author`.

## Final status

- Final status: REVISE
- Rationale: the spec side is written and validates as before, but the routed
  gates and reviewers are `PENDING`, so the stage is not done.
