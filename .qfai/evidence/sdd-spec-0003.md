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

---

# Run: re-derive under CR-20260925-0010 (2026-09-25)

## Objective

- Spec target: spec-0003
- Mode: `re-derive`, driven by the approved
  `.qfai/decisions/CR-20260925-0010-withdraw-the-work-log-absence-obligations.md`
  (step 3 of its rerun plan).
- Objective: withdraw the obligations whose only content is that the work-log
  surface is absent, with their ledger rows. The production removal stays.

## Inputs reviewed

- `CR-20260925-0010`, whole record, and the approved Triage group G1.
- The amended pack `discussion-20260923060900824` (commit `4c2c398b4`):
  `05_Scope.md`, `06_REQ.md`, `07_NFR.md`, `10_Policy.md`, `99_delta.md`
  `## Drift Events`, and `03_Story-Workshop.md` DUS-002.
- Review pack `review-20260925045812201` of the pack amendment: `R01` advisory 1
  and `R02` advisory 5, carried to this re-derive.
- `.qfai/specs/spec-0003/**`, and `.qfai/evidence/atdd-spec-0003.md`
  `### TDD-0094`..`### TDD-0099`.
- `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts`,
  `spec0003WithdrawnSchemaRetirement.test.ts`, and
  `packages/qfai/tests/core/assistantAssetProvenance.test.ts`.
- `.qfai/assistant/skills/qfai-sdd/SKILL.md`; references `sdd-triage.md`,
  `spec-traceability-rules.md`, `sdd-pre-draft-grilling.md`; template
  `templates/evidence/sdd-spec.md`.

## Preflight summary path

- Preflight run id `run-20260925143420772` (Stage 0): ready, source
  `discussion-pack`, selected pack `discussion-20260923060900824`, 17 imported
  requirements, no pack gaps, no blockers.
- Preflight run id `run-20260925150016061`, after Triage: the same result.

## Triage decisions

| Source                                | Subject                                                                                                                        | Operation | Sub-op | Approved By                            | Rationale                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | -------------------------------------- | --------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0010 | Remove BR-0003-0049, EX-0003-0052, EX-0003-0053, TC-0003-0059, TC-0003-0060; ledger rows TDD-0094..0097 deleted and tombstoned | UPDATE    | REMOVE | user (Claude Code structured question) | The amended REQ-0001 and REQ-0010 ask for no absence test             |
| discussion-20260923060900824#REQ-0006 | Remove BR-0003-0050, EX-0003-0054, TC-0003-0061; ledger rows TDD-0098, TDD-0099 deleted and tombstoned                         | UPDATE    | REMOVE | user (Claude Code structured question) | The retire pass is generic and already tested                        |
| discussion-20260923060900824#REQ-0010 | Remove AC-0003-0039, its catalog row and the spec-local REQ-0032                                                               | UPDATE    | REMOVE | user (Claude Code structured question) | No rule is left under the criterion                                  |
| discussion-20260923060900824#REQ-0010 | Narrow US-0003-0016 Notes to "Implements REQ-0018"                                                                             | UPDATE    | MODIFY | user (Claude Code structured question) | Drops the citation of the removed REQ-0032; deletes no ledger row    |

- Persisted in `09_delta.md` as `## Triage (2026-09-25)`, above
  `## Triage (2026-09-23)`, with `Depends-On` `-` on every row.
- Approved by the user through a Claude Code structured question at
  2026-09-25T04:52:16Z. That one structured answer approved the Change Request
  (G0) and all four spec groups, G1 to G4, together.

## Open questions

- none

## Decisions made

- DR-0003-0030 / DL-0018: the work-log absence obligations are withdrawn.
  Supersedes DR-0003-0013, DR-0003-0015..0021, DR-0003-0023, DR-0003-0025..0027
  and DR-0003-0029. Amends DR-0003-0014 and DR-0003-0028.
  - DR-0003-0023 is superseded beyond the list in the Change Request's Triage
    draft. It seeded `Tier` on TDD-0094..0099 only, and all six rows are gone.
- DR-0003-0031 / DL-0019: `[RE-OPEN]` of DR-0003-0017. DL-0005 had rejected
  relying on the generic retire-pass test "without the user's approval".
- DR-0003-0032 / DL-0020: `[RE-OPEN]` of DR-0003-0018. DL-0006 had rejected
  leaving the plain init run untested.
- The two re-opens are what the Delta Rejected Guard requires when a rejected
  option is taken. Each carries the user's approval of the Change Request, and
  `09_delta.md` `## Rejected` points back at each through `Re-opened by:`.

## Work performed

- Phase 2:
  - `01_Spec.md`: REQ-0032 removed.
  - `02_User-stories.md`: US-0003-0016 Notes read "Implements REQ-0018".
  - `03_Acceptance-Criteria.md`: the AC-0003-0039 Gherkin block and its catalog
    row removed.
  - `04_Business-Rules.md`: BR-0003-0049 and BR-0003-0050 removed.
  - `05_Examples.md`: EX-0003-0052..0054 removed.
  - `06_Test-Cases.md`: the table rows and sections of TC-0003-0059..0061
    removed.
  - `07_Decisions.md`: 13 records marked superseded, two amended, three added;
    the count line reads 32.
- Phase 2b:
  - `tdd/test-list.md`: TDD-0094..TDD-0099 deleted; six tombstones added under
    the existing `## TDD-ID reservations`.
  - Downstream ledger sweep: no row is reset. A cell-by-cell comparison with
    `HEAD` shows the other 91 rows unchanged; prettier only re-padded the
    table.
  - Each deleted row's `Evidence` cell is copied verbatim into the Triage
    section of `09_delta.md`.
- Phase 3: `10_Plan.md` `### Tests for the work-log removal` states that the
  removal adds no test, and the sentence on the rejected alternative under
  `### Removing the work-log seed` no longer cites absence tests.
  Critical Constraint 10: no finding, because the edit adds no architectural
  element.
- Phase 4: `09_delta.md` gains `## Triage (2026-09-25)`, DELTA-0003 in
  `## Change Summary`, DL-0018..DL-0020 with their `## Update History` rows,
  two `## Rejected` candidates with `Re-opened by:`, pointers in DL-0005 and
  DL-0006, and the `CR-20260925-0010` row in `## Change Requests`
  (`Applied at` `-`, as in the Change Request).
- Carried reviewer advisory (`R01` advisory 1, `R02` advisory 5): the Triage
  section records that `03_Story-Workshop.md` DAC-002-03, the two DUS-002 edge
  seeds and the DUS-002 idempotency seed derive no test or example, read the
  same way as the drift event reads the lines it lists. Disposition of each:

  | Pack line                              | Describes                                                    | Disposition                                     |
  | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
  | DAC-002-03 (lines 51-53)               | `QFAI-ASSETS-006` on a remaining schema copy                 | No test or example; generic check stays tested |
  | DUS-002 edge seed, edited copy (62)    | `init --force` keeps an edited copy with the note            | No test or example; TC-0003-0061 withdrawn     |
  | DUS-002 edge seed, no lock record (63) | `init --force` never visits an unrecorded copy               | No test or example                              |
  | DUS-002 idempotency seed (66)          | A second `init --force` changes nothing                      | No test or example                              |

