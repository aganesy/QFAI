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

## Prior run (2026-09-24, intent-driven entry)

### Objective

Apply the approved UPDATE rows of the 2026-09-24 intent-driven entry Triage to spec-0011.

### Inputs reviewed

- `discussion-20260923171450572` (reference, not normative)
- `.qfai/specs/spec-0011/09_delta.md` `## Triage (2026-09-24 intent-driven entry)`
- `.qfai/contracts/cli/qfai-workflow.md`, `workflow-files.schema.md`, `qfai-init.md`, `qfai-validate.md`

### Preflight summary path

- Stage 0: `run-20260924042956656`; ready, 68 REQs, no blockers.
- After Triage: `run-20260924050220859`; ready, 68 REQs, no blockers.

### Triage decisions

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| REQ-0045 | A diagnose-only operation with four verdicts | UPDATE | APPEND | - | It takes the expected-behaviour reference and the scope and changes no product code. It returns a reproduction, cause candidates, impact, the matching obligations and one verdict: a missing test, a defective test, a regression on a `done` row, or an expectation that differs from the request, which reclassifies the run |
| REQ-0046 | `regression_fix` against a `done` row whose existing, correct test caught a regression | UPDATE | APPEND | - | D18. BR-0011-0002 and AC-0011-0002 stand: the row stays `done` with its status untouched. The same test turning GREEN again, plus the final verify, confirms the fix, and the run evidence records it. OQ-0009 fixes the stage name |
| REQ-0048 | `test_fix` for a defective Unit or Component test, or an Integration test whose TCs are all L1 or L2 | UPDATE | APPEND | - | D14. The fix leaves ledger status alone only while the expectation still points at the same AC or BR. It carries an independent review and a re-run in the run evidence. The acceptance-layer half is ATDD's, on spec-0008 |
| REQ-0038 | A seam-only work order during the ATDD round trip | UPDATE | APPEND | - | Implement lands only the minimal connection the acceptance test needs to reach its assertion, through the existing minimal-seam step. The main implementation waits for RED |
| REQ-0013 | A valid run binding satisfies the hard-required `primarySpecId` without asking | UPDATE | APPEND | - | The User Selection Flow asks only when no binding is supplied. Standalone invocation is unchanged |
| REQ-0034 | A long implement stage resumes at a ledger-item boundary through `checkpointRef` and a legal `operation` | UPDATE | APPEND | - | The run cites ledger IDs and never copies item state. Implement keeps its own phase order |
| REQ-0051, REQ-0052, REQ-0056 | Orchestrated mode for `/qfai-implement`: the entry check, the work-order scope and shared-snapshot reuse, with the ledger check never cached | UPDATE | APPEND | - | One `references/orchestrated-mode.md` cited by one line from `SKILL.md` (D12) |
| NFR-0003 | `qfai-implement/SKILL.md` grows by at most the one citation line | UPDATE | APPEND | - | The file is at 799 of its 800 lines |

### Open questions

- Recorded in `.qfai/specs/spec-0011/08_Open-questions.md` where this change opened or resolved one; the source pack's deferred OQs that this batch settled are cited from the settled sets in the Work Orders Summary below.

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
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --spec spec-0011 --fail-on error --format text`
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --format github`
- `node scripts/check-mdschema.mjs`, `node scripts/check-mermaid.mjs`, `node_modules/.bin/prettier --check`
- The repository build was used rather than `npx qfai`, which resolves a stale published copy; `packages/qfai/dist` was rebuilt from HEAD source with tsup.

### Validate evidence paths

- Spec-scoped validation: `run-20260924143652451`, pass, error=0, warning=25.
- Batch-wide sdd validation: `run-20260924145952965`, fail, error=27, warning=85. Twelve errors were pending review summaries; the other 15 are pre-existing pins in `scripts/dogfood-backlog.json`. The skill stop condition of error=0 was not met.

### Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 2     | run     | 2026-09-23T23:20:27.401Z | 2026-09-23T23:33:24.355Z | 34 settled (J2 by the user), 0 escalated | #work-orders-summary |
| 2c.1   | run     | 2026-09-24T01:02:25.952Z | 2026-09-24T01:03:17.857Z | 20 settled, 0 escalated | #work-orders-summary |
| 2c.2   | run     | 2026-09-24T01:21:57.179Z | 2026-09-24T01:22:52.841Z | 6 settled, 0 escalated | #work-orders-summary |
| 2c.3   | run     | 2026-09-24T01:32:36.673Z | 2026-09-24T01:33:16.642Z | 6 settled, 0 escalated | #work-orders-summary |
| 2c.4   | run     | 2026-09-24T01:42:20.096Z | 2026-09-24T01:42:53.910Z | 3 settled, 0 escalated | #work-orders-summary |
| 2c.5   | skipped | - | 2026-09-24T01:49:29.477Z | empty: answered by CLI-WF W16 (### Stage result, ## State machine); two TC wording fixes only | - |
| 3      | run     | 2026-09-24T02:07:28.733Z | 2026-09-24T05:09:32.408Z | 19 settled (P04 by the user), 0 escalated | #work-orders-summary |

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
| 29 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E1 Stories | settled recommendation and cited specifications | Decision: US-0011-0009..0012 as tabled; reason: X10; disagreeing: none | PASS |
| 30 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E2 Stage behaviour | settled recommendation and cited specifications | Decision: Operations {`diagnose-only`, `implement`, `seam-only`, `regression-fix`, `test-fix`}; binding, checkpoint, seam-only and the `test_fix` unit layers as tabled. The `test_fix` ledger effect is the same as C3, including the re-verify record; a meaning change is worded per R1; reason: One wording for both halves of D14; disagreeing: none | PASS |
| 31 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E3 Diagnose-only | settled recommendation and cited specifications | Decision: As proposed; the verdict set held literally in the TC; refusing a changed file is the core's; reason: REQ-0045; disagreeing: none | PASS |
| 32 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E4 regression_fix on a done row | settled recommendation and cited specifications | Decision: Production code only. The ledger row's cells are untouched (`Status` stays `done`), the GREEN re-run and review go in the stage result and the run evidence, **and** the re-run is appended as a re-verify record in the ledger's evidence section, in the existing form; reason: In an adopter whose `paths.srcDir` covers its code, a production change stales the `done` row (`QFAI-TDDLIST-009`), so without the record the final validate fails and `finish` is unmet. D18 fixes the row's status, which the record leaves alone; disagreeing: SA (the run evidence only; not taken) | PASS |
| 33 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E5 The DTC-19 lines | settled recommendation and cited specifications | Decision: Under the REQ-0046 row (AC-0011-0020); edits in place, no line added to SKILL.md; reason: X05, X06; disagreeing: none | PASS |
| 34 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): E6 Records, IDs, Phase 2b | settled recommendation and cited specifications | Decision: DR-0011-0015 (D14, unit layer) with DL-0001; DR-0011-0016 (D18) with DL-0002; DR-0297 cited; the RA IDs (DR-0011-0002 not minted); new blocks carry `- Level: L3`; reason: X09, X14; disagreeing: none | PASS |
| 35 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K1 regression_fix receipts | settled recommendation and cited specifications | Decision: Contract: `regressionFix: { testId, rerunRef, reviewRef }` on a `regression_fix` result, and `invalid-input` reason `regression-fix-receipt`. BR-0018-0039 unchanged; BR-0011-0019 names the field; TC-0018-0068 gains the refusal pair; reason: D18 names the same test, and only a field carries that; it mirrors `testFix`; disagreeing: none | PASS |
| 36 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K2 Direct-exclusion seeds | settled recommendation and cited specifications | Decision: Rewrite ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024 to cover the four missing direct-exclusion classes while keeping the 24 fault and 64 route seed counts; reason: REQ-0007 requires a routing seed for each excluded class. Those four seeds duplicate cases already carried by ROUTE-014, ROUTE-021 or ROUTE-031 after the user chose English-only prompts, so their slots can cover environment settings, SQL files, generated files and QFAI-owned skills or constitution. Each rewritten seed forbids `direct`; disagreeing: SA proposed recording a gap and adding no seed; rejected because it would leave four required classes untested | PASS |
| 37 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K3/K4 Non-CREATE approvals in a run | settled recommendation and cited specifications | Decision: `Authorization-Ref` is valid only on CREATE rows. Other approval-required operations keep the Stage 1 human question; the answer reaches the next attempt through `authorizationRefs`, and the row copies `answeredBy@date` into `Approved By` for the existing validator check; reason: D5 and REQ-0042/0043 require a reference for the routing-time CREATE approval, while DR-0299 preserves the existing questions for the other operations. DPOL-04 requires a recorded human answer without requiring a second carrier on those rows; one CLI-VAL change removes an unreachable Binding branch; disagreeing: RA proposed a new question kind, operation and target fields, and a Binding branch for every approval; rejected as more mechanism than the request needs | PASS |
| 38 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K5 The shared-obligation Boundary rule | settled recommendation and cited specifications | Decision: **A new rule, BR-0013-0036** (AC-Refs AC-0013-0034): a seeded row on an obligation that already has a row names a `Boundary`, and each existing sibling lacking one gains its slug, with `Status` and `Evidence` unchanged. EX-0013-0028's `BR-Ref` names BR-0013-0028 and BR-0013-0036; reason: BR-0013-0028's title says seeding changes no existing row; the slug is the one change to an existing row, so as a bullet it would contradict its own BR; disagreeing: SA (a bullet on BR-0013-0028; not taken) | PASS |
| 39 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K6 The owner of a missing environment | settled recommendation and cited specifications | Decision: Merged. Contract: CLI-WF `### Stage result` states `resolvingOwner`'s domain, a skill a plan names or `operator`. Obligation: BR-0014-0030 is **split**. Three repair kinds return `needs_repair` with `resolvingOwner` `qfai-sdd`, `qfai-atdd` or `qfai-implement`. A missing environment is not a repair: verify returns `blocked`, blocker `stage-blocked`, cleared by `operator`. AC-0014-0027 is reworded to match; reason: The field needs a domain the core can dispatch to, and the environment case already fits the blocker set (REQ-0039); disagreeing: none | PASS |
| 40 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K7 A blocked seam-only result | settled recommendation and cited specifications | Decision: Contract, the seam paragraph: a `blocked` or `unrun` seam-only result blocks the run like any result; the parent acceptance attempt stays open; once `resume` clears it, `next` reissues the seam-only work order as a new attempt; a `needs_repair` seam result routes by its `debts` (R1). No BR changes; one TC in spec-0011; reason: What `next` issues is the core's behaviour; disagreeing: none | PASS |
| 41 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K8 BR-0001-0019's "three" | settled recommendation and cited specifications | Decision: RA-07 A: BR-0001-0019 says the drift protocol's minimal whitelist keeps every exception it lists and gains the two bugfix exceptions (DR-0297); EX-0001-0015 changes only if it counts entries; reason: The spec owns the change to the whitelist, not a copy of it; disagreeing: none | PASS |
| 42 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-09 The unrecorded stop | settled recommendation and cited specifications | Decision: BR-0018-0076: "at the next `resume`"; reason: CLI-WF fires `running → interrupted` from `resume` only (N28); disagreeing: none | PASS |
| 43 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-10 Choosing between runs | settled recommendation and cited specifications | Decision: BR-0018-0066: the worktree's one non-terminal run is what "continue" resumes, so REQ-0002's choice is never put; reason: `run-active` and `identity-mismatch` rule out two candidates (N09, N10); disagreeing: none | PASS |
| 44 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-11 start inputs | settled recommendation and cited specifications | Decision: BR-0018-0011 names `request`, `completionTarget` and `harness`, and says the scope is fixed at routing; reason: CLI-WF `### start`; disagreeing: none | PASS |
| 45 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-12 Debt resolution | settled recommendation and cited specifications | Decision: Option C. **Contract** (CLI-WF `## Completion`): a debt is resolved when the `finish` validate, or a later accepted result of the stage kind that detected it, no longer reports its `findingCode` at its `path`; otherwise it stays `debt-open` with its `resolvingOwner`. **Obligation** (BR-0018-0026): a debt only another spec can resolve keeps the run from completing, as REQ-0037 states, and is repaired by that spec outside the run; reason: Without a resolution, completion is unreachable after any debt; closes the wave-2 advisory; disagreeing: none | PASS |
| 46 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-13 The request-kind clause | settled recommendation and cited specifications | Decision: Contract, the `scope-escape` row of `### Route proposal`: "…, or `requestKind` is not `change`"; reason: It writes down what S27 and DR-0018-0013 already took the row to say; disagreeing: none | PASS |
| 47 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-14 A replan's list | settled recommendation and cited specifications | Decision: Contract: each `priorStageReceiptRefs` entry of a work order is `{ ref, validity }`, with `validity` `valid`, `stale` or `unknown`; the remaining obligations are `ledger.rowIds`. BR-0018-0045 cites it; reason: REQ-0039's list becomes observable on the work order after a replan; disagreeing: none | PASS |
| 48 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-15 R5 narrowed | settled recommendation and cited specifications | Decision: Contract (`## Fail-closed`): a `reviewer-missing` message names `qfai init --force` when the shipped routing entry is absent, and otherwise names the manifest file and the dropped reviewer; reason: `--force` restores an absent entry but not a dropped reviewer. The user's J2 answer concerned what a plain upgrade leaves behind, and K17 of wave 3 already applies this line to R4; disagreeing: none | PASS |
| 49 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-16 The diagnosis names its rows | settled recommendation and cited specifications | Decision: Contract: `diagnosis` gains `matchedRowIds`; cause candidates and impact are content of the record `reproductionRef` names. BR-0011-0016 says so; reason: The core needs the row IDs to bind the `regression_fix` or `test_fix` work order (`ledger.rowIds`); disagreeing: none | PASS |
| 50 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-17 Evidence against write-scope | settled recommendation and cited specifications | Decision: Contract (`### Stage result`), **corrected**: `changedFiles` lists every changed path git does not ignore, and each must lie in a write area. A file a stage writes that git ignores is named in `artifactRefs`, is not a changed file, and is outside `write-scope`. BR-0011-0015: "changes no tracked project file"; reason: SA's directory list ("`.qfai/evidence/` apart from `workflow/`") is wrong. The managed `.gitignore` re-includes tracked governance evidence under `.qfai/evidence/` (`implement-*.md`, `atdd-*.md`, `change-request-*.md`, `decision-*.md`, `decisions/`, `prototyping/grilling.md`), which a stage writes and git tracks. The ignore status is the boundary `finish`'s diff already uses; disagreeing: SA (the directory list; corrected) | PASS |
| 51 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-18 The row digest | settled recommendation and cited specifications | Decision: Contract (`## Ledger row-set check`): the digest covers the row's cells and serves resume reconciliation; `accept` refuses only the two listed changes; any other cell edit is the stage owner's, judged by review; reason: The C3/E4 test fixes edit `Test file` and `Selector`; disagreeing: none | PASS |
| 52 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-19 Missing realization rows | settled recommendation and cited specifications | Decision: Rows added in spec-0018 (13) and spec-0015 (BR-0015-0003); reason: Phase 2c diffs the tables; disagreeing: none | PASS |
| 53 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-20 Lock keys on Windows | settled recommendation and cited specifications | Decision: Contract (CLI-INIT `### Windows parity`): "lock keys are project-relative paths with `/`"; reason: BR-0003-0058 states it, and no contract did; disagreeing: none | PASS |
| 54 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-21 Settled inputs | settled recommendation and cited specifications | Decision: Contract (`### Work order`): `settled`, listing the checked proposal's routing result ID and every answered question as `{ questionId, text, chosen }`. It is runtime only, and the tracked summary copies none of it. BR-0010-0013, AC-0010-0013, BR-0015-0021 and BR-0018-0058 cite it; reason: `inputs` is `{ path, digest }` and no file holds the answers; one field, no new file or writer; NFR-0014 holds, since the work order is under `.qfai/runs/`; disagreeing: none | PASS |
| 55 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-01 Record areas | settled recommendation and cited specifications | Decision: W14, narrowed as above: a separate `recordAreas` keyed on stage kind and bound spec; approval records, `workflow/` and spec `01`..`05`/`07`/`08`/`10` never included; the announcement and `scope.digest` cover the authorized scope only; reason: W05 needs the stage's own tracked records to pass `write-scope`; SA's wording let a stage write approval records and other specs' evidence; disagreeing: SA (the whole tracked evidence tree; narrowed) | PASS |
| 56 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-02 ROUTE-028 | settled recommendation and cited specifications | Decision: Rewrite ROUTE-028, keeping the counts at 24 and 64: one non-terminal run beside a terminal one, conversation binding missing; expected `requestKind: "resume"`, `requiresHumanInput: false`, `must: ["resume_checkpoint"]`, and a `forbid` token for resuming the terminal run, typed in the vocabulary by N41's rule; reason: The seed expects a choice between two live runs, which `run-active` makes unreachable (BR-0018-0066, 2C-SA-10); it stays distinct from ROUTE-027, which has no distractor; disagreeing: none | PASS |
| 57 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-03 DR-0018-0012's counts | settled recommendation and cited specifications | Decision: Four D5 rewrites (ROUTE-014, 035, 055, 056); the K2 bullet (ROUTE-044, 045, 022, 024) unchanged; a new ROUTE-028 bullet; Context counts matched. The DL-0012 twin matches; reason: The record must state what was rewritten; disagreeing: none | PASS |
| 58 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-04 The safety-relevant floor | settled recommendation and cited specifications | Decision: No fixed number anywhere. The floor is whatever N42's rule derives from the rewritten seed file and the typed vocabulary, recomputed before the delivery-planner records the list (by 2026-11-09). N42's "24" is superseded as a planning figure; OQ-0018-0015's text says "derived by the rule"; reason: Both inputs are still changing, and a literal floor in a TC would fail a correct recompute; disagreeing: none | PASS |
| 59 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-05 spec-0013 titles | settled recommendation and cited specifications | Decision: Accept, with one word more: BR-0013-0028 and AC-0013-0034 read "no existing row's status or evidence"; reason: It restates K5's outcome; the only edit to an existing row is the `Boundary` slug, which W11 leaves to the stage owner; disagreeing: none | PASS |
| 60 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-06 spec-0017 is reached | settled recommendation and cited specifications | Decision: Recorded: W13 reaches BR-0017-0071's realization row; re-read with no amendment. The 2c.1 "not reached" line is corrected; reason: BR-0017-0071's realization names CLI-INIT `### Windows parity`; disagreeing: none | PASS |
| 61 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): G1 Approval records at the proposal level | settled recommendation and cited specifications | Decision: W15, as above; reason: The security floor; DPOL-02, DPOL-04; closes the second route to the files 2C2-SA-01 kept out; disagreeing: SA (no contract write this pass; superseded by the finding) | PASS |
| 62 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-01 Tracked records of sdd, sdd_delta, discussion and UI-bearing prototype | settled recommendation and cited specifications | Decision: **Adopted, with conditions.** A spec-0018 rule says `qfai-run`'s proposal names, in `proposedWriteScope`, each file those stages write that the project's git does not ignore, **narrowest per kind**. `sdd_delta`: the packs its `affectedSpecIds` name. `sdd` for a new capability: `.qfai/specs/**` and `_policies/**`, the scope the CREATE question already puts. `discussion`: its non-ignored records, and `DESIGN.md` for a UI-bearing target. UI-bearing `prototype`: `.qfai/contracts/design/**`. Ignore status is the project's own (W05): in an adopter's managed block `.qfai/evidence/discussion-*.md` is ignored and needs no naming, while this repository tracks it. The announcement names these areas in the operator's words (REQ-0011). No path in `protected-surface`, W15 included, can be named. **TC:** one L3 asset TC reads `qfai-run`'s routing reference for the per-kind list; the core's `write-scope` behaviour is already covered and is not repeated per kind; reason: Stays within REQ-0012: every such write is inside the checked, announced scope the operator authorizes, and a wider read set widens nothing. It follows W14's own rule for a record outside the table, and these files are upstream SSOT the operator should see; disagreeing: SA (one L1 TC per kind; replaced by one L3 asset TC, since the core behaviour is already tested) | PASS |
| 63 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-02 Upstream drift found inside a run | settled recommendation and cited specifications | Decision: **Adopted, with conditions.** Inside a run a stage writes no Change Request and no decision record (W14, W15). A stage that finds upstream drift returns one of two things. (a) `needs_repair` with the finding owned by `qfai-sdd`, **only when** the upstream item lies inside the run's checked write scope, the part the operator authorized changing (REQ-0039: "a verify finding in a spec file produces an SDD work order"); if the repair would change an item's meaning beyond what the request asked, it goes the REQ-0039 replan way, which "updates the authorization". (b) Otherwise `blocked` with blocker `scope-dependency`, a member of CLI-WF's blocker set, whose halt notice names the drift and says the Change Request is raised through the drift protocol by invoking the owning stage by name, after which `resume` revalidates. **TCs:** the `blocked` / `scope-dependency` L1 row; a result writing `.qfai/decisions/CR-*.md` refused `write-scope` and a proposal naming it refused `protected-surface` (W15), as boundaries if TC-0018-0248 covers only `change-request-*.md`; reason: The drift protocol is kept, not bypassed. Its step 1 (stop the affected downstream work) is the run's `blocked` state, and its step 2 (create the CR at `Status: open`) is performed by the stage invoked by name, which is allowed to write it. No rule requires the raiser to be the same invocation. DPOL-02 and DPOL-04 hold: approval stays human, in the CR's approval fields. spec-0001 needs no edit; disagreeing: none | PASS |
| 64 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-03 spec-0013 titles | settled recommendation and cited specifications | Decision: Accepted as written ("no upstream item and no existing row's status or evidence"); no action; reason: 2C2-SA-05; disagreeing: none | PASS |
| 65 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-04 spec-0012's non-UI stop | settled recommendation and cited specifications | Decision: Consistent: no grant on a non-UI target, and BR-0012-0138 writes nothing there; reason: W14 `prototype` row; wave-2 F2; disagreeing: none | PASS |
| 66 | architecture-reviewer (griller) | p2c-griller | grilling(2c.3/agents): 2C3-SA-05 The 2c.2 obligation writes | settled recommendation and cited specifications | Decision: Realized: BR-0018-0123, AC-0018-0047 and TC-0018-0246..0251 each resolve against W14. After W15, BR-0018-0123's never-granted list may cite `protected-surface`; that is a 2c.4 check; reason: Read in this pass; disagreeing: none | PASS |
| 67 | architecture-reviewer (griller) | p2c-griller | grilling(2c.4/agents): 2C4-SA-01 What a blocked result says | settled recommendation and cited specifications | Decision: W16: option A with conditions 1–4 (the `blocked-repairable` refusal; an honest `owningSpec`; routing data only; one blocker, cleared by reissue, with core-derived blockers first); reason: BR-0018-0125, BR-0014-0033 and BR-0012-0138 each ask for a blocker, subject or owner the contract could not carry. The conditions keep a stage from escaping REQ-0039's repair routing; disagreeing: none; SA's option taken, tightened | PASS |
| 68 | architecture-reviewer (griller) | p2c-griller | grilling(2c.4/agents): 2C4-SA-02 No other spec cites protected-surface | settled recommendation and cited specifications | Decision: Confirmed: only spec-0018 (BR-0018-0124, TC-0018-0012, 0254, 0255, EX-0018-0145); reason: Grep over `.qfai/specs/**`; disagreeing: none | PASS |
| 69 | architecture-reviewer (griller) | p2c-griller | grilling(2c.4/agents): 2C4-SA-03 No other spec needs the approval-record limit | settled recommendation and cited specifications | Decision: Confirmed: spec-0001 (BR-0001-0018, 0019), spec-0011 (BR-0011-0017) and spec-0013 (BR-0013-0027) describe only the standalone path; reason: BR-0018-0125 routes in-run drift around them; disagreeing: none | PASS |
| 70 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P01 Blocked-By on todo rows | settled recommendation and cited specifications | Decision: **SA-05 A.** The Phase 2b re-run clears `Blocked-By` on every `todo` row of this batch that holds a bare spec ID: the E2E rows of both directions, and the TCs X25 marked `Blocked-By spec-0018`. The order lives in the plans: TD-05's tiers in `## Test approach`, SA-04's units in `## Implementation approach`, and spec-0018's per-journey prerequisite rows as `spec-NNNN:TDD-NNNN`. An implementer who really blocks a row writes the grammatical cell then. **X25 is amended accordingly**; reason: `obligation-columns.md`: "Required on `blocked` rows, blank otherwise", in the form `<blocker> — blocked at <status>`. That no validator parses a `todo` cell (`parseBlockedBy` runs only on `blocked` rows) does not make the value grammatical. X25, my own wave-2 node, was wrong against it; disagreeing: TD (keep the cells; not taken) | PASS |
| 71 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P02 Test-module granularity | settled recommendation and cited specifications | Decision: **TD-10 A.** Test modules one per BR, and several TCs in one module only when they share a BR. The Phase 2b re-run rewrites spec-0018's `Test file` column, splitting `decide.test.ts` (273 rows) and `cli.test.ts` (75) by BR. **`Owning module` stays as seeded (SA-01)**: `decide.ts` whole, the production write set unchanged. For wave-2 and wave-3 specs the ledgers hold `Test file` `-`, and each plan names its modules per BR. **X18 is clarified**: "one new file per spec and subject" means per BR group, never one file per spec; reason: `test-layers.md`: "Default: one test module per `TC-*` … Grouping … when they verify the same BR … Above that, split by BR … A single `Test file` value shared by every row of a spec is an anti-pattern … `qfai-sdd` should emit a per-item `Test file`". SA-01 concerns the production file, which this leaves alone; disagreeing: none | PASS |
| 72 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P03 Journeys for the unreached stories | settled recommendation and cited specifications | Decision: Adopted as **three variants of existing spec-0018 journeys**, recorded in spec-0018 `06` `## E2E journeys`: a `discovery` variant through the discussion stage (US-0010-0013), a `feature` variant with `prototype_decision_needed` (US-0012-0144), and a handover variant asserting the deterministic half (US-0001-0010: a result with an unissued work-order ID is refused and nothing changes, and `qfai-run` is installed where the entry check points; the model's pickup stays release evidence). Each is annotated with the stage story's ID. **No new spec-0018 story or ledger row**: the E2E rows are the stage specs' own, which already exist. **No upgrade journey for US-0003-0029**: K01 of wave 3 settled that it is discharged by the spec-0018 journey whose first step runs `qfai init`, with the upgrade half held in L3 rows. TD-03's mapping table goes in spec-0018's plan; reason: Within the request: X10 already committed the spec-0018 journeys to discharge each stage story, and `QFAI-ATDD-111` needs them. Marking the stories `planned` would defer obligations the approved triage carries; disagreeing: TD (new journeys with ledger rows, and the upgrade journey; not taken) | PASS |
| 73 | architecture-reviewer (griller) | p3-griller | grilling(3/user): P04 X27 and pushes | working notes | B: push freely to a draft PR, merge only when every lane is green (user); decision and reason recorded in this row | PASS |
| 74 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P05 Coverage Depth Matrix pins | settled recommendation and cited specifications | Decision: The push that adds a spec's first matrix (spec-0001, 0004, 0010, 0011, 0012, 0015) also re-pins `full` with `--profile full --pin`, which strikes that spec's `QFAI-ATDD-131` entry. The six plans say so in `## Test approach`. No matrix is written in SDD; reason: The backlog rule re-pins a file that improves in the same change, and a count below its pin fails; disagreeing: none | PASS |
| 75 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P06 Units and tiers | settled recommendation and cited specifications | Decision: **Both, reconciled.** SA's six units are the implementation order in `## Implementation approach`; TD's five tiers are the green order in `## Test approach`. U1 = tier 1; U2, U3, U4 = tier 2; U6 = tiers 3 and 4, with the stage E2E rows closing at tier 5. **The Windows job (U5) lands after U1 and U4**, once its suite entries resolve (BR-0017-0074, TC-0017-0095), and does not wait for the journeys. The routing eval comes last, at release; reason: The Windows job needs its suites, not the journeys; disagreeing: TD (Windows at tier 5 after the journeys; not taken) | PASS |
| 76 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P07 Plan headings and form | settled recommendation and cited specifications | Decision: Under each existing section, one English subsection **`### Intent-driven entry (CAP-0018)`**, in all four sections and all eleven existing plans. A line this change makes false is rewritten in place, in English (TD-01; G14 in spec-0001). Legacy text and legacy risk rows are not touched. A risk section without the four columns gets its new rows as a four-column table inside the subsection (RA-01). spec-0018's new plan needs no subsection; reason: The validator's `QFAI-PLAN-003` matches `changelog`, `history` and `update history`, not a date, so both headings pass. A subject-named heading states what the plan covers, not when, which suits OC-04 (history belongs in `07` and `09`); disagreeing: RA, TD (`(2026-09-24)`; not taken) | PASS |
| 77 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P08 Risk-row ownership and form | settled recommendation and cited specifications | Decision: RA-04 A: one risk row per limit, in the plan that owns its record or mechanism; others cite it in an NFR bullet; L4 and L6 get two rows each, one per failure. RA-05 ratings (`low`/`med`/`high`, as `likelihood / impact`) and observable triggers. **Batch-level risks:** X27's row is in spec-0018's plan only, written from P04's answer. **RA-06's other two rows are dropped**: the `Blocked-By` cycle is removed by P01, and the module names are fixed by P02's re-run. spec-0008's third row (RA-10) is reworded to "the order is spec-0018's plan (P06)", since its cell is cleared; reason: One owner per mitigation stops five copies drifting; a resolved risk is not a risk; disagreeing: SA (X27 in every plan that adds E2E or ATDD rows; not taken) | PASS |
| 78 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P09 NFR approach | settled recommendation and cited specifications | Decision: RA-02 A: the three groups; group 2 (NFR-0002, 0015, 0017 wherever a shipped asset or an operator string changes) cites the existing guard. RA-03 A: a measurement is an observation that exists or is scheduled. NFR-0006, 0008 and 0018 are measured at a release step, with no claim before it (OC-80); reason: N46; OC-80; disagreeing: none | PASS |
| 79 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P10 spec-0018's new 10_Plan.md | settled recommendation and cited specifications | Decision: Three authors, one file, written in sequence to avoid conflicting edits. The solution-architect creates the file and writes `## Implementation approach` (the seven elements with their usages, U1..U6, the SSOT-modules step, and what it leaves out). Then the test-design-analyst writes `## Test approach` (TD-31, the tiers, the P03 mapping and variants, the fault-seed index, the eval). Then the requirements-analyst writes `## NFR approach` and `## Risk mitigation` (RA-18 rows, minus the two dropped under P08); reason: Each section is its owner's; disagreeing: none | PASS |
| 80 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P11 Elements, usages and what each plan leaves out | settled recommendation and cited specifications | Decision: Adopted as proposed: spec-0018's seven elements with at least three usages each; spec-0001 and spec-0003 each introduce one element; the others none, said in one line; the leave-out lists; the CLI-WF/CLI-WFFILE SSOT-modules move in U1; reason: The template's element rule; disagreeing: none | PASS |
| 81 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P12 Y1 in the plans | settled recommendation and cited specifications | Decision: spec-0014's and spec-0017's plans record Y1 = A with the counts (4 and 3) and the trigger "count differs, or `build` gains `origin/main`". Both record the CI gap that the dogfood lanes cannot run `QFAI-TRACE-001`; reason: Records the user's answer and decides nothing; disagreeing: none | PASS |
| 82 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P13 CR-20260913-0005's ID clash | settled recommendation and cited specifications | Decision: Out of this batch: one risk row in spec-0014's plan saying the CR takes the next free TDD ID at its approval; reason: Not this batch's change; disagreeing: none | PASS |
| 83 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P14 Windows job test approach | settled recommendation and cited specifications | Decision: Adopted, with P06's land order. spec-0003's tests go in `tests/integration/init/`; links are created in temp dirs; CRLF comes from fixtures; the temp root is read from the environment; the build is in the job; the trial run sets the baseline under Y6; reason: S24, S30, Y6; disagreeing: none | PASS |
| 84 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P15 The routing eval | settled recommendation and cited specifications | Decision: Adopted: the deterministic halves are CI rows; the runner is manual, run last at release; the record carries the three digests; two open inputs (OQ-0018-0013, OQ-0018-0015); English only; reason: N40, N42, N45, M20; disagreeing: none | PASS |
| 85 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P16 Known findings each plan records | settled recommendation and cited specifications | Decision: Adopted; the X27 line is written from P04's answer (under B, the expected-findings list per push); reason: A reviewer must not read them as new; disagreeing: none | PASS |
| 86 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P17 spec-0017 Tier | settled recommendation and cited specifications | Decision: Raise the seven spec-0017 rows to T2 in the P02 re-run **only if** the Phase 2b seeding rule ("seed `Tier` … from … what the item touches") names CI infrastructure as a raising factor; the test-design-analyst checks its text at write time and otherwise leaves `-`; reason: It applies an existing seeding rule, or nothing; disagreeing: none | PASS |
| 87 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P18 Per-spec risk and NFR rows | settled recommendation and cited specifications | Decision: Adopted as listed, with the P08 rewording for spec-0008 and the P04 answer for any X27 citation; reason: P08, P09; disagreeing: none | PASS |
| 88 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P19 Per-spec test approaches | settled recommendation and cited specifications | Decision: Adopted as listed, with three changes: TD-21's US-0003-0029 journey is K01's, not an upgrade journey (P03); each spec's order line cites P06; each module list is per BR (P02); reason: P02, P03, P06; disagreeing: TD (the upgrade journey; not taken) | PASS |

### Gaps / Open risks

- Pushes before ATDD and implementation land show `QFAI-ATDD-111/112` and RED acceptance tests; each push lists its expected findings in the relevant Plan under `Findings carried on purpose` and merge waits for every lane to be green (P04 = B).
- The push carrying this batch re-pins `full` for `discussion-20260418170937652` (pinned 2, now 0) and strikes the first-matrix `QFAI-ATDD-131` pins (spec-0001, 0004, 0010, 0011, 0012, 0015).

### Final status

- Final status: REVISE
- Rationale: reviewer findings are being addressed; the batch-wide sdd validation still contains pinned errors.

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
