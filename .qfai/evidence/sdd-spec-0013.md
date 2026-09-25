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