- Tests to delete, owned by other stages, in the same commit:
  - `/qfai-atdd`: `packages/qfai/tests/integration/spec0003InitWorklogSurface.test.ts`
    (all four `it` blocks: TDD-0094, TDD-0095, TDD-0096, TDD-0097) and
    `packages/qfai/tests/integration/spec0003WithdrawnSchemaRetirement.test.ts`
    (both `it` blocks: TDD-0098, TDD-0099).
  - `/qfai-implement`: the two entries in `packages/qfai/tsconfig.tests.json`.
- Phase 0, Phase 1 and Phase 2c were not entered: no contract, no `_policies`
  file and no remaining obligation changed.

## Contract executability

- none

## Commands executed

```sh
cd packages/qfai && ./node_modules/.bin/tsup
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0003 --format text
node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec spec-0003 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format text
node packages/qfai/dist/cli/index.mjs sdd preflight
./node_modules/.bin/prettier --write <the edited spec files>
./node_modules/.bin/markdownlint-cli2 <the edited spec files>
node scripts/check-mdschema.mjs
node scripts/check-mermaid.mjs
node scripts/check-doc-clarity.mjs
```

## Validate evidence paths

- Validate run id `run-20260925143435302`, scope `sdd`, `--spec spec-0003`,
  before any write: pass, 0 errors, 13 warnings, 4 info.
- Validate run id `run-20260925145049098`, scope `sdd`, `--spec spec-0003`,
  after the writes: pass, 0 errors, 13 warnings, 4 info. The same findings.
- Validate run id `run-20260925145351442`, scope `tdd`, `--spec spec-0003`,
  on the spec files of `HEAD`: 79 errors, 25 warnings, 6 info.
- Validate run id `run-20260925145106044`, scope `tdd`, `--spec spec-0003`,
  after the writes: 81 errors, 25 warnings, 6 info. The two new errors are
  `QFAI-ATDD-102`, one per test file above: each still carries an annotation
  for a removed test case. They clear when the files are deleted. No
  `TDDLIST_TEST_FILE_MISSING` fires. The other 79 are the baseline's.
- Validate run id `run-20260925145843475`, scope `sdd`, whole repository:
  11 errors, all the pinned `QFAI-TDDLIST-017` in spec-0006, spec-0010 and
  spec-0012.
- After `/qfai-atdd` deleted the ten test files and `/qfai-implement` made its
  test edits, with the package rebuilt:
  - Validate run id `run-20260925155652911`, scope `sdd`, `--spec spec-0003`: 1 error,
    `QFAI-REVIEW-007` on this spec's review pack while its `summary.json`
    reads `PENDING`. The warnings are the same as before the run.
  - Validate run id `run-20260925155709707`, scope `tdd`, `--spec spec-0003`: 79 errors, the
    same count as on `HEAD`. No `QFAI-ATDD-102` and no
    `TDDLIST_TEST_FILE_MISSING`.
  - Validate run id `run-20260925155923587`, scope `sdd`, whole repository:
    15 errors: the 11 pinned `QFAI-TDDLIST-017` and one `QFAI-REVIEW-007` per
    pending pack.
- `check-mdschema`: 49 files conform. `check-mermaid`: 50 diagrams parse.
  markdownlint: 0 errors. `check-doc-clarity`: no local identifiers.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at             | Frontier                                                     | Evidence |
| ----- | ------- | -------- | -------------------- | ------------------------------------------------------------ | -------- |
| 2     | skipped | -        | 2026-09-25T05:38:05Z | empty: answered by CR-20260925-0010, approved by the user    | -        |
| 3     | skipped | -        | 2026-09-25T05:41:11Z | empty: answered by CR-20260925-0010, approved by the user    | -        |

- Batch record: none
- These rows belong to this run. The user settled every decision the phases
  write through `CR-20260925-0010` and its Triage group G1, approved at
  2026-09-25T04:52:16Z, so no session was opened.
- The applied readings are not new decisions: superseding DR-0003-0023 beside
  the listed records, and re-opening the two rejections the withdrawal takes.
  Each follows a stated rule, and none is critical.
- Phase 3 `Wrote at` is the time of the post-write validate run, run id
  `run-20260925144111930`: the plan edit landed between the Phase 2 write and
  that run.
- Phase 2b and Phase 4 run no session. Phase 0, Phase 1 and Phase 2c were not
  entered.

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance       | Task title                                                                                            | Input (refs)                                                  | Output (refs)                                                                                                                                                                                                                                                                              | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1    | requirements-analyst  | sdd-withdraw-author  | Stage 0 preflight, and the rerun after Triage                                                         | the amended pack                                              | Run ids `run-20260925143420772` and `run-20260925150016061`: ready, 17 requirements, no pack gaps                                                                                                                                                                                          | PASS                         |
| 2    | requirements-analyst  | sdd-withdraw-author  | Persist Triage group G1 as `## Triage (2026-09-25)`                                                   | `CR-20260925-0010`; approved Triage draft G1                  | `09_delta.md` `## Triage (2026-09-25)` and the `## Change Requests` row                                                                                                                                                                                                                    | PASS                         |
| 3    | requirements-analyst  | sdd-withdraw-author  | Phase 2 and 2b: remove the items, delete and tombstone TDD-0094..0099                                 | settled by `CR-20260925-0010`                                 | `01`..`07`, `tdd/test-list.md`; validate sdd `--spec spec-0003`: the baseline findings only                                                                                                                                                                                                | PASS                         |
| 4    | requirements-analyst  | sdd-withdraw-author  | Phase 3 and Phase 4                                                                                   | `10_Plan.md`, `09_delta.md`                                   | Plan subsection; DELTA-0003, DL-0018..0020, `## Rejected` candidates; Critical Constraint 10: no finding                                                                                                                                                                                   | PASS                         |
| 5    | delivery-planner      | withdraw-triage-gate | Triage gate (`slice-and-scope`, blocking)                                                             | `09_delta.md` `## Triage (2026-09-25)`                        | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                    | PASS                         |
| 6    | solution-architect    | withdraw-design-gate | `design` span gate (blocking)                                                                         | spec-0003 `01`..`10`, `tdd/test-list.md`                      | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                    | PASS                         |
| 7    | completion-reviewer   | -                    | Reviewer Gate                                                                                         | review pack `review-20260925150500003`                        | not yet run                                                                                                                                                                                                                                                                                | PENDING                      |
| 8    | qa-gatekeeper         | -                    | Reviewer Gate: the ledger and coverage changed                                                        | review pack `review-20260925150500003`                        | not yet run                                                                                                                                                                                                                                                                                | PENDING                      |
| 9    | architecture-reviewer | -                    | Reviewer Gate: rules bound to CLI-INIT removed                                                        | review pack `review-20260925150500003`                        | not yet run                                                                                                                                                                                                                                                                                | PENDING                      |
| 10   | test-design-analyst   | withdraw-tda         | Test-design check of the withdrawal (`design` span)                                                   | `03`..`06`, `tdd/test-list.md`, `coverage-depth-spec-0003.md` | PASS: every surviving AC keeps an EX and a TC, and every TC a ledger row at its layer, as at `HEAD`; no example or TC asks for an absence test; TDD-0094..0099 tombstoned, next row TDD-0100; coverage depth scores no withdrawn row. Corrected the stale coverage-depth bullet under Gaps | PASS                         |
| 11   | requirements-analyst  | sdd-withdraw-author  | Low fix (architecture and design advisory): DR-0003-0030 says why `01_Spec.md` names no pack REQ-0001 | DR-0003-0030; Triage group G1                                 | `07_Decisions.md` DR-0003-0030: REQ-0032 carried the pack requirements and G1 withdraws it; they stay traceable through the 2026-09-23 Triage rows                                                                                                                                         | PASS                         |
| 12   | requirements-analyst  | sdd-withdraw-author  | Low fix (Triage-gate advisory): approval note and post-deletion validate lines                        | this block; runs after the test deletion                      | This block `## Triage decisions` (one answer approved G0 and G1 to G4), `## Validate evidence paths` (post-deletion runs), and the `QFAI-ATDD-102` line of `## Gaps / Open risks`                                                                                                          | PASS                         |
| 13   | test-design-analyst   | withdraw-tda         | Low fix: the coverage-depth line of `## Gaps / Open risks`                                            | `.qfai/evidence/coverage-depth-spec-0003.md`                  | This block `## Gaps / Open risks`, the coverage-depth line                                                                                                                                                                                                                                 | PASS                         |
| 14   | backend-engineer      | withdraw-impl        | Both READMEs drop `steering/` (pack REQ-0012)                                                         | `discussion-20260923060900824#REQ-0012`                       | `README.md` and `packages/qfai/README.md`, edited together                                                                                                                                                                                                                                 | PASS                         |

