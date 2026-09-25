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
  TC-0013-0038 checks the whole assistant tree.
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
| 3    | requirements-reviewer | p2-griller               | grilling(2/agents): TC-0013-0038 carries the tree-wide absence check                                                                                                           | X-D1                                                                                  | Every acceptance signal needs a test and no id is added; TC-0011-0013 keeps its own-directory clause; disagreeing position: requirements-analyst (only the TC widened)                                                                       | PASS                         |
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

---

# Run: re-derive under CR-20260925-0010 (2026-09-25)

## Objective

- Spec target: spec-0011
- Mode: `re-derive`, driven by the approved
  `.qfai/decisions/CR-20260925-0010-withdraw-the-work-log-absence-obligations.md`
  (step 3 of its rerun plan).
- Objective: withdraw the record-homes obligations and their ledger rows. The
  replacement `/qfai-implement` skill text stays.

## Inputs reviewed

- `CR-20260925-0010`, whole record, and the approved Triage group G3.
- The amended pack `discussion-20260923060900824` (commit `4c2c398b4`):
  REQ-0007, REQ-0017, `10_Policy.md` and `99_delta.md` `## Drift Events`.
- Review pack `review-20260925045812201`: `R02` advisory 2 (REQ-0007 and
  NFR-0006), carried to this re-derive.
- `.qfai/specs/spec-0011/**`, `.qfai/evidence/atdd-spec-0011.md`
  `### TDD-0021`..`### TDD-0023`.
- `packages/qfai/tests/integration/spec0011RecordHomes.test.ts`.
- `.qfai/assistant/skills/qfai-sdd/SKILL.md`; references `sdd-triage.md`,
  `spec-traceability-rules.md`, `sdd-pre-draft-grilling.md`; template
  `templates/evidence/sdd-spec.md`.

## Preflight summary path

- Preflight run id `run-20260925143420772` (Stage 0): ready, source
  `discussion-pack`, selected pack `discussion-20260923060900824`, 17 imported
  requirements, no pack gaps, no blockers.
- Preflight run id `run-20260925150016061`, after Triage: the same result.

## Triage decisions

| Source                                | Subject                                                                                                                                     | Operation | Sub-op | Approved By                            | Rationale                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | -------------------------------------- | ----------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0007 | Remove AC-0011-0012, BR-0011-0009, EX-0011-0010, TC-0011-0013 and the REQ-0007 source line; TDD-0021..0023 deleted and tombstoned           | UPDATE    | REMOVE | user (Claude Code structured question) | REQ-0007 is checked by review; the rows tested the kept text or absences |

- Persisted in `09_delta.md` as `## Triage (2026-09-25)`, under
  `## Change Summary` and above `## Triage (2026-09-23)`, with `Depends-On` `-`.
- Approved by the user through a Claude Code structured question at
  2026-09-25T04:52:16Z. That one structured answer approved the Change Request
  (G0) and all four spec groups, G1 to G4, together.

## Open questions

- none

## Decisions made

- DR-0011-0014 / DL-0012: the record-homes obligations are withdrawn.
  Supersedes DR-0011-0004..DR-0011-0011 and DR-0011-0013. Amends DR-0011-0003
  and DR-0011-0012, because the skill text and the plan paragraph they decided
  stand.
- No rejected option is taken: DL-0003's `do_not` ("Check the whole tree from
  two test cases") and DL-0011's ("Put independently failing checks behind one
  row") are not reintroduced, so nothing is re-opened.

## Work performed

- Phase 2:
  - `01_Spec.md`: the `discussion-20260923060900824#REQ-0007` line removed.
  - `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`,
    `06_Test-Cases.md`: AC-0011-0012, BR-0011-0009, EX-0011-0010 and
    TC-0011-0013 removed.
  - `07_Decisions.md`: 9 records marked superseded, 2 amended, DR-0011-0014
    added; the
    count line reads 13, the number of records in the file.
- Phase 2b:
  - `tdd/test-list.md`: TDD-0021..TDD-0023 deleted; a new
    `## TDD-ID reservations` section, after the ledger table and before
    `## Notes`, holds their three tombstones.
  - Downstream ledger sweep: no row is reset. A cell-by-cell comparison with
    `HEAD` shows the other 20 rows unchanged.
  - Each deleted row's `Evidence` cell is copied verbatim into the Triage
    section of `09_delta.md`.
- Phase 3: `10_Plan.md` no longer cites BR-0011-0009, and says the skill text
  is checked by review with no test of its own. Critical Constraint 10: no
  finding.
- Phase 4: `09_delta.md` gains DELTA-0002 in `## Change Summary`,
  `## Triage (2026-09-25)`, DL-0012 with its `## Update History` row, and a new
  `## Change Requests` section with the `CR-20260925-0010` row (`Applied at`
  `-`).
