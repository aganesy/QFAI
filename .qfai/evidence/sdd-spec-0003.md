# Evidence: /qfai-sdd (spec-0003)

This file holds one section set per `/qfai-sdd` run. The current run comes
first; earlier runs follow under `## Prior run`, unchanged.

## Objective

- Spec target: spec-0003
- Objective: stop `qfai init` from seeding the project-root work-log surface
  `.qfai/steering/`, and specify that init leaves an existing one untouched.
  This run is one target of the batch recorded in
  `.qfai/evidence/sdd-batch-20260923170018664.md`.

## Inputs reviewed

- Discussion pack `discussion-20260923060900824` (REQ-0001, REQ-0006, REQ-0010,
  REQ-0016), read as reference input. The discussion tree is not tracked, so
  this names the session rather than a file to open.
- `.qfai/evidence/sdd-batch-20260923170018664.md`
- `.qfai/specs/_policies/08_Decisions.md` (DR-0296)
- `.qfai/specs/spec-0003/01_Spec.md` through `09_delta.md`, and
  `tdd/test-list.md`
- `packages/qfai/tests/cli/init.test.ts`,
  `packages/qfai/tests/integration/initSpec0003.test.ts`,
  `tests/integration/qfai-traceability.md`
- `.qfai/assistant/catalog/test-layers.md`

## Preflight summary path

- Preflight run id `run-20260923170018664`: ready, 17 imported requirements,
  no blockers. Stage 1 Triage was taken against this run.
- Preflight run id `run-20260923172043151`, the latest: ready, 17 imported
  requirements, no pack gaps. Its summary differs from the earlier run's only
  in the run id.

## Triage decisions

| Source                                | Subject                                                                                                   | Operation | Sub-op | Approved By   | Rationale                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0001 | Remove REQ-0019, CLI-WLOG, AC-0003-0018, BR-0003-0016, EX-0003-0019, TC-0003-0022 and ledger row TDD-0022 | UPDATE    | REMOVE | yusuke_senaga | The behaviour is removed                                                  |
| discussion-20260923060900824#REQ-0001 | Narrow US-0003-0016 to the four-layer seed                                                                | UPDATE    | MODIFY | yusuke_senaga | The story also carries REQ-0018 and AC-0003-0017, which stay              |
| discussion-20260923060900824#REQ-0016 | Resolve OQ-0003-0002 as moot                                                                              | UPDATE    | MODIFY | yusuke_senaga | The question is about a surface that no longer exists                     |
| discussion-20260923060900824#REQ-0010 | Append AC-0003-0039, BR-0003-0049, EX-0003-0052, EX-0003-0053, TC-0003-0059, TC-0003-0060                 | UPDATE    | APPEND | yusuke_senaga | Carries the absence signal of REQ-0001 and the hash test of REQ-0010      |
| discussion-20260923060900824#REQ-0006 | Append BR-0003-0050, EX-0003-0054, TC-0003-0061 under AC-0003-0039                                        | UPDATE    | APPEND | yusuke_senaga | No item states the withdrawn-asset retire pass, and REQ-0006 needs a test |

The table with its full rationale is `## Triage (2026-09-23)` in
`.qfai/specs/spec-0003/09_delta.md`.

## Open questions

- OQ-0003-0002: auto-archival of work-log entries — Disposition: resolved,
  moot under DR-0296
- OQ-0003-0001 and OQ-0003-0003 — Disposition: deferred, unchanged

## Decisions made

Each is a `DR-*` in `07_Decisions.md` and a `DL-*` in `09_delta.md`, adopted
from the Phase 2 griller's recommendation.

- DR-0003-0013 / DL-0001: AC-0003-0039 cites a new spec-local REQ-0032 and
  carries its upstream source pair in the Gherkin block — the catalog holds one
  local REQ per row.
- DR-0003-0014 / DL-0002: US-0003-0016 narrows to the four-layer seed and drops
  the frontmatter-schema non-goal — that check no longer exists in spec-0004.
- DR-0003-0015 / DL-0003: AC-0003-0039 belongs to US-0003-0016 — it states the
  negative of the half that story lost.
- DR-0003-0016 / DL-0004: the absence criterion includes init's report, and not
  the `--force` NOTE wording or unrecorded copies — no acceptance signal needs
  them.
- DR-0003-0017 / DL-0005: BR-0003-0050, EX-0003-0054 and TC-0003-0061 stay
  beside the generic retire-pass test — it proves neither this withdrawal nor
  the edited-content note.
- DR-0003-0018 / DL-0006: TC-0003-0060 covers plain init and `init --force` —
  upstream REQ-0010 says "with or without".