## Gaps / Open risks

- `.qfai/evidence/coverage-depth-spec-0003.md` was recomputed by the stage
  that owns it. It scores no row for TC-0003-0059..0061 or their rules; this
  run does not edit it.
- The two `QFAI-ATDD-102` errors of this spec cleared when the test files were
  deleted; the post-deletion runs above show none.
- `qfai init` writing nothing under `.qfai/steering/` is held by NFR-0006's
  search, not by a test. The user accepted this in approving option 1.
- `CR-20260925-0010` `Applied at` is still `-`; the `## Change Requests` row
  copies it and is filled when the Change Request is.
- Not independent reviewers for this pack: `sdd-withdraw-author`.

## Final status

- Final status: REVISE
- Rationale: the spec side is written and validates as before, but the routed
  gates and reviewers are `PENDING`, so the stage is not done.

---

# Evidence: /qfai-sdd (spec-0003)

## Objective

Apply the approved UPDATE rows of the 2026-09-24 intent-driven entry Triage to spec-0003.

## Inputs reviewed

- `discussion-20260923171450572` (reference, not normative)
- `.qfai/specs/spec-0003/09_delta.md` `## Triage (2026-09-24 intent-driven entry)`
- `.qfai/contracts/cli/qfai-workflow.md`, `workflow-files.schema.md`, `qfai-init.md`, `qfai-validate.md`

## Preflight summary path

- Stage 0: `run-20260924042956656`; ready, 68 REQs, no blockers.
- After Triage: `run-20260924050220859`; ready, 68 REQs, no blockers.

## Triage decisions

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| REQ-0024 | The managed `.gitignore` block ignores `.qfai/runs/` and keeps `.qfai/evidence/workflow/` tracked | UPDATE | MODIFY | - | BR-0003-0013 fixes the block at nine lines and AC-0003-0015 lists them. Both gain the ignore entry and the negation under `.qfai/evidence/*`. Size signal: AC 38 is over 30 and TC 58 over 50 before this change. spec-0003 owns only CAP-0003, so there is no split, and every row here stays an append or a modify | <!-- qfai:not-a-citation -->
| REQ-0059 | Fresh install and upgrade both leave the workflow mode at `active` | UPDATE | APPEND | - | D7 makes `active` the default for every adopter, on fresh install and on upgrade. OQ-0010 decides whether init writes a key or relies on an absent key meaning `active` |
| REQ-0064 | Init and upgrade install `qfai-run` and `qfai-maintain` with their host wrappers, the updated stage skills and references, the plan definitions and the entry instruction | UPDATE | APPEND | - | spec-0003 owns the assistant-tree seed, the host wrappers and the agent entry points. OQ-0017 decides how the entry instruction reaches each host |
| REQ-0065 | Upgrade migration: three install states, a check that skill contracts and manifests correspond, a migration record, and a rerun that duplicates nothing | UPDATE | APPEND | - | AC-0003-0019 and AC-0003-0020 already keep user edits. This adds the correspondence check and the record. `--force` still leaves `manifest/` alone apart from the add-only routing-phase merge |
| NFR-0011 | Init and upgrade behave the same on Windows, including CRLF checkouts and paths with spaces | UPDATE | APPEND | - | Companion to the Windows parity target in `spec-0018`. The user answered OQ-0012 with A: the `windows-latest` job on spec-0017 runs these suites |

## Open questions

- Recorded in `.qfai/specs/spec-0003/08_Open-questions.md` where this change opened or resolved one; the source pack's deferred OQs that this batch settled are cited from the settled sets in the Work Orders Summary below.

## Decisions made

- User decisions this batch used: CREATE CAP-0018 approved; OQ-0020 = A; OQ-0012 = A; TD-22 English seeds; N47 = C (spec-0018 not UI-bearing); J2 = B; Y1 = A; P04 = B (draft PR, merge only when every lane is green); the pack's D1..D18.
- Every other decision was adopted from the griller's recommendation and is listed as a `grilling(<phase>/agents)` row in the Work Orders Summary.
- Recorded decisions for this spec live in `07_Decisions.md` and the Decision Log of `09_delta.md`.

## Work performed

- Phase 2 Slice: `01`..`06` appended/amended per the approved Triage rows (see `09_delta.md` change summary).
- Phase 2b: `tdd/test-list.md` delta rows appended; column-only re-runs for `Blocked-By` and `Test file` (Phase 3 P01/P02).
- Phase 2c: reconciled against CLI-WF / CLI-WFFILE / CLI-INIT / CLI-VAL through the Phase 2c checkpoints recorded below (contract writes W01..W16 recorded in the batch record).
- Phase 3: `10_Plan.md` subsection `### Intent-driven entry (CAP-0018)` in all four sections; Plan gate PASS on cycle 2 (cycle 2).
- Phase 4: `09_delta.md` change summary lines for each phase.

## Contract executability

- none (no `db/` contract authored or changed)

## Commands executed

