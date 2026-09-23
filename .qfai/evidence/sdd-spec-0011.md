# Evidence: /qfai-sdd (spec-0011)

## Objective

- Spec target: spec-0011
- Objective: the `/qfai-implement` skill names the existing home of each record
  instead of a work-log entry under `.qfai/steering/`.

## Inputs reviewed

- `discussion-20260923060900824` (REQ-0007), read through the batch record.
- `.qfai/evidence/sdd-batch-20260923170018664.md`: Stage 1, Phase 0 and Phase 1.
- `.qfai/specs/spec-0011/**` and `09_delta.md` `## Triage (2026-09-23)`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` and
  `references/execution-ledger.md`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/volume-policy.md`
  (tier table).

## Preflight summary path

- Preflight run id `run-20260923170018664`: ready, 17 imported requirements, no
  blockers. Stage 1 Triage was taken against this run.
- Preflight run id `run-20260923172043151`, the latest: ready, 17 imported
  requirements, no pack gaps. Its summary differs from the earlier run's only
  in the run id.

## Triage decisions

| Source                                | Subject                                                                     | Operation | Sub-op | Approved By | Rationale                                                             |
| ------------------------------------- | --------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0007 | Append AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013: record homes | UPDATE    | APPEND | -           | No item states the obligation, and the acceptance signal needs a test |

## Open questions

- none

## Decisions made

- DR-0011-0003 / DL-0001: decisions, consultations and out-of-scope discoveries
  leave the skill as a Change Request to `/qfai-sdd`; a stop stays in
  `Blocked-By`.
- DR-0011-0004 / DL-0002: texts of the four items, including the check that the
  `blocked -> todo` bullet closes no record.
- DR-0011-0005 / DL-0003: TC-0011-0013 checks the skill directory; spec-0013's
  TC-0013-0036 checks the whole assistant tree.
- DR-0011-0006 / DL-0004: `- Source:` line on AC-0011-0012 and a qualified
  requirement line in `01_Spec.md`.
- DR-0011-0007 / DL-0005: one BR, EX and TC for the new AC.
- DR-0011-0008 / DL-0006: TDD-0021..TDD-0023 are `T2`.
- DR-0011-0009 / DL-0007: their owning module is the skill directory.
- DR-0011-0010 / DL-0008: `Tier` is seeded on the new rows only.
- DR-0011-0011 / DL-0009: BR-0011-0009 is realized by the shipped skill text,
  with no contract — a contract for skill text is not needed.
- DR-0011-0012 / DL-0010: the plan names where the skill text is edited and
  cites spec-0004's plan for the order — the text lands with the check removal.
- DR-0011-0013 / DL-0011: TC-0011-0013 holds one ledger row per boundary —
  TDD-0021 `record-homes-stated`, TDD-0022 `resume-closes-no-record`, TDD-0023
  `no-surface-reference` — because each is fixed by a different edit and RED on
  one row would observe only the first. Taken in the Reviewer Gate fix by
  `test-design-analyst`, without a pre-draft grilling round, and adjudicated by
  cycle 2 (A2-DEC).