- DR-0003-0019 / DL-0007: EX-0003-0053 uses a partial seed — a full unedited
  seed passes on the code that still seeds.
- DR-0003-0020 / DL-0008: six ledger rows, one per independently failing part.
- DR-0003-0021 / DL-0009: the new rows are Integration, T2, `todo`, with owning
  modules as repository-root paths.
- DR-0003-0022 / DL-0010: `## TDD-ID reservations` sits after the ledger table.
- DR-0003-0023 / DL-0011: `Tier` is seeded on the new rows only — no Change
  Request drives a re-derivation.
- DR-0003-0024 / DL-0012: the two TDD-0025 assertions on `joinProjectSteering`,
  in `initSpec0003.test.ts` and `init.test.ts`, are a `/qfai-implement` action,
  with no row change. The Reviewer Gate fix widened this record from one
  assertion to both, with the `09_delta.md` note and the `10_Plan.md` risk row,
  after cycle 1 found `init.test.ts:4120`. It was taken without a pre-draft
  grilling round, and cycle 2 adjudicated it (A2-DEC).
- DR-0003-0025 / DL-0013: BR-0003-0050 cites CLI-INIT.
- DR-0003-0026 / DL-0014: BR-0003-0050's recorded hash resolves through the
  `.assets.lock.json` entry the retire pass reads — existing behaviour needs no
  contract line.
- DR-0003-0027 / DL-0015: BR-0003-0049 is realized by what init does not write
  — a contract line would reverse an approved edit.
- DR-0003-0028 / DL-0016: the plan states the init part of the removal by
  symbol and cites spec-0004's plan for the order — one order, stated once.
- DR-0003-0029 / DL-0017: the removal's tests build their own trees — no third
  identical caller for a shared fixture.
- Recorded in this file only, because none fixes anything in the spec pack:
  P3-D1 (the usage-reference check counts only what this change adds), P3-D4
  (new plan text goes in subsections inside the template's sections, in
  English) and N2C-2 (no live item cites `CLI-WLOG`). P3-D9 (earlier plan
  sections stay as they are) is a rejected option of DL-0016.

## Work performed

- `.qfai/specs/spec-0003/01_Spec.md`: REQ-0019 and the CLI-WLOG contract line
  removed; REQ-0032 added.
- `.qfai/specs/spec-0003/02_User-stories.md`: US-0003-0016 title, Goal,
  Non-goals and Notes rewritten, and its catalog line.
- `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`: AC-0003-0018 section and
  catalog row removed; AC-0003-0039 added as a Gherkin block with its
  `# Source:` comment, and to the catalog.
- `.qfai/specs/spec-0003/04_Business-Rules.md`: BR-0003-0016 removed;
  BR-0003-0049 and BR-0003-0050 added.
- `.qfai/specs/spec-0003/05_Examples.md`: EX-0003-0019 removed; EX-0003-0052,
  EX-0003-0053 and EX-0003-0054 added.
- `.qfai/specs/spec-0003/06_Test-Cases.md`: TC-0003-0022 row and section
  removed; TC-0003-0059, TC-0003-0060 and TC-0003-0061 added, each naming its
  boundaries.
- `.qfai/specs/spec-0003/07_Decisions.md`: DR-0003-0013 to DR-0003-0025.
- `.qfai/specs/spec-0003/08_Open-questions.md`: OQ-0003-0002 resolved.
- `.qfai/specs/spec-0003/09_delta.md`: ledger notes under the Triage table (the
  `spec-0003/TDD-0022` retirement record with its verbatim `Evidence`, the
  owner of each test and annotation it drove, the TDD-0025 action, the `Tier`
  limit), and `## Decision Log` DL-0001 to DL-0013.
- `.qfai/specs/spec-0003/tdd/test-list.md` (Phase 2b): TDD-0022 deleted and
  tombstoned under a new `## TDD-ID reservations`; TDD-0094 to TDD-0099 seeded
  at `todo`. Ledger rows: 90 before, 95 after.
- The retirement record names a third carrier of TC-0003-0022 that the Phase 2
  decisions did not list: `tests/integration/qfai-traceability.md:59`. The
  full-profile run found it, and the record gives it the same owner as the
  other two.
- Phase 2c: `07_Decisions.md` DR-0003-0026 and DR-0003-0027, `09_delta.md`
  DL-0014 and DL-0015. No contract and no obligation changed.
- Phase 3: `10_Plan.md` gains "Removing the work-log seed" under
  `## Implementation approach`, "Tests for the work-log removal" under
  `## Test approach`, and one risk row. `07_Decisions.md` DR-0003-0028 and
  DR-0003-0029, `09_delta.md` DL-0016 and DL-0017.