- `node packages/qfai/dist/cli/index.cjs sdd preflight --fail-on error` (Stage 0) and again after Triage
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --spec spec-0003 --fail-on error --format text`
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --format github`
- `node scripts/check-mdschema.mjs`, `node scripts/check-mermaid.mjs`, `node_modules/.bin/prettier --check`
- The repository build was used rather than `npx qfai`, which resolves a stale published copy; `packages/qfai/dist` was rebuilt from HEAD source with tsup.

## Validate evidence paths

- Spec-scoped validation: `run-20260924143641756`, pass, error=0, warning=26.
- Batch-wide sdd validation: `run-20260924145952965`, fail, error=27, warning=85. Twelve errors were pending review summaries; the other 15 are pre-existing pins in `scripts/dogfood-backlog.json`. The skill stop condition of error=0 was not met.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 2     | run     | 2026-09-24T00:31:55.660Z | 2026-09-24T00:37:43.210Z | 27 settled (Y1 by the user), 0 escalated | #work-orders-summary |
| 2c.1   | run     | 2026-09-24T01:02:25.952Z | 2026-09-24T01:03:17.857Z | 20 settled, 0 escalated | #work-orders-summary |
| 2c.2   | run     | 2026-09-24T01:21:57.179Z | 2026-09-24T01:22:52.841Z | 6 settled, 0 escalated | #work-orders-summary |
| 3      | run     | 2026-09-24T02:07:28.733Z | 2026-09-24T02:36:57.598Z | 19 settled (P04 by the user), 0 escalated | #work-orders-summary |
| 3 (P20) | run | 2026-09-24T05:22:38Z | 2026-09-24T05:31:37.988Z | 1 settled, 0 escalated | #work-orders-summary |