- Carried reviewer advisory (`R02` advisory 2): REQ-0007 cites NFR-0006 for
  `worklog-entry.schema.md`, which NFR-0006's token list does not name. The
  spec has no item left for REQ-0007, so the note is recorded in the Triage
  section and in DR-0011-0014: the review that checks REQ-0007 searches for
  both tokens.
- Tests to delete, owned by other stages, in the same commit:
  - `/qfai-atdd`: `packages/qfai/tests/integration/spec0011RecordHomes.test.ts`,
    all three `it` blocks (TDD-0021 "... records a stop in Blocked-By ...",
    TDD-0022 "the blocked -> todo bullet of execution-ledger.md closes no
    record", TDD-0023 "no qfai-implement skill file names .qfai/steering/ ...").
  - `/qfai-implement`: its entry in `packages/qfai/tsconfig.tests.json`.
- Phase 0, Phase 1 and Phase 2c were not entered: no contract, no `_policies`
  file and no remaining obligation changed.

## Contract executability

- none

## Commands executed

```sh
cd packages/qfai && ./node_modules/.bin/tsup
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0011 --format text
node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec spec-0011 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format text
node packages/qfai/dist/cli/index.mjs sdd preflight
./node_modules/.bin/prettier --write <the edited spec files>
./node_modules/.bin/markdownlint-cli2 <the edited spec files>
node scripts/check-mdschema.mjs
node scripts/check-mermaid.mjs
node scripts/check-doc-clarity.mjs
```

## Validate evidence paths

- Validate run id `run-20260925143510180`, scope `sdd`, `--spec spec-0011`,
  before any write: pass, 0 errors, 12 warnings, 4 info.
- Validate run id `run-20260925145208091`, scope `sdd`, `--spec spec-0011`,
  after the writes: pass, 0 errors, 12 warnings, 4 info. The same findings.
- Validate run id `run-20260925145541955`, scope `tdd`, `--spec spec-0011`, on
  the spec files of `HEAD`: 9 errors, 14 warnings, 5 info.
- Validate run id `run-20260925145211131`, scope `tdd`, `--spec spec-0011`,
  after the writes: 10 errors, 14 warnings, 5 info. The new error is
  `QFAI-ATDD-102` on `spec0011RecordHomes.test.ts`, which still carries the
  TC-0011-0013 annotation. It clears when the file is deleted. No
  `TDDLIST_TEST_FILE_MISSING` fires. The other 9 are the pinned
  `QFAI-TEST-003` in spec-0004 and spec-0006 test files.
- Validate run id `run-20260925145843475`, scope `sdd`, whole repository:
  11 errors, all the pinned `QFAI-TDDLIST-017`.
- After `/qfai-atdd` deleted the ten test files and `/qfai-implement` made its
  test edits, with the package rebuilt:
  - Validate run id `run-20260925155811284`, scope `sdd`, `--spec spec-0011`: 1 error,
    `QFAI-REVIEW-007` on this spec's review pack while its `summary.json`
    reads `PENDING`. The warnings are the same as before the run.
  - Validate run id `run-20260925155813876`, scope `tdd`, `--spec spec-0011`: 9 errors, the
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
| 2     | skipped | -        | 2026-09-25T05:47:36Z | empty: answered by CR-20260925-0010, approved by the user | -        |
| 3     | skipped | -        | 2026-09-25T05:47:36Z | empty: answered by CR-20260925-0010, approved by the user | -        |

- Batch record: none
- These rows belong to this run. The user settled every decision the phases
  write through `CR-20260925-0010` and its Triage group G3, approved at
  2026-09-25T04:52:16Z, so no session was opened.
- `Wrote at` is the time of the post-write validate run, run id
  `run-20260925144736260`: both phases wrote between spec-0004's validate run
  and that run.
- Phase 2b and Phase 4 run no session. Phase 0, Phase 1 and Phase 2c were not
  entered.

## Work Orders Summary

| Step | Role (sub-agent)         | Agent instance       | Task title                                                                     | Input (refs)                                                  | Output (refs)                                                                                                                                                                                                                                                                                               | Status (PASS/REVISE/PENDING) |
| ---- | ------------------------ | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst     | sdd-withdraw-author  | Stage 0 preflight, and the rerun after Triage                                  | the amended pack                                              | Run ids `run-20260925143420772` and `run-20260925150016061`: ready, 17 requirements, no pack gaps                                                                                                                                                                                                           | PASS                         |
| 2    | requirements-analyst     | sdd-withdraw-author  | Persist Triage group G3 as `## Triage (2026-09-25)`                            | `CR-20260925-0010`; approved Triage draft G3                  | `09_delta.md` `## Triage (2026-09-25)` and the new `## Change Requests` section                                                                                                                                                                                                                             | PASS                         |
| 3    | requirements-analyst     | sdd-withdraw-author  | Phase 2 and 2b: remove the items, delete and tombstone TDD-0021..0023          | settled by `CR-20260925-0010`                                 | `01`..`07`, `tdd/test-list.md`; validate sdd `--spec spec-0011`: the baseline findings only                                                                                                                                                                                                                 | PASS                         |
| 4    | requirements-analyst     | sdd-withdraw-author  | Phase 3 and Phase 4                                                            | `10_Plan.md`, `09_delta.md`                                   | Plan paragraph; DELTA-0002, DL-0012; Critical Constraint 10: no finding                                                                                                                                                                                                                                     | PASS                         |
| 5    | delivery-planner         | withdraw-triage-gate | Triage gate (`slice-and-scope`, blocking)                                      | `09_delta.md` `## Triage (2026-09-25)`                        | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                     | PASS                         |
| 6    | solution-architect       | withdraw-design-gate | `design` span gate (blocking)                                                  | spec-0011 `01`..`10`, `tdd/test-list.md`                      | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                     | PASS                         |
| 7    | completion-reviewer      | -                    | Reviewer Gate                                                                  | review pack `review-20260925150500011`                        | not yet run                                                                                                                                                                                                                                                                                                 | PENDING                      |
| 8    | qa-gatekeeper            | -                    | Reviewer Gate: the ledger and coverage changed                                 | review pack `review-20260925150500011`                        | not yet run                                                                                                                                                                                                                                                                                                 | PENDING                      |
| 9    | test-design-analyst      | withdraw-tda         | Test-design check of the withdrawal (`design` span)                            | `03`..`06`, `tdd/test-list.md`, `coverage-depth-spec-0011.md` | PASS: every surviving AC keeps an EX and a TC, and every TC a ledger row at its layer, as at `HEAD`; no example or TC asks for an absence test; TDD-0021..0023 tombstoned in the new `## TDD-ID reservations`; coverage depth scores no withdrawn row. Corrected the stale coverage-depth bullet under Gaps | PASS                         |
| 10   | requirements-analyst     | sdd-withdraw-author  | Low fix L4/L5: DR-0011-0003 and DR-0011-0012 amended, not superseded           | DR-0011-0003, DR-0011-0012, DR-0011-0014                      | `07_Decisions.md`: both `accepted` with `Amended by: DR-0011-0014`; DR-0011-0014 and the `09_delta.md` Triage bullet list the new supersede set                                                                                                                                                             | PASS                         |
| 11   | requirements-analyst     | sdd-withdraw-author  | Low fix (Triage-gate advisory): approval note and post-deletion validate lines | this block; runs after the test deletion                      | This block `## Triage decisions` (one answer approved G0 and G1 to G4), `## Validate evidence paths` (post-deletion runs), and the `QFAI-ATDD-102` line of `## Gaps / Open risks`                                                                                                                           | PASS                         |
| 12   | test-design-analyst      | withdraw-tda         | Low fix: the coverage-depth line of `## Gaps / Open risks`                     | `.qfai/evidence/coverage-depth-spec-0011.md`                  | This block `## Gaps / Open risks`, the coverage-depth line                                                                                                                                                                                                                                                  | PASS                         |
| 13   | acceptance-test-engineer | withdraw-atdd        | Coverage-depth text for the withdrawal                                         | `.qfai/evidence/coverage-depth-spec-0011.md`                  | Text of `coverage-depth-spec-0011.md`                                                                                                                                                                                                                                                                       | PASS                         |

## Gaps / Open risks

- `.qfai/evidence/coverage-depth-spec-0011.md` was recomputed by the stage
  that owns it. It scores no row for TC-0011-0013 or BR-0011-0009; this run
  does not edit it.
- The `QFAI-ATDD-102` error cleared when `spec0011RecordHomes.test.ts` was
  deleted; the post-deletion runs above show none.
- The replacement skill text has no dedicated test. The user accepted this in
  approving option 1.
- `.qfai/evidence/atdd-spec-0011.md` `## Cross-spec obligations` keeps its
  entries. Step 9 of the Change Request writes `Resolution: CR-20260925-0010`
  on TDD-0021..TDD-0023 there, after the Change Request is applied.
- Not independent reviewers for this pack: `sdd-withdraw-author`.

## Final status

- Final status: REVISE
- Rationale: the spec side is written and validates as before, but the routed
  gates and reviewers are `PENDING`, so the stage is not done.