- Recorded in this file only, because neither fixes anything in the spec pack:
  P3-D1 (the usage-reference check counts only what this change adds) and
  P3-D4 (new plan text goes inside the template's sections, in English).

## Work performed

- Phase 2: appended AC-0011-0012, BR-0011-0009, EX-0011-0010 and TC-0011-0013
  (`Level: integration`, `Type: normal`); added
  `discussion-20260923060900824#REQ-0007` to `01_Spec.md`
  `## Relevant Requirements`; recorded DR-0011-0003..0010 in `07_Decisions.md`.
- Phase 2b: appended TDD-0021 to `tdd/test-list.md` at `todo`
  (`Integration`, `T2`, owning module
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement`, `BR-Ref`
  BR-0011-0009). No row was reset or retired. Prettier re-padded the table; a
  cell-level comparison against `HEAD` shows the 20 existing rows unchanged.
- `09_delta.md`: two ledger bullets under `## Triage (2026-09-23)`, including
  the `Tier` limit, plus `## Update History` and `## Decision Log` DL-0001..0008.
- Phase 2c: `07_Decisions.md` DR-0011-0011, `09_delta.md` DL-0009 and its
  `## Update History` row. No contract and no obligation changed.
- Phase 3: `10_Plan.md` gains one paragraph under `## Implementation approach`.
  `07_Decisions.md` DR-0011-0012, `09_delta.md` DL-0010 and its
  `## Update History` row.
- Critical Constraint 10: no finding. The new plan text introduces no
  architectural element: it names an edit inside one skill and cites
  spec-0004's plan for the order. The earlier sections were finalized by the
  runs that introduced them and were not re-audited (P3-D1).
- Phase 4: `09_delta.md` gains a `## Change Summary` with entry DELTA-0001,
  since the file had none. Its `## Update History` already holds DL-0001..0010.
  Each `### Plan` heading in the Decision Log now carries its DL-ID, which
  clears two markdownlint MD024 duplicates. The Triage row and the dated
  history stay as written. No `## Change Requests` row: the change record is
  the approved Triage set (P1-D5). Phase 4 settles no design decision, so no
  grilling row.
- Test-design review fix, cycle 1 (`test-design-analyst`, `tda-reviewfix`):
  TC-0011-0013 names three boundaries, `record-homes-stated`,
  `resume-closes-no-record` and `no-surface-reference`, and its absence
  check covers the "work-log entry" phrase EX-0011-0010 asserts. TDD-0021
  keeps the first boundary, and TDD-0022 and TDD-0023 are added at `todo`
  (DR-0011-0013, DL-0011). Ledger: 21 rows before, 23 after.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0011-0009 and AC-0011-0012: no contract under `.qfai/contracts/**`; realized
  by the shipped skill files under
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/`.
  `Blocked-By` resolves to the column of the shipped `tdd/test-list.md`
  template. `07_Decisions.md` and `08_Open-questions.md` resolve to the
  spec-pack templates and their schemas under `packages/qfai/assets/mdschema/spec/`.
  A Change Request resolves to `.qfai/decisions/CR-*` (DR-0011-0011).
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract, and nothing under `.qfai/contracts/` declares a `CON-API-*` or
  `CON-DB-*`. This phase wrote no contract, so its scope did not re-expand.

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0011 --format github
npx prettier --check --ignore-path .git/info/exclude <touched spec-0011 files>
npx prettier --write .qfai/specs/spec-0011/07_Decisions.md .qfai/specs/spec-0011/09_delta.md .qfai/specs/spec-0011/10_Plan.md
npx markdownlint-cli2 .qfai/specs/spec-0011/07_Decisions.md .qfai/specs/spec-0011/09_delta.md .qfai/specs/spec-0011/10_Plan.md
node scripts/check-mdschema.mjs
node scripts/check-doc-clarity.mjs
npx prettier --write .qfai/specs/spec-0011/09_delta.md
npx markdownlint-cli2 .qfai/specs/spec-0011/*.md .qfai/specs/spec-0011/tdd/*.md
node scripts/check-mdschema.mjs --scope all
node scripts/check-mermaid.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0011 --format text
```

## Validate evidence paths

- Validate run id `run-20260923182831805`, scope `sdd`, `--spec spec-0011`,
  before any write: pass, 0 errors, 26 warnings, 4 info.
- Validate run id `run-20260923184008702`, scope `sdd`, `--spec spec-0011`, after the
  writes: pass, 0 errors, 26 warnings, 4 info — the same findings as before the
  writes.
- Validate run id `run-20260923191423745`, scope `sdd`, `--spec spec-0011`,
  after Phase 2c and Phase 3: pass, 0 errors, 26 warnings, 4 info — the same
  findings as before.
- Validate run id `run-20260923193805947`, scope `sdd`, `--spec spec-0011`, after
  Phase 4: pass, 0 errors, 26 warnings, 4 info — the same findings as before.
  The whole-repository run is in the batch record.
- Final run `run-20260923214113936`, scope `sdd`, whole repository,
  after the Reviewer Gate closed: 15 errors repository-wide, all pinned and
  pre-existing. This spec's files carry 0 errors and 1 warning. Details in the batch record.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier               | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ---------------------- | -------------------- |
| 2     | run     | 2026-09-23T09:24:22Z | 2026-09-23T09:31:37Z | 8 settled, 0 escalated | #work-orders-summary |
| 2c.1  | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:09:45Z | 1 settled, 0 escalated | #work-orders-summary |
| 3     | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:11:40Z | 4 settled, 0 escalated | #work-orders-summary |

- Batch record: `.qfai/evidence/sdd-batch-20260923170018664.md`

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance           | Task title                                                                                                                                                                     | Input (refs)                                                                          | Output (refs)                                                                                                                                                                                                                                | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-reviewer | p2-griller               | grilling(2/agents): decisions and discoveries leave the skill as a Change Request                                                                                              | S11-D1                                                                                | The skill may not write `07_Decisions.md` or `08_Open-questions.md`; REQ-0007's "or" allows the Change Request half; writing them itself would be critical; author agreed                                                                    | PASS                         |
| 2    | requirements-reviewer | p2-griller               | grilling(2/agents): texts of AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013                                                                                            | S11-D2                                                                                | Griller added that EX-0011-0010 asserts no `archived` and no closing step on the `blocked -> todo` bullet, which has no path literal; disagreeing position: requirements-analyst (EX without it)                                             | PASS                         |
| 3    | requirements-reviewer | p2-griller               | grilling(2/agents): TC-0013-0036 carries the tree-wide absence check                                                                                                           | X-D1                                                                                  | Every acceptance signal needs a test and no id is added; TC-0011-0013 keeps its own-directory clause; disagreeing position: requirements-analyst (only the TC widened)                                                                       | PASS                         |
| 4    | requirements-reviewer | p2-griller               | grilling(2/agents): `- Source:` line on each new AC and a qualified requirement line                                                                                           | X-D2                                                                                  | Local REQ ids mean something else; every AC needs a Source and a copy-down; author agreed                                                                                                                                                    | PASS                         |
| 5    | requirements-reviewer | p2-griller               | grilling(2/agents): one BR and one TC per AC                                                                                                                                   | X-D3                                                                                  | The Triage lists one item per layer; `QFAI-COV-207` warnings go to the density review; author agreed                                                                                                                                         | PASS                         |
| 6    | requirements-reviewer | p2-griller               | grilling(2/agents): Tier `T2` on the new row                                                                                                                                   | X-D4                                                                                  | The row reads shipped files, which the tier table places at `T2`; author agreed                                                                                                                                                              | PASS                         |
| 7    | requirements-reviewer | p2-griller               | grilling(2/agents): owning module is the skill directory                                                                                                                       | X-D5                                                                                  | Lets TDD-0021 run beside the spec-0013 rows; author agreed                                                                                                                                                                                   | PASS                         |
| 8    | requirements-reviewer | p2-griller               | grilling(2/agents): seed Tier only on new and reset rows                                                                                                                       | X-D6                                                                                  | No driving Change Request; re-deriving would reset rows the change does not touch; found by griller                                                                                                                                          | PASS                         |
| 9    | requirements-analyst  | p2-author-0011-0013-0015 | Phase 2 and 2b draft: spec-0011                                                                                                                                                | settled S11-D1, S11-D2, X-D1..X-D6                                                    | `01_Spec.md`, `03`..`07`, `09_delta.md`, `tdd/test-list.md` (TDD-0021); validate sdd `--spec spec-0011`: 0 errors, no new finding                                                                                                            | PASS                         |
| 10   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 open decisions                                                                                                                                            | Phase 2 texts of BR-0011-0009; `10_Plan.md`                                           | P2C-D6 and P3-D1..D9 with positions; no critical recommendation                                                                                                                                                                              | PASS                         |
| 11   | architecture-reviewer | p2c3-griller             | grilling(2c/agents): BR-0011-0009 are realized by the shipped `qfai-implement` skill text, with no contract                                                                    | P2C-D6                                                                                | Each named home resolves to a template, a schema, a validator or `.qfai/decisions/`; a contract for skill text is not needed; author agreed                                                                                                  | PASS                         |
| 12   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the usage-reference check counts only elements this change adds, which is none                                                                             | P3-D1                                                                                 | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                                                                            | PASS                         |
| 13   | architecture-reviewer | p2c3-griller             | grilling(3/agents): the removal order lives in spec-0004's plan, and this plan cites it                                                                                        | P3-D2                                                                                 | spec-0004 owns every validator that makes the order matter, and six copies drift; author agreed                                                                                                                                              | PASS                         |
| 14   | architecture-reviewer | p2c3-griller             | grilling(3/agents): new plan text goes in subsections or paragraphs inside the template's sections, in English                                                                 | P3-D4                                                                                 | Keeps clear of the plan heading checks by construction, and follows the repository language; author agreed                                                                                                                                   | PASS                         |
| 15   | architecture-reviewer | p2c3-griller             | grilling(3/agents): one paragraph naming the edit path `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/`, then `pnpm sync:ssot`, and citing spec-0004's order | P3-D7                                                                                 | The text must land with the removal of `QFAI-TDDLIST-015`, which a reader of this plan alone would miss. Griller amended the paragraph to state the edit path; disagreeing position: solution-architect (skill files named without the path) | PASS                         |
| 16   | solution-architect    | p2c3-author              | Phase 2c and Phase 3 draft: spec-0011                                                                                                                                          | settled steps 11-15                                                                   | `07_Decisions.md` DR-0011-0011 and DR-0011-0012, `09_delta.md` DL-0009 and DL-0010, `10_Plan.md`; Critical Constraint 10: no finding; validate sdd `--spec spec-0011`: 0 errors                                                              | PASS                         |
| 17   | requirements-analyst  | p4-author                | Phase 4 delta update: spec-0011                                                                                                                                                | `09_delta.md` DL-0001..0010, `## Triage (2026-09-23)`                                 | `09_delta.md` `## Change Summary` DELTA-0001, `### Plan (DL-NNNN)` headings; markdownlint 0 errors; validate sdd `--spec spec-0011`: 0 errors                                                                                                | PASS                         |
| 18   | test-design-analyst   | tda-reviewfix            | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                                                           | `.qfai/specs/spec-0011/03..06`, `tdd/test-list.md`, `09_delta.md`; cycle-1 R03 A1     | TC-0011-0013 names three boundaries; TDD-0021 keeps one, TDD-0022 and TDD-0023 added; DR-0011-0013, DL-0011; ledger 21 -> 23 rows                                                                                                            | PASS                         |
| 19   | completion-reviewer   | gate-c1-completion       | Reviewer Gate cycle 1                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record                               | `review-20260923104053103` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst                                                                                                                                         | REVISE                       |
| 20   | architecture-reviewer | gate-c1-architecture     | Reviewer Gate cycle 1                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record                               | `review-20260923104053103` R02: REVISE — DR-0296 wording                                                                                                                                                                                     | REVISE                       |
| 21   | qa-gatekeeper         | gate-c1-qa               | Reviewer Gate cycle 1                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record                               | `review-20260923104053103` R03: PASS                                                                                                                                                                                                         | PASS                         |
| 22   | completion-reviewer   | gate-c2-completion       | Reviewer Gate cycle 2                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record, the cycle-1 answered demands | `review-20260923121814103` R01: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 23   | architecture-reviewer | gate-c2-architecture     | Reviewer Gate cycle 2                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record, the cycle-1 answered demands | `review-20260923121814103` R02: PASS, advisories only                                                                                                                                                                                        | PASS                         |
| 24   | qa-gatekeeper         | gate-c2-qa               | Reviewer Gate cycle 2                                                                                                                                                          | this file, `.qfai/specs/spec-0011/**`, the batch record, the cycle-1 answered demands | `review-20260923121814103` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                                                                           | PASS                         |

## Gaps / Open risks

- TDD-0009 and TDD-0010 cite `DR-0011-0002`, which `07_Decisions.md` does not
  declare. The new records start at DR-0011-0003 so that citation does not
  resolve to an unrelated decision. The missing record predates this change.
- TDD-0021..TDD-0023 wait on `/qfai-atdd` for their tests and on the
  skill-text edit (`discussion-20260923060900824#REQ-0007`). spec-0011's ledger
  has no pin and is held at zero, so all three must leave no ledger or ATDD
  error at the head of the change.
- When the skill text is rewritten, remove only the work-log sentences: the
  `exception` anomaly route to `.qfai/decisions/` in `qfai-implement/SKILL.md`
  stays, because TDD-0023 asserts the surface is absent, not that the listed
  homes are the only ones.

## Final status

- Final status: PASS
- Rationale: every routed blocking reviewer returned PASS in cycle 2
  (`review-20260923121814103`), and only the 15 pinned pre-existing errors
  remain repository-wide.