- Critical Constraint 10: no finding. The new plan text introduces no
  architectural element. It names code the change deletes, and code it reuses
  unchanged (`retireWithdrawnGovernedAssets` and the `.assets.lock.json`
  record), so no usage reference is owed. The earlier sections were finalized
  by the runs that introduced them and were not re-audited (P3-D1).
- Phase 4: `09_delta.md` gains a `## Update History` row for each of DL-0001
  to DL-0017, and entry DELTA-0002 inside the existing `## Change Summary`. The
  Triage rows and the dated history stay as written. No `## Change Requests`
  row: the approved Triage set is the change record (P1-D5). Phase 4 settles no
  design decision, so no grilling row.
- Test-design review fix, cycle 1 (`test-design-analyst`, `tda-reviewfix`):
  TC-0003-0059..0061 and TDD-0094..TDD-0099 were reviewed for Level, Type,
  `EX-Ref` / `AC-Refs`, boundaries, RED, Tier, owning module and `BR-Ref`,
  and the TDD-0022 retirement record was checked against
  `packages/qfai/tests/**` and `tests/**`. Nothing needed correcting, and no
  file of the pack changed. Ledger: 95 rows before and after.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0003-0050, and the last clause of AC-0003-0039: CLI-INIT. No contract line
  names the recorded hash, so it is reached by a join. `qfai-init.md:150-152`
  and `:218-219` speak of a governed asset's receipt and its provenance
  classification. That receipt is the file's entry in
  `.qfai/assistant/.assets.lock.json` (`ASSISTANT_ASSETS_LOCK_BASENAME` in
  `assistantAssetProvenance.ts`), which maps its path to a hash.
  `retireWithdrawnGovernedAssets` in `init.ts` reads it, deletes a match, and
  emits the edited-content note otherwise. `catalog/worklog-entry.schema.md` is
  not in `ADOPTER_OWNED_ASSETS`, so the pass reaches it. No contract write
  (DR-0003-0026).
- BR-0003-0049 and AC-0003-0039: CLI-INIT, realized by absence. The required
  outputs no longer name `.qfai/steering/`, the report lists only what the run
  wrote (`written paths:`), and the instructions text comes from
  `buildCopilotInstructions`, whose lines the contract does not fix. The rule
  names no persisted attribute. No contract write (DR-0003-0027).