- Batch record: `sdd-batch-20260924045712999.md` (Phase 0 and Phase 1).

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/user): Y1 QFAI-TRACE-001 | working notes | A: accept and record (user); decision and reason recorded in this row | PASS |
| 2 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y2 Where the new tests live | settled recommendation and cited specifications | Decision: New files only: spec-0003 under `packages/qfai/tests/integration/init/`, spec-0017 at `packages/qfai/tests/integration/spec0017WindowsParity.test.ts`, E2E per K01 and L01; reason: `tests/cli/` answers no layer (S24); files named by `done` rows go stale (X18); disagreeing: none | PASS |
| 3 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y3 Row shape | settled recommendation and cited specifications | Decision: Each file keeps its declared form: the word-form `Level` both files declare; spec-0003 rows plus an English `## TC-0003-NNNN` section each; spec-0017 fills `Falsifying oracle`; reason: Both `## Purpose` sections fix the spelling; X20 was a per-file table; disagreeing: none | PASS |
| 4 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y4 Phase 2b seeding | settled recommendation and cited specifications | Decision: Delta only, with `Blocked-By` per the TD table; IDs TDD-0126 and from TDD-0127, and from TDD-0103; the only new findings allowed are `QFAI-ATDD-111`/`-112`, which X27 clears, and Y1; reason: X26, X27; disagreeing: none | PASS |
| 5 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y5 Failure-side scope | settled recommendation and cited specifications | Decision: spec-0003: error rows for kept failures only. spec-0017: its own criterion, one `normal` and one `error` or `boundary` row per AC; reason: Each file's own rule; disagreeing: none | PASS |
| 6 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): Y6 Windows red tests | settled recommendation and cited specifications | Decision: **The rule, recorded.** Every test red on the trial run falls in one class. (1) Platform-inapplicable (a POSIX-only property): `it.skipIf(process.platform === "win32")`, with the property named. (2) Parity defect: fixed in production code, and the test stays as the regression evidence. (3) Test defect (an assumed `/`, LF or case): the test is corrected. For (1) and (3) on a file a `done` row names, the same change appends a re-verify record in the existing form. No test leaves the suite list for being red, and the job is never `continue-on-error`. A class-2 fix that changes behaviour a released contract states is a Change Request and goes to the user. The trial run's per-suite counts go into the delivery evidence; reason: Parity exists to surface these failures; BR-0017-0033; disagreeing: none | PASS |
| 7 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K01 Story and its journey | settled recommendation and cited specifications | Decision: US-0003-0029 (`#DUS-009`), discharged by the spec-0018 journey for that story, annotated with both IDs. **TD condition:** that journey's first step runs `qfai init` from the built CLI and asserts the installed entry (the `qfai-run` wrapper resolves; the directive is present); reason: X10; without the condition the annotation answers over a journey that checks nothing this story delivers; disagreeing: none | PASS |
| 8 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K02 The gitignore MODIFY | settled recommendation and cited specifications | Decision: BR-0003-0013 and EX-0003-0016 state **no line count**. The BR states the outcomes, names `core/gitignore.ts` as SSOT, and names the two new lines and their placement: `.qfai/runs/` in the recommended entries, and `!.qfai/evidence/workflow/` in the governance negations after `.qfai/evidence/*`. AC-0003-0015 gains the two `git check-ignore` outcomes. All rewritten in English with their IDs kept. TC-0003-0018..0020 are untouched; reason: The SSOT holds far more than nine or eleven lines (the recommended entries, the governance negations and the marker); a copied count has already drifted once (S16); disagreeing: RA ("eleven lines"; not taken) | PASS | <!-- qfai:not-a-citation -->
| 9 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K03 ACs and BRs | settled recommendation and cited specifications | Decision: AC-0003-0050, AC-0003-0041..0048, AC-0003-0051, BR-0003-0061 and BR-0003-0051..0058, BR-0003-0062 as tabled, **plus AC-0003-0049 / BR-0003-0059** for the R6 line (K19); reason: One outcome per AC; disagreeing: none | PASS |
| 10 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K04 Contract-Refs in spec-0003 | settled recommendation and cited specifications | Decision: **Accepted: `CLI-INIT` in `Contract-Refs` on the new rows, plus a `## Contract Realization` table naming each section.** A file-local exception to X01's "`-` on new rows": this file's `## Purpose` defines the column as short IDs, and 34 rows already follow it. A `-` beside them would read as "binds no contract". The validators ignore non-`CON-*` values, so it adds no finding; reason: X01's intent (a section-level realization Phase 2c can diff) is met by the table; disagreeing: none | PASS |
| 11 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K05 openai.yaml | settled recommendation and cited specifications | Decision: Under the REQ-0064 row with `Source` `#REQ-0051`. AC-0003-0051 asserts **only** that `init` writes no `agents/openai.yaml`; reason: X03 moved only that half; A5 already gives `disable-model-invocation` one test; disagreeing: SA (both clauses in one BR; the second not taken) | PASS |
| 12 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K06 How J2 is recorded | settled recommendation and cited specifications | Decision: No spec-0003 DR for J2; BR-0003-0056/0057 cite CLI-INIT; the change summary names DR-0015-0010; the ACs claim no chaining after a plain upgrade; reason: One owner per decision; disagreeing: none | PASS |
| 13 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K07 NFR-0011 | settled recommendation and cited specifications | Decision: AC-0003-0048 / BR-0003-0058, plus the `## Applicable NFR` line. CRLF by fixtures; a space in every fixture root plus one built-CLI row; no case-insensitivity row, since no CLI-INIT clause states a case rule; reason: Testable property; N35; S30; disagreeing: none | PASS |
| 14 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K08 01_Spec.md | settled recommendation and cited specifications | Decision: As RA-08, with one correction: the Out line for the invalid-`workflow.mode` config issue names **spec-0018**, not spec-0004 (S19; W2-0004-SA-04); reason: S19; disagreeing: RA (spec-0004; not taken) | PASS |
| 15 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K09 Open questions | settled recommendation and cited specifications | Decision: Three resolved pack OQs (OQ-0010, 0017, 0012) as change-summary lines; no `08` row; reason: The file mirrors deferred questions only; disagreeing: none | PASS |
| 16 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K10 Decision records | settled recommendation and cited specifications | Decision: **Two records, SA-11:** DR-0003-0033 (init keeps exit 0 on a conflicted upgrade; rejected: exit 1, which breaks the released table) and DR-0003-0034 (the entry directive through the generalized review-pointer mechanism; rejected: the managed rules section, a new rule master). Each has a `DL-` twin under a new `## Decision Log`; reason: S10's criterion: both depart from a register recommendation (the Phase 0 final-report lines for N08 and N25), and the spec-0018 settled set left both to spec-0003; disagreeing: RA (no DR; not taken) | PASS |
| 17 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K11 IDs, size, 09_delta.md | settled recommendation and cited specifications | Decision: As RA-11, plus AC-0003-0049, BR-0003-0059, DR-0003-0033/0014 and their DL twins; the block goes under `## 2026-09-24 — Intent-driven entry: change summary`; size line with no split; reason: X09, X16; disagreeing: none | PASS |
| 18 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K12 Install set | settled recommendation and cited specifications | Decision: SA-01 A: no skill list in `init.ts`; schemas stay package-only. The TD rows, with the wrapper matrix discharged by **one executable test** annotated for both spec-0003 and spec-0018 TC IDs (the A5 precedent). `Blocked-By` spec-0018 and each `orchestrated-mode.md` owner; reason: N46; `QFAI-COV-201` needs spec-0003's own TC; disagreeing: none | PASS |
| 19 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K13 Entry directive | settled recommendation and cited specifications | Decision: SA-04 A with the TD-05 rows, including one representative refusal row; reason: N25; disagreeing: none | PASS |
| 20 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K14 Provenance for the plans | settled recommendation and cited specifications | Decision: Governed path prefixes (`constitution/`, `catalog/`, `process/workflows/`); the lock gains `packageVersion` and `conflicts`; the TD-07 rows, including `/`-separated lock keys; reason: N26; `packageVersion` is the released version, not a private marker; disagreeing: none | PASS |
| 21 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K15 Correspondence check and report | settled recommendation and cited specifications | Decision: As SA-06; the TD-08 rows; exit 0 everywhere; reason: N08, N26; disagreeing: none | PASS |
| 22 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K16 Plain init merges no manifest | settled recommendation and cited specifications | Decision: A BR: `manifest/` is create-only on a plain run, and only `--force` merges; the TC checks the manifest is byte-identical; reason: J2 rests on it, and nothing else guards it; disagreeing: none | PASS |
| 23 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K17 FAULT-023 init side, R4 and --force | settled recommendation and cited specifications | Decision: The TD-09 rows. **R4 names `qfai init --force` only for an absent entry**, never for a dropped reviewer, which `--force` does not restore; reason: Naming a command that cannot clear the conflict sends the operator round a loop; disagreeing: none | PASS |
| 24 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K18 The upgrade-state factory | settled recommendation and cited specifications | Decision: One factory with named overlays; an unknown overlay fails; reason: Hermetic; handles CRLF; disagreeing: none | PASS |
| 25 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K19 A plain upgrade and the stage skills it skips | settled recommendation and cited specifications | Decision: **Adopted as R6, inside J2 = B.** It adds a report line and changes no behaviour. It names the same command J2 already names, and it serves REQ-0065 ("its difference … shown") for the other asset a plain upgrade leaves behind. The user answered what a plain upgrade does and which fix it names, and did not limit the report to routing entries. **Condition:** the line says `--force` replaces those skills, because that overwrites local edits. DR-0015-0010 gains one Consequences sentence, written by spec-0015's author, so J2 stays recorded in one place; reason: Hiding the second reason `--force` is needed would mislead; the fallback is not needed; disagreeing: none | PASS |
| 26 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K20 Mode line | settled recommendation and cited specifications | Decision: As TD-06; the `validate` issue is spec-0018's; reason: S19; disagreeing: none | PASS |
| 27 | architecture-reviewer (griller) | p2-w3-griller | grilling(2/agents): K21 EX rows and the TC budget | settled recommendation and cited specifications | Decision: One EX per new BR, EX-0003-0082 and from EX-0003-0083; EX-0003-0016 rewritten; the 30-row TC budget plus one row for AC-0003-0049; reason: Each row a normal path, a declared boundary or a kept failure; disagreeing: RA (an estimate of about 12; superseded by the derivation) | PASS |
| 28 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K1 regression_fix receipts | settled recommendation and cited specifications | Decision: Contract: `regressionFix: { testId, rerunRef, reviewRef }` on a `regression_fix` result, and `invalid-input` reason `regression-fix-receipt`. BR-0018-0039 unchanged; BR-0011-0019 names the field; TC-0018-0068 gains the refusal pair; reason: D18 names the same test, and only a field carries that; it mirrors `testFix`; disagreeing: none | PASS |
| 29 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K2 Direct-exclusion seeds | settled recommendation and cited specifications | Decision: Rewrite ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024 to cover the four missing direct-exclusion classes while keeping the 24 fault and 64 route seed counts; reason: REQ-0007 requires a routing seed for each excluded class. Those four seeds duplicate cases already carried by ROUTE-014, ROUTE-021 or ROUTE-031 after the user chose English-only prompts, so their slots can cover environment settings, SQL files, generated files and QFAI-owned skills or constitution. Each rewritten seed forbids `direct`; disagreeing: SA proposed recording a gap and adding no seed; rejected because it would leave four required classes untested | PASS |
| 30 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K3/K4 Non-CREATE approvals in a run | settled recommendation and cited specifications | Decision: `Authorization-Ref` is valid only on CREATE rows. Other approval-required operations keep the Stage 1 human question; the answer reaches the next attempt through `authorizationRefs`, and the row copies `answeredBy@date` into `Approved By` for the existing validator check; reason: D5 and REQ-0042/0043 require a reference for the routing-time CREATE approval, while DR-0299 preserves the existing questions for the other operations. DPOL-04 requires a recorded human answer without requiring a second carrier on those rows; one CLI-VAL change removes an unreachable Binding branch; disagreeing: RA proposed a new question kind, operation and target fields, and a Binding branch for every approval; rejected as more mechanism than the request needs | PASS |
| 31 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K5 The shared-obligation Boundary rule | settled recommendation and cited specifications | Decision: **A new rule, BR-0013-0036** (AC-Refs AC-0013-0034): a seeded row on an obligation that already has a row names a `Boundary`, and each existing sibling lacking one gains its slug, with `Status` and `Evidence` unchanged. EX-0013-0028's `BR-Ref` names BR-0013-0028 and BR-0013-0036; reason: BR-0013-0028's title says seeding changes no existing row; the slug is the one change to an existing row, so as a bullet it would contradict its own BR; disagreeing: SA (a bullet on BR-0013-0028; not taken) | PASS |
| 32 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K6 The owner of a missing environment | settled recommendation and cited specifications | Decision: Merged. Contract: CLI-WF `### Stage result` states `resolvingOwner`'s domain, a skill a plan names or `operator`. Obligation: BR-0014-0030 is **split**. Three repair kinds return `needs_repair` with `resolvingOwner` `qfai-sdd`, `qfai-atdd` or `qfai-implement`. A missing environment is not a repair: verify returns `blocked`, blocker `stage-blocked`, cleared by `operator`. AC-0014-0027 is reworded to match; reason: The field needs a domain the core can dispatch to, and the environment case already fits the blocker set (REQ-0039); disagreeing: none | PASS |
| 33 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K7 A blocked seam-only result | settled recommendation and cited specifications | Decision: Contract, the seam paragraph: a `blocked` or `unrun` seam-only result blocks the run like any result; the parent acceptance attempt stays open; once `resume` clears it, `next` reissues the seam-only work order as a new attempt; a `needs_repair` seam result routes by its `debts` (R1). No BR changes; one TC in spec-0011; reason: What `next` issues is the core's behaviour; disagreeing: none | PASS |
| 34 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K8 BR-0001-0019's "three" | settled recommendation and cited specifications | Decision: RA-07 A: BR-0001-0019 says the drift protocol's minimal whitelist keeps every exception it lists and gains the two bugfix exceptions (DR-0297); EX-0001-0015 changes only if it counts entries; reason: The spec owns the change to the whitelist, not a copy of it; disagreeing: none | PASS |
| 35 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-09 The unrecorded stop | settled recommendation and cited specifications | Decision: BR-0018-0076: "at the next `resume`"; reason: CLI-WF fires `running → interrupted` from `resume` only (N28); disagreeing: none | PASS |
| 36 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-10 Choosing between runs | settled recommendation and cited specifications | Decision: BR-0018-0066: the worktree's one non-terminal run is what "continue" resumes, so REQ-0002's choice is never put; reason: `run-active` and `identity-mismatch` rule out two candidates (N09, N10); disagreeing: none | PASS |
| 37 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-11 start inputs | settled recommendation and cited specifications | Decision: BR-0018-0011 names `request`, `completionTarget` and `harness`, and says the scope is fixed at routing; reason: CLI-WF `### start`; disagreeing: none | PASS |
| 38 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-12 Debt resolution | settled recommendation and cited specifications | Decision: Option C. **Contract** (CLI-WF `## Completion`): a debt is resolved when the `finish` validate, or a later accepted result of the stage kind that detected it, no longer reports its `findingCode` at its `path`; otherwise it stays `debt-open` with its `resolvingOwner`. **Obligation** (BR-0018-0026): a debt only another spec can resolve keeps the run from completing, as REQ-0037 states, and is repaired by that spec outside the run; reason: Without a resolution, completion is unreachable after any debt; closes the wave-2 advisory; disagreeing: none | PASS |
| 39 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-13 The request-kind clause | settled recommendation and cited specifications | Decision: Contract, the `scope-escape` row of `### Route proposal`: "…, or `requestKind` is not `change`"; reason: It writes down what S27 and DR-0018-0013 already took the row to say; disagreeing: none | PASS |
| 40 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-14 A replan's list | settled recommendation and cited specifications | Decision: Contract: each `priorStageReceiptRefs` entry of a work order is `{ ref, validity }`, with `validity` `valid`, `stale` or `unknown`; the remaining obligations are `ledger.rowIds`. BR-0018-0045 cites it; reason: REQ-0039's list becomes observable on the work order after a replan; disagreeing: none | PASS |
| 41 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-15 R5 narrowed | settled recommendation and cited specifications | Decision: Contract (`## Fail-closed`): a `reviewer-missing` message names `qfai init --force` when the shipped routing entry is absent, and otherwise names the manifest file and the dropped reviewer; reason: `--force` restores an absent entry but not a dropped reviewer. The user's J2 answer concerned what a plain upgrade leaves behind, and K17 of wave 3 already applies this line to R4; disagreeing: none | PASS |
| 42 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-16 The diagnosis names its rows | settled recommendation and cited specifications | Decision: Contract: `diagnosis` gains `matchedRowIds`; cause candidates and impact are content of the record `reproductionRef` names. BR-0011-0016 says so; reason: The core needs the row IDs to bind the `regression_fix` or `test_fix` work order (`ledger.rowIds`); disagreeing: none | PASS |
| 43 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-17 Evidence against write-scope | settled recommendation and cited specifications | Decision: Contract (`### Stage result`), **corrected**: `changedFiles` lists every changed path git does not ignore, and each must lie in a write area. A file a stage writes that git ignores is named in `artifactRefs`, is not a changed file, and is outside `write-scope`. BR-0011-0015: "changes no tracked project file"; reason: SA's directory list ("`.qfai/evidence/` apart from `workflow/`") is wrong. The managed `.gitignore` re-includes tracked governance evidence under `.qfai/evidence/` (`implement-*.md`, `atdd-*.md`, `change-request-*.md`, `decision-*.md`, `decisions/`, `prototyping/grilling.md`), which a stage writes and git tracks. The ignore status is the boundary `finish`'s diff already uses; disagreeing: SA (the directory list; corrected) | PASS |
| 44 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-18 The row digest | settled recommendation and cited specifications | Decision: Contract (`## Ledger row-set check`): the digest covers the row's cells and serves resume reconciliation; `accept` refuses only the two listed changes; any other cell edit is the stage owner's, judged by review; reason: The C3/E4 test fixes edit `Test file` and `Selector`; disagreeing: none | PASS |
| 45 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-19 Missing realization rows | settled recommendation and cited specifications | Decision: Rows added in spec-0018 (13) and spec-0015 (BR-0015-0003); reason: Phase 2c diffs the tables; disagreeing: none | PASS |
| 46 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-20 Lock keys on Windows | settled recommendation and cited specifications | Decision: Contract (CLI-INIT `### Windows parity`): "lock keys are project-relative paths with `/`"; reason: BR-0003-0058 states it, and no contract did; disagreeing: none | PASS |
| 47 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-21 Settled inputs | settled recommendation and cited specifications | Decision: Contract (`### Work order`): `settled`, listing the checked proposal's routing result ID and every answered question as `{ questionId, text, chosen }`. It is runtime only, and the tracked summary copies none of it. BR-0010-0013, AC-0010-0013, BR-0015-0021 and BR-0018-0058 cite it; reason: `inputs` is `{ path, digest }` and no file holds the answers; one field, no new file or writer; NFR-0014 holds, since the work order is under `.qfai/runs/`; disagreeing: none | PASS |
| 48 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-01 Record areas | settled recommendation and cited specifications | Decision: W14, narrowed as above: a separate `recordAreas` keyed on stage kind and bound spec; approval records, `workflow/` and spec `01`..`05`/`07`/`08`/`10` never included; the announcement and `scope.digest` cover the authorized scope only; reason: W05 needs the stage's own tracked records to pass `write-scope`; SA's wording let a stage write approval records and other specs' evidence; disagreeing: SA (the whole tracked evidence tree; narrowed) | PASS |
| 49 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-02 ROUTE-028 | settled recommendation and cited specifications | Decision: Rewrite ROUTE-028, keeping the counts at 24 and 64: one non-terminal run beside a terminal one, conversation binding missing; expected `requestKind: "resume"`, `requiresHumanInput: false`, `must: ["resume_checkpoint"]`, and a `forbid` token for resuming the terminal run, typed in the vocabulary by N41's rule; reason: The seed expects a choice between two live runs, which `run-active` makes unreachable (BR-0018-0066, 2C-SA-10); it stays distinct from ROUTE-027, which has no distractor; disagreeing: none | PASS |
| 50 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-03 DR-0018-0012's counts | settled recommendation and cited specifications | Decision: Four D5 rewrites (ROUTE-014, 035, 055, 056); the K2 bullet (ROUTE-044, 045, 022, 024) unchanged; a new ROUTE-028 bullet; Context counts matched. The DL-0012 twin matches; reason: The record must state what was rewritten; disagreeing: none | PASS |
| 51 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-04 The safety-relevant floor | settled recommendation and cited specifications | Decision: No fixed number anywhere. The floor is whatever N42's rule derives from the rewritten seed file and the typed vocabulary, recomputed before the delivery-planner records the list (by 2026-11-09). N42's "24" is superseded as a planning figure; OQ-0018-0015's text says "derived by the rule"; reason: Both inputs are still changing, and a literal floor in a TC would fail a correct recompute; disagreeing: none | PASS |
| 52 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-05 spec-0013 titles | settled recommendation and cited specifications | Decision: Accept, with one word more: BR-0013-0028 and AC-0013-0034 read "no existing row's status or evidence"; reason: It restates K5's outcome; the only edit to an existing row is the `Boundary` slug, which W11 leaves to the stage owner; disagreeing: none | PASS |
| 53 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-06 spec-0017 is reached | settled recommendation and cited specifications | Decision: Recorded: W13 reaches BR-0017-0071's realization row; re-read with no amendment. The 2c.1 "not reached" line is corrected; reason: BR-0017-0071's realization names CLI-INIT `### Windows parity`; disagreeing: none | PASS |
| 54 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P01 Blocked-By on todo rows | settled recommendation and cited specifications | Decision: **SA-05 A.** The Phase 2b re-run clears `Blocked-By` on every `todo` row of this batch that holds a bare spec ID: the E2E rows of both directions, and the TCs X25 marked `Blocked-By spec-0018`. The order lives in the plans: TD-05's tiers in `## Test approach`, SA-04's units in `## Implementation approach`, and spec-0018's per-journey prerequisite rows as `spec-NNNN:TDD-NNNN`. An implementer who really blocks a row writes the grammatical cell then. **X25 is amended accordingly**; reason: `obligation-columns.md`: "Required on `blocked` rows, blank otherwise", in the form `<blocker> — blocked at <status>`. That no validator parses a `todo` cell (`parseBlockedBy` runs only on `blocked` rows) does not make the value grammatical. X25, my own wave-2 node, was wrong against it; disagreeing: TD (keep the cells; not taken) | PASS |
| 55 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P02 Test-module granularity | settled recommendation and cited specifications | Decision: **TD-10 A.** Test modules one per BR, and several TCs in one module only when they share a BR. The Phase 2b re-run rewrites spec-0018's `Test file` column, splitting `decide.test.ts` (273 rows) and `cli.test.ts` (75) by BR. **`Owning module` stays as seeded (SA-01)**: `decide.ts` whole, the production write set unchanged. For wave-2 and wave-3 specs the ledgers hold `Test file` `-`, and each plan names its modules per BR. **X18 is clarified**: "one new file per spec and subject" means per BR group, never one file per spec; reason: `test-layers.md`: "Default: one test module per `TC-*` … Grouping … when they verify the same BR … Above that, split by BR … A single `Test file` value shared by every row of a spec is an anti-pattern … `qfai-sdd` should emit a per-item `Test file`". SA-01 concerns the production file, which this leaves alone; disagreeing: none | PASS |
| 56 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P03 Journeys for the unreached stories | settled recommendation and cited specifications | Decision: Adopted as **three variants of existing spec-0018 journeys**, recorded in spec-0018 `06` `## E2E journeys`: a `discovery` variant through the discussion stage (US-0010-0013), a `feature` variant with `prototype_decision_needed` (US-0012-0144), and a handover variant asserting the deterministic half (US-0001-0010: a result with an unissued work-order ID is refused and nothing changes, and `qfai-run` is installed where the entry check points; the model's pickup stays release evidence). Each is annotated with the stage story's ID. **No new spec-0018 story or ledger row**: the E2E rows are the stage specs' own, which already exist. **No upgrade journey for US-0003-0029**: K01 of wave 3 settled that it is discharged by the spec-0018 journey whose first step runs `qfai init`, with the upgrade half held in L3 rows. TD-03's mapping table goes in spec-0018's plan; reason: Within the request: X10 already committed the spec-0018 journeys to discharge each stage story, and `QFAI-ATDD-111` needs them. Marking the stories `planned` would defer obligations the approved triage carries; disagreeing: TD (new journeys with ledger rows, and the upgrade journey; not taken) | PASS |
| 57 | architecture-reviewer (griller) | p3-griller | grilling(3/user): P04 X27 and pushes | working notes | B: push freely to a draft PR, merge only when every lane is green (user); decision and reason recorded in this row | PASS |
| 58 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P05 Coverage Depth Matrix pins | settled recommendation and cited specifications | Decision: The push that adds a spec's first matrix (spec-0001, 0004, 0010, 0011, 0012, 0015) also re-pins `full` with `--profile full --pin`, which strikes that spec's `QFAI-ATDD-131` entry. The six plans say so in `## Test approach`. No matrix is written in SDD; reason: The backlog rule re-pins a file that improves in the same change, and a count below its pin fails; disagreeing: none | PASS |
| 59 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P06 Units and tiers | settled recommendation and cited specifications | Decision: **Both, reconciled.** SA's six units are the implementation order in `## Implementation approach`; TD's five tiers are the green order in `## Test approach`. U1 = tier 1; U2, U3, U4 = tier 2; U6 = tiers 3 and 4, with the stage E2E rows closing at tier 5. **The Windows job (U5) lands after U1 and U4**, once its suite entries resolve (BR-0017-0074, TC-0017-0095), and does not wait for the journeys. The routing eval comes last, at release; reason: The Windows job needs its suites, not the journeys; disagreeing: TD (Windows at tier 5 after the journeys; not taken) | PASS |
| 60 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P07 Plan headings and form | settled recommendation and cited specifications | Decision: Under each existing section, one English subsection **`### Intent-driven entry (CAP-0018)`**, in all four sections and all eleven existing plans. A line this change makes false is rewritten in place, in English (TD-01; G14 in spec-0001). Legacy text and legacy risk rows are not touched. A risk section without the four columns gets its new rows as a four-column table inside the subsection (RA-01). spec-0018's new plan needs no subsection; reason: The validator's `QFAI-PLAN-003` matches `changelog`, `history` and `update history`, not a date, so both headings pass. A subject-named heading states what the plan covers, not when, which suits OC-04 (history belongs in `07` and `09`); disagreeing: RA, TD (`(2026-09-24)`; not taken) | PASS |
| 61 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P08 Risk-row ownership and form | settled recommendation and cited specifications | Decision: RA-04 A: one risk row per limit, in the plan that owns its record or mechanism; others cite it in an NFR bullet; L4 and L6 get two rows each, one per failure. RA-05 ratings (`low`/`med`/`high`, as `likelihood / impact`) and observable triggers. **Batch-level risks:** X27's row is in spec-0018's plan only, written from P04's answer. **RA-06's other two rows are dropped**: the `Blocked-By` cycle is removed by P01, and the module names are fixed by P02's re-run. spec-0008's third row (RA-10) is reworded to "the order is spec-0018's plan (P06)", since its cell is cleared; reason: One owner per mitigation stops five copies drifting; a resolved risk is not a risk; disagreeing: SA (X27 in every plan that adds E2E or ATDD rows; not taken) | PASS |
| 62 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P09 NFR approach | settled recommendation and cited specifications | Decision: RA-02 A: the three groups; group 2 (NFR-0002, 0015, 0017 wherever a shipped asset or an operator string changes) cites the existing guard. RA-03 A: a measurement is an observation that exists or is scheduled. NFR-0006, 0008 and 0018 are measured at a release step, with no claim before it (OC-80); reason: N46; OC-80; disagreeing: none | PASS |
| 63 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P10 spec-0018's new 10_Plan.md | settled recommendation and cited specifications | Decision: Three authors, one file, written in sequence to avoid conflicting edits. The solution-architect creates the file and writes `## Implementation approach` (the seven elements with their usages, U1..U6, the SSOT-modules step, and what it leaves out). Then the test-design-analyst writes `## Test approach` (TD-31, the tiers, the P03 mapping and variants, the fault-seed index, the eval). Then the requirements-analyst writes `## NFR approach` and `## Risk mitigation` (RA-18 rows, minus the two dropped under P08); reason: Each section is its owner's; disagreeing: none | PASS |
| 64 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P11 Elements, usages and what each plan leaves out | settled recommendation and cited specifications | Decision: Adopted as proposed: spec-0018's seven elements with at least three usages each; spec-0001 and spec-0003 each introduce one element; the others none, said in one line; the leave-out lists; the CLI-WF/CLI-WFFILE SSOT-modules move in U1; reason: The template's element rule; disagreeing: none | PASS |
| 65 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P12 Y1 in the plans | settled recommendation and cited specifications | Decision: spec-0014's and spec-0017's plans record Y1 = A with the counts (4 and 3) and the trigger "count differs, or `build` gains `origin/main`". Both record the CI gap that the dogfood lanes cannot run `QFAI-TRACE-001`; reason: Records the user's answer and decides nothing; disagreeing: none | PASS |
| 66 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P13 CR-20260913-0005's ID clash | settled recommendation and cited specifications | Decision: Out of this batch: one risk row in spec-0014's plan saying the CR takes the next free TDD ID at its approval; reason: Not this batch's change; disagreeing: none | PASS |
| 67 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P14 Windows job test approach | settled recommendation and cited specifications | Decision: Adopted, with P06's land order. spec-0003's tests go in `tests/integration/init/`; links are created in temp dirs; CRLF comes from fixtures; the temp root is read from the environment; the build is in the job; the trial run sets the baseline under Y6; reason: S24, S30, Y6; disagreeing: none | PASS |
| 68 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P15 The routing eval | settled recommendation and cited specifications | Decision: Adopted: the deterministic halves are CI rows; the runner is manual, run last at release; the record carries the three digests; two open inputs (OQ-0018-0013, OQ-0018-0015); English only; reason: N40, N42, N45, M20; disagreeing: none | PASS |
| 69 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P16 Known findings each plan records | settled recommendation and cited specifications | Decision: Adopted; the X27 line is written from P04's answer (under B, the expected-findings list per push); reason: A reviewer must not read them as new; disagreeing: none | PASS |
| 70 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P17 spec-0017 Tier | settled recommendation and cited specifications | Decision: Raise the seven spec-0017 rows to T2 in the P02 re-run **only if** the Phase 2b seeding rule ("seed `Tier` … from … what the item touches") names CI infrastructure as a raising factor; the test-design-analyst checks its text at write time and otherwise leaves `-`; reason: It applies an existing seeding rule, or nothing; disagreeing: none | PASS |
| 71 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P18 Per-spec risk and NFR rows | settled recommendation and cited specifications | Decision: Adopted as listed, with the P08 rewording for spec-0008 and the P04 answer for any X27 citation; reason: P08, P09; disagreeing: none | PASS |
| 72 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P19 Per-spec test approaches | settled recommendation and cited specifications | Decision: Adopted as listed, with three changes: TD-21's US-0003-0029 journey is K01's, not an upgrade journey (P03); each spec's order line cites P06; each module list is per BR (P02); reason: P02, P03, P06; disagreeing: TD (the upgrade journey; not taken) | PASS |
| 73 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P20 validator treats process/workflows as a governed layer; owner spec-0004 (new approval-free UPDATE/APPEND row) | settled recommendation and cited specifications | Decision: Use the full governed-layer provenance check for `process/workflows` through one shared path-to-layer helper; add the approval-free spec-0004 UPDATE/APPEND row and reconcile it at checkpoint 2c.6.; reason: The existing CLI-INIT contract makes plans a governed layer, while validate currently reads only first path segments.; disagreeing: none | PASS |

## Gaps / Open risks

- Pushes before ATDD and implementation land show `QFAI-ATDD-111/112` and RED acceptance tests; each push lists its expected findings in the relevant Plan under `Findings carried on purpose` and merge waits for every lane to be green (P04 = B).
- The push carrying this batch re-pins `full` for `discussion-20260418170937652` (pinned 2, now 0) and strikes the first-matrix `QFAI-ATDD-131` pins (spec-0001, 0004, 0010, 0011, 0012, 0015).
- A plain `qfai init` upgrade does not merge `agent-routing.yml` or replace changed stage skills; `start` fails closed until `qfai init --force` (user J2 = B; DR-0015-0010).

## Final status

- Final status: REVISE
- Rationale: reviewer findings are being addressed; the batch-wide sdd validation still contains pinned errors.