- `CLI-WLOG`: no live BR or AC in `.qfai/specs/**` cites it. A search outside
  the delta files returns nothing, and the delta rows that name it are change
  records.
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract, and nothing under `.qfai/contracts/` declares a `CON-API-*` or
  `CON-DB-*`. This phase wrote no contract, so its scope did not re-expand.

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0003 --format text
node packages/qfai/dist/cli/index.mjs validate --profile full --spec spec-0003 --format text
npx prettier --write .qfai/specs/spec-0003/0*.md .qfai/specs/spec-0003/tdd/test-list.md
node scripts/check-mdschema.mjs --scope all
npx markdownlint-cli2 .qfai/specs/spec-0003/*.md .qfai/specs/spec-0003/tdd/*.md
npx prettier --write .qfai/specs/spec-0003/07_Decisions.md .qfai/specs/spec-0003/09_delta.md .qfai/specs/spec-0003/10_Plan.md
npx markdownlint-cli2 .qfai/specs/spec-0003/07_Decisions.md .qfai/specs/spec-0003/09_delta.md .qfai/specs/spec-0003/10_Plan.md
node scripts/check-mdschema.mjs
node scripts/check-doc-clarity.mjs
npx prettier --write .qfai/specs/spec-0003/09_delta.md
npx markdownlint-cli2 .qfai/specs/spec-0003/*.md .qfai/specs/spec-0003/tdd/*.md
node scripts/check-mdschema.mjs --scope all
node scripts/check-mermaid.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0003 --format text
```

## Validate evidence paths

- Validate run id `run-20260923183938571`, scope `sdd` on spec-0003: pass, 0
  errors, 27 warnings. The warnings were present before this run: `_policies`
  triage notices, findings on the `.qfai/steering/` entries the implementation
  deletes, and repository-wide notices.
- Validate run id `run-20260923183738008`, scope `full` on spec-0003, for
  context: 86 errors. Three come from this change and clear in the
  implementation: `QFAI-ATDD-102` twice (TC-0003-0022 is still annotated) and
  `QFAI-ATDD-112` (TC-0003-0059 to TC-0003-0061 have no test yet). The rest were
  present before this run.
- Validate run id `run-20260923191406407`, scope `sdd` on spec-0003, after
  Phase 2c and Phase 3: pass, 0 errors, 27 warnings, 4 info. The findings are
  the same as after Phase 2.
- Validate run id `run-20260923193757828`, scope `sdd` on spec-0003, after Phase 4:
  pass, 0 errors, 27 warnings, 4 info. No finding is new. The whole-repository
  run is in the batch record.
- Final run `run-20260923214113936`, scope `sdd`, whole repository,
  after the Reviewer Gate closed: 15 errors repository-wide, all pinned and
  pre-existing. This spec's files carry 0 errors and 2 warnings. Details in the batch record.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ----------------------- | -------------------- |
| 2     | run     | 2026-09-23T09:24:22Z | 2026-09-23T09:31:12Z | 13 settled, 0 escalated | #work-orders-summary |
| 2c.1  | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:09:11Z | 3 settled, 0 escalated  | #work-orders-summary |
| 3     | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:11:32Z | 7 settled, 0 escalated  | #work-orders-summary |

- Batch record: `.qfai/evidence/sdd-batch-20260923170018664.md`

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance       | Task title                                                                                                                                                                                         | Input (refs)                                                                          | Output (refs)                                                                                                                                                                                                                                                                       | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-reviewer | p2-griller           | grilling(2/agents): AC-0003-0039 cites a new REQ-0032 and carries `# Source: discussion-20260923060900824#REQ-0001, #REQ-0006, #REQ-0010`                                                          | S3-D1                                                                                 | The catalog holds one local REQ per row, as REQ-0024..0031 do; the source pair belongs in the Gherkin block. Griller added the `# Source:` comment; author agreed                                                                                                                   | PASS                         |
| 2    | requirements-reviewer | p2-griller           | grilling(2/agents): US-0003-0016 narrows to "4-layer asset-tree seeding" and drops the frontmatter-schema non-goal                                                                                 | S3-D2                                                                                 | The story keeps REQ-0018 and AC-0003-0017; the dropped non-goal names a removed spec-0004 check. Griller required the drop in the Decision Log (DL-0002); author agreed                                                                                                             | PASS                         |
| 3    | requirements-reviewer | p2-griller           | grilling(2/agents): AC-0003-0039 belongs to US-0003-0016                                                                                                                                           | S3-D3                                                                                 | It states the negative of the half the story lost, and the schema sat in that story's `catalog/` layer; author agreed                                                                                                                                                               | PASS                         |
| 4    | requirements-reviewer | p2-griller           | grilling(2/agents): the absence criterion includes init's report, not the `--force` NOTE wording or unrecorded copies                                                                              | S3-D4                                                                                 | No upstream acceptance signal needs the other two; author agreed                                                                                                                                                                                                                    | PASS                         |
| 5    | requirements-reviewer | p2-griller           | grilling(2/agents): keep BR-0003-0050, EX-0003-0054 and TC-0003-0061 beside the generic retire-pass test                                                                                           | S3-D5                                                                                 | The generic test proves neither this withdrawal nor the edited-content note, and dropping them changes an approved APPEND row; author agreed                                                                                                                                        | PASS                         |
| 6    | requirements-reviewer | p2-griller           | grilling(2/agents): TC-0003-0060 covers plain init and `init --force`                                                                                                                              | S3-D6                                                                                 | Upstream REQ-0010 says "with or without `--force`"; author agreed                                                                                                                                                                                                                   | PASS                         |
| 7    | requirements-reviewer | p2-griller           | grilling(2/agents): EX-0003-0053 fixture is a partial seed                                                                                                                                         | S3-D7                                                                                 | A full unedited seed passes on today's create-only code, so its test could never fail first; author agreed                                                                                                                                                                          | PASS                         |
| 8    | requirements-reviewer | p2-griller           | grilling(2/agents): six ledger rows TDD-0094..0099                                                                                                                                                 | S3-D8                                                                                 | One row per independently failing part; author agreed                                                                                                                                                                                                                               | PASS                         |
| 9    | requirements-reviewer | p2-griller           | grilling(2/agents): new rows are Integration, T2, `-` test file, `todo`; owning modules as repository-root paths                                                                                   | S3-D9                                                                                 | Every path in the ledger is from the repository root. Disagreeing position: requirements-analyst (package-relative `src/cli/commands/init.ts`, `src/core/governedAssistantManifest.ts`)                                                                                             | PASS                         |
| 10   | requirements-reviewer | p2-griller           | grilling(2/agents): `## TDD-ID reservations` after the ledger table, before the notes                                                                                                              | S3-D10                                                                                | The ledger stays the first table in the file; author agreed                                                                                                                                                                                                                         | PASS                         |
| 11   | requirements-reviewer | p2-griller           | grilling(2/agents): seed `Tier` only on new and reset rows, and state the limit in one `09_delta.md` bullet                                                                                        | X-D6                                                                                  | No Change Request drives a re-derivation, and re-deriving would reset untouched `done` rows. Raised by the griller; no author position                                                                                                                                              | PASS                         |
| 12   | requirements-reviewer | p2-griller           | grilling(2/agents): name `initSpec0003.test.ts:256` (`joinProjectSteering`, TDD-0025) as a `/qfai-implement` action; no row change or reset                                                        | N2                                                                                    | TC-0003-0025's obligation does not change. The author raised the knock-on; the griller placed it in the ledger notes                                                                                                                                                                | PASS                         |
| 13   | requirements-reviewer | p2-griller           | grilling(2/agents): BR-0003-0050 `Contract-Refs` is `CLI-INIT`                                                                                                                                     | N3                                                                                    | The init command realises the rule; Phase 2c records the lock hash as init's internal record. Disagreeing position: requirements-analyst (`-`, no contract describes the retire pass)                                                                                               | PASS                         |
| 14   | requirements-analyst  | p2-author-0003-0006  | Phase 2 and Phase 2b draft: spec-0003                                                                                                                                                              | steps 1-13, `## Triage (2026-09-23)`                                                  | `01_Spec.md`..`09_delta.md`, `tdd/test-list.md` as listed under Work performed; validate `sdd` on spec-0003: 0 errors                                                                                                                                                               | PASS                         |
| 15   | solution-architect    | p2c3-author          | Phase 2c and Phase 3 open decisions                                                                                                                                                                | Phase 2 texts of BR-0003-0049, BR-0003-0050; `10_Plan.md`; `qfai-init.md`             | P2C-D1, P2C-D2 and P3-D1..D9 with positions; no critical recommendation                                                                                                                                                                                                             | PASS                         |
| 16   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): BR-0003-0050's recorded hash resolves by a join to init's own record; no contract write                                                                                       | P2C-D1                                                                                | REQ-0006 asks for no new behaviour, and a contract line would widen the approved edits. Griller amended the join to cite `qfai-init.md:150-152` and `:218-219` and to check `ADOPTER_OWNED_ASSETS`; disagreeing position: solution-architect (cited `:192`, no adopter-owned check) | PASS                         |
| 17   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): BR-0003-0049 is realized by absence; no contract line                                                                                                                         | P2C-D2                                                                                | Phase 0 deleted the protective lines on purpose, and restoring one reverses an approved edit; author agreed                                                                                                                                                                         | PASS                         |
| 18   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): record that no live BR or AC outside delta records cites `CLI-WLOG`                                                                                                           | N2C-2                                                                                 | Closes the question of a stale binding to the deleted contract; found by griller                                                                                                                                                                                                    | PASS                         |
| 19   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the usage-reference check counts only elements this change adds, which is none                                                                                                 | P3-D1                                                                                 | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                                                                                                                   | PASS                         |
| 20   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the removal order lives in spec-0004's plan, and this plan cites it                                                                                                            | P3-D2                                                                                 | spec-0004 owns every validator that makes the order matter, and six copies drift; author agreed                                                                                                                                                                                     | PASS                         |
| 21   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the order also removes `normalizeNewlines` and `SEED_DRIFT_MAX_BYTES`, keeps `OPEN_READ_FLAGS`, and names code by symbol                                                       | P3-D3                                                                                 | Both are reached only from the seed code, and a line range goes stale when the file moves; griller's amendment; disagreeing position: solution-architect (line ranges, the two helpers not named)                                                                                   | PASS                         |
| 22   | architecture-reviewer | p2c3-griller         | grilling(3/agents): new plan text goes in subsections inside the template's sections, in English                                                                                                   | P3-D4                                                                                 | Keeps clear of the plan heading checks by construction, and follows the repository language; author agreed                                                                                                                                                                          | PASS                         |
| 23   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the plan names init's removed symbols, the reused retire pass and the tests, and one risk row names tests by the TC-0003-0022 selector and the `joinProjectSteering` assertion | P3-D5                                                                                 | Griller amended the risk row to name tests rather than line numbers; disagreeing position: solution-architect (line numbers)                                                                                                                                                        | PASS                         |
| 24   | architecture-reviewer | p2c3-griller         | grilling(3/agents): no shared fixture for a populated `.qfai/steering/` tree                                                                                                                       | P3-D8                                                                                 | The three trees differ, so there is no third identical caller; author agreed                                                                                                                                                                                                        | PASS                         |
| 25   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the earlier plan sections stay as they are                                                                                                                                     | P3-D9                                                                                 | The request does not cover them; author agreed                                                                                                                                                                                                                                      | PASS                         |
| 26   | solution-architect    | p2c3-author          | Phase 2c and Phase 3 draft: spec-0003                                                                                                                                                              | settled steps 16-25                                                                   | `07_Decisions.md` DR-0003-0026..0029, `09_delta.md` DL-0014..0017, `10_Plan.md`; Critical Constraint 10: no finding; validate `sdd` on spec-0003: 0 errors                                                                                                                          | PASS                         |
| 27   | requirements-analyst  | p4-author            | Phase 4 delta update: spec-0003                                                                                                                                                                    | `09_delta.md` DL-0001..0017, `## Triage (2026-09-23)`                                 | `09_delta.md` `## Update History`, `## Change Summary` DELTA-0002; markdownlint 0 errors; validate `sdd` on spec-0003: 0 errors                                                                                                                                                     | PASS                         |
| 28   | test-design-analyst   | tda-reviewfix        | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                                                                               | `.qfai/specs/spec-0003/03..06`, `tdd/test-list.md`, `09_delta.md`; cycle-1 R01/R03    | No correction. TC-0003-0059..0061 and TDD-0094..TDD-0099 hold; the TDD-0022 retirement record names every annotated test                                                                                                                                                            | PASS                         |
| 29   | completion-reviewer   | gate-c1-completion   | Reviewer Gate cycle 1                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record                               | `review-20260923104053100` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst                                                                                                                                                                                | REVISE                       |
| 30   | architecture-reviewer | gate-c1-architecture | Reviewer Gate cycle 1                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record                               | `review-20260923104053100` R02: REVISE — DR-0296 wording; name the second `joinProjectSteering` assertion (`init.test.ts:4120`)                                                                                                                                                     | REVISE                       |
| 31   | qa-gatekeeper         | gate-c1-qa           | Reviewer Gate cycle 1                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record                               | `review-20260923104053100` R03: PASS                                                                                                                                                                                                                                                | PASS                         |
| 32   | completion-reviewer   | gate-c2-completion   | Reviewer Gate cycle 2                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record, the cycle-1 answered demands | `review-20260923121814100` R01: PASS, advisories only                                                                                                                                                                                                                               | PASS                         |
| 33   | architecture-reviewer | gate-c2-architecture | Reviewer Gate cycle 2                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record, the cycle-1 answered demands | `review-20260923121814100` R02: PASS, advisories only                                                                                                                                                                                                                               | PASS                         |
| 34   | qa-gatekeeper         | gate-c2-qa           | Reviewer Gate cycle 2                                                                                                                                                                              | this file, `.qfai/specs/spec-0003/**`, the batch record, the cycle-1 answered demands | `review-20260923121814100` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                                                                                                                  | PASS                         |

## Gaps / Open risks

- Until the implementation lands, the `full` and `tdd` profiles report
  `QFAI-ATDD-102` for the TC-0003-0022 annotations and `QFAI-ATDD-112` for
  TC-0003-0059 to TC-0003-0061.
- TDD-0082 was deleted on 2026-09-22 without a tombstone. It is below the
  ledger's highest id, so it cannot be reissued; this run does not add one.

## Final status

- Final status: PASS
- Rationale: every routed blocking reviewer returned PASS in cycle 2
  (`review-20260923121814100`), and only the 15 pinned pre-existing errors
  remain repository-wide.

## Prior run (2026-09-15)

### Objective

- Spec target: spec-0003
- Objective: bring spec-0003 back into agreement with the shipped workflow set after the document and validation checks became independent matrix legs behind a result aggregate, and record the coverage that change added.

### Inputs reviewed

- Discussion pack `discussion-20260913135257933` (the discussion tree is not tracked, so this names the session rather than a file to open)
- `.qfai/contracts/cli/shipped-workflows.md` (CLI-WFSET)
- `.qfai/specs/spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `09_delta.md`, `10_Plan.md`
- `.qfai/specs/spec-0003/tdd/test-list.md`
- `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`
- `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml`
- `packages/qfai/tests/helpers/shippedLaneCommands.ts`
- `packages/qfai/tests/integration/shippedWorkflowShape.ts`
- `.qfai/assistant/catalog/test-layers.md`
- `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md`

### Preflight summary

- Run id `run-20260915133056355`. The report tree is not tracked; re-running `qfai preflight` writes a new run under it and this id is what identifies the one this record is about.

### Triage decisions

| Source           | Subject                                                                                          | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User instruction | Preserve validation coverage across independent profile jobs                                     | UPDATE    | MODIFY | -           | REQ-0031, US-0003-0028, AC-0003-0035 and BR-0003-0043 carried a same-lane ordering requirement the independent legs no longer satisfy. Replaced with invocation coverage keyed by the event that selects each invocation. |
| User instruction | Account for dependency installs after matrix expansion                                           | UPDATE    | MODIFY | -           | NFR-C0016, AC-0003-0030, BR-0003-0031, EX-0003-0034 and TC-0003-0037 stated one installing job. Two jobs install, and matrix expansion makes the executing count event-dependent.                                         |
| User instruction | Require independent document checks and validation profiles to complete before aggregate success | UPDATE    | APPEND | -           | AC-0003-0038, BR-0003-0047, BR-0003-0048, EX-0003-0050, EX-0003-0051 and TC-0003-0056..0058 add the concurrency and aggregate-completeness obligations within the existing capability.                                    |

Every row is `UPDATE` with sub-op `MODIFY` or `APPEND`, so none required approval. The full table with its per-row detail is persisted in `.qfai/specs/spec-0003/09_delta.md`.

### Open questions

- none

### Decisions made

- The install count is stated as job declarations plus executing instances per event, rather than as a property with the numbers held only in the test suite. The scheduling cost of parallel legs is what the change buys, and a reader of the spec should see it.
- `.qfai/contracts/cli/shipped-workflows.md` section 5 is amended in the same change as the spec. The spec cites the contract rather than restating it, so leaving the contract stale would have left every citation pointing at the wrong text.
- `tdd/test-list.md` gains the `Boundary` column only. The remaining template columns and row groups are a separate migration, recorded as its own task.
- The six new ledger rows stand at `todo`. Phase 2b seeds a row; `Status`, `DR-ID` and `Evidence` belong to `/qfai-implement`, and this cycle has no standing to write them. `Test file` and `Selector` are kept, which is what every other `todo` row in this ledger carries.
- No falsifiability record is asserted for those rows, and no ATDD evidence file is written. The tests exist and pass, but the stages that own their provenance have not run.
- Section 5 states what the declared shape pins and names the job and step declarations as the surface that pins which leg runs an invocation and which event selects it. The dimension gate reads neither a step condition nor a matrix axis, so a stronger claim would have described a check that does not exist.
- `TC-0003-0056`..`TC-0003-0058` declare `Level: integration`. The layer derivation puts them at L3, and a `TC` row's `Level` stays within L1–L3.

### Work performed

- `.qfai/specs/spec-0003/01_Spec.md` — NFR-C0016 rewritten; REQ-0031 gains the aggregate-lane clause.
- `.qfai/specs/spec-0003/02_User-stories.md` — US-0003-0023 and US-0003-0028 notes extended.
- `.qfai/specs/spec-0003/03_Acceptance-Criteria.md` — AC-0003-0030 and AC-0003-0035 corrected; AC-0003-0038 added.
- `.qfai/specs/spec-0003/04_Business-Rules.md` — BR-0003-0031 and BR-0003-0043 corrected; BR-0003-0047 and BR-0003-0048 added.
- `.qfai/specs/spec-0003/05_Examples.md` — EX-0003-0034 corrected; EX-0003-0050 and EX-0003-0051 added.
- `.qfai/specs/spec-0003/06_Test-Cases.md` — TC-0003-0037 corrected; TC-0003-0056, TC-0003-0057 and TC-0003-0058 added.
- `.qfai/specs/spec-0003/tdd/test-list.md` — `Boundary` column added and filled for the two split test cases; TDD-0058..TDD-0063 added at `todo`.
- `.qfai/contracts/cli/shipped-workflows.md` — section 5 dimensions 5 and 6 amended.
- `tests/integration/qfai-traceability.md` — carrier entries for the three new test cases. This is the only tree the annotation scan reads, so an annotation in `packages/qfai/tests/**` answers nothing.
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`, `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts` — test names carry their test-case and ledger ids.
- `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts` — TC-0003-0037 now counts executing job instances per event.
- `packages/qfai/tests/integration/shippedWorkflowShape.ts` — dimension 6's title follows the amended contract wording.
- `scripts/dogfood-backlog.json` — the spec-0003 ledger pin tightened from 75 to 73, and the entry for a discussion pack that reached zero errors removed. The ratchet fails an improved file left un-repinned, so both edits are required together.
- `.github/pinned-bytes.txt`, `.github/required-status-contexts.json`, `.github/workflows/ci.yml` — digests re-derived after the backlog pin changed. `scripts/dogfood-backlog.json` is pinned by byte digest, that file is pinned inline in the workflow, and the workflow's step body is pinned in the status-context declaration.

### Contract executability

- none

### Commands executed

```
npx qfai sdd preflight --fail-on error
npx qfai validate --profile sdd --fail-on error --spec spec-0003 --format text
node scripts/check-dogfood-backlog.mjs --profile full
node scripts/pin-guard-bytes.mjs && node scripts/pin-verification-bodies.mjs
node scripts/check-workflow-hygiene.mjs --root .
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflow tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts
pnpm format:check && pnpm lint && pnpm lint:md && pnpm lint:mdschema && pnpm check-types
```

### Validate evidence

- Run id `run-20260915152200259`, status pass.
- Written by `qfai validate --fail-on error --format github`, whose result is the command table above. The report tree is not tracked, so the run id and that result are the record.

### Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                                                                   | Evidence             |
| ----- | ------- | -------------------- | -------------------- | -------------------------------------------------------------------------- | -------------------- |
| 0     | run     | 2026-09-15T04:55:00Z | 2026-09-15T05:00:00Z | 2 settled, 0 escalated                                                     | #work-orders-summary |
| 1     | skipped | -                    | -                    | empty: no `_policies` artifact changed                                     | -                    |
| 2     | run     | 2026-09-15T04:55:00Z | 2026-09-15T05:00:00Z | 2 settled, 0 escalated                                                     | #work-orders-summary |
| 2c    | skipped | -                    | -                    | empty: answered by CLI-WFSET section 5                                     | -                    |
| 3     | skipped | -                    | -                    | empty: answered by `10_Plan.md`, whose ordering this change does not touch | -                    |

One session covered Phase 0 and Phase 2 together, because the contract amendment and the spec rows that cite it are one decision set. Four decisions were put to the user and settled by the user. Phase 0 owns two: whether the contract is amended in the same change, and how far the ledger migrates. Phase 2 owns the other two: how the install count is stated, and what status the new ledger rows carry. Two later decisions, both raised by the review gate, were put to the user the same way: whether the ledger rows return to `todo`, and whether section 5 follows the gate or the gate follows section 5.

### Work Orders Summary

| Step | Role (sub-agent)      | Agent instance          | Task title                                     | Input (refs)                                                     | Output (refs)                                                               | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | ----------------------- | ---------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst  | requirements-analyst#1  | NFR and REQ correction, user-story notes       | 09_delta.md Triage rows 1-2                                      | `01_Spec.md`, `02_User-stories.md`                                          | PASS                         |
| 2    | solution-architect    | solution-architect#1    | Contract section 5, acceptance criteria, rules | 09_delta.md Triage rows 1-3, CLI-WFSET                           | `shipped-workflows.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md` | PASS                         |
| 3    | test-design-analyst   | test-design-analyst#1   | Examples, test cases, ledger, annotations      | 09_delta.md Triage rows 2-3, `test-layers.md`                    | `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`, test annotations  | PASS                         |
| 4    | completion-reviewer   | completion-reviewer#1   | Independent audit of the cycle                 | every artifact above                                             | completion verdict, two rounds                                              | PASS                         |
| 5    | architecture-reviewer | architecture-reviewer#1 | Contract and shipped-structure audit           | CLI-WFSET section 5, the two shipped workflows, the shape module | architecture verdict, two rounds                                            | PASS                         |

No instance appears in both an authoring step and a review step. Both reviewers returned `REVISE` on their first round; the findings were acted on and both returned `PASS` on re-check.

### Gaps / Open risks

- The six new ledger rows stand at `todo` while the tests they name already exist and pass. A later `/qfai-atdd` run owes their provenance, and it cannot observe a natural RED, because the implementation ships in the same change.
- `.qfai/evidence/coverage-depth-spec-0003.md` does not exist. `QFAI-ATDD-131` is the standing finding that names it. <!-- qfai:not-a-citation -->
- The document lane's two matrix legs each repeat the full dependency install ahead of one short checker, so the split buys both failures surfacing in one run rather than shorter wall time.
- No dimension of the declared shape reads a step condition, a matrix axis or an external check name. A change to any of them is caught as a byte difference rather than as a named obligation.
- `tdd/test-list.md` still carries the eight-column shape plus `Boundary`. The remaining columns and the Integration, E2E and API row groups are tracked separately.

### Final status

- Final status: PASS
- Rationale: both routed reviewers returned `PASS` on re-check, and the spec-scoped validate gate reports no error.
