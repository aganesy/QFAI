# 09 Delta

<!-- Multi-run layout. `/qfai-sdd` is re-run against the same spec, so this
     file grows: a run appends, and never replaces what is already here.

     A re-run's Triage rows go either in another `### DELTA-NNNN (YYYY-MM-DD)`
     sub-section under the `## Triage` below, or under a second H2 that names
     its round in parentheses — `## Triage (2026-01-01)`. Every `## Triage`
     section in the file is validated, and the parenthesised qualifier is the
     only form that keeps two of them distinct. Any other trailer
     (`## Triage — 2026-01-01`, `## Triage Table`) or a demoted `### Triage` is
     read by no Triage validator; `QFAI-TRIAGE-008` reports it.

     `## Change Summary` has no such qualifier. Keep one and append inside it. -->

## Change Summary

> One entry per `/qfai-sdd` run, appended in run order. Do not replace the
> previous entry and do not open a second `## Change Summary`.

- Change ID: DELTA-0001
- Date: 2026-09-23
- Primary: Initial
- Tags: @api, @nfr, @docs, @test
- Summary: created this spec for `/qfai-migration-spec-to-story` in the batch
  run `sdd-batch-20260923100952585`. It holds US-0018-0001..0010,
  AC-0018-0001..0027, BR-0018-0001..0060, EX-0018-0001..0082,
  TC-0018-0001..0082, ledger rows TDD-0001..0094 (all `todo`),
  DR-0018-0001..0013 and the plan. Nothing is implemented yet; every item lands
  in the P2–P8 pull request.

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: Behavior
- Tags: @api, @docs, @test
- Summary: step 3 archives the entire old `_policies/11_Slice-Policy.md` and
  copies none of its sections to `principle.md`. DR-0018-0005, AC-0018-0012,
  BR-0018-0027..0028, EX-0018-0021/0037 and TC-0018-0037 now state the
  exception. The other source-map section merges remain in force. The shipped
  `qfai-sdd/references/sdd-triage.md` owns current operation, approval, impact
  cascade and ID rules; old CAP/spec/TC and positional-gap rules remain only in
  the archive. The CLI migration contract, skill and guide agree.

<!-- A second run appends another five-line entry here (`- Change ID: DELTA-0002`, ...). -->

## Update History

| Date       | DL      | Summary                                                                      |
| ---------- | ------- | ---------------------------------------------------------------------------- |
| 2026-09-23 | DL-0001 | The migration guide ships inside the skill (DR-0018-0001)                    |
| 2026-09-23 | DL-0002 | Step 1 moves entry by entry and moves a colliding entry aside (DR-0018-0002) |
| 2026-09-23 | DL-0003 | Consumed sources are removed; content with no destination is archived        |
| 2026-09-23 | DL-0004 | Step 3 moves the shared policy files; step 4 moves capabilities and flows    |
| 2026-09-23 | DL-0005 | Step 3 states each fact once by moving whole sections (DR-0018-0005)         |
| 2026-09-23 | DL-0006 | Progress is read from the tree, with no progress file (DR-0018-0006)         |
| 2026-09-23 | DL-0007 | The old non-functional lists go to a person (DR-0018-0007)                   |
| 2026-09-23 | DL-0008 | A configured path is neither moved nor rewritten (DR-0018-0008)              |
| 2026-09-23 | DL-0009 | Step 4 computes the test-case-to-example map (DR-0018-0009)                  |
| 2026-09-23 | DL-0010 | The status map for the two tables (DR-0018-0010)                             |
| 2026-09-23 | DL-0011 | Old deferral markers are reported wherever they are (DR-0018-0011)           |
| 2026-09-23 | DL-0012 | This spec is not split or trimmed to a size threshold (DR-0018-0012)         |
| 2026-09-23 | DL-0013 | Rules cite their CLI contract in the rule text (DR-0018-0013)                |

## Decision Log

> This is the only section `npx qfai report` reads for Change Type metrics.
> One `### DL-NNNN` entry per decision, each carrying a `#### Meta` YAML block
> with all seven keys. A delta recorded anywhere else is invisible to the
> tooling and reports as zero decision entries.

Each entry records one decision of `07_Decisions.md`. All thirteen were settled
in the delegated Phase 2 grilling of the batch run, by the griller's
recommendation, and none needs a migration: the spec is new and nothing is
implemented yet.

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-23
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - packages/qfai/assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/references/migration-guide.md
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0001 — the guide ships as references/migration-guide.md in the skill and names the release 2.0.0 without a v.
```

#### Migration / Follow-ups

- No migration required. The guide lands with the skill at P5 and passes the
  three distributed-surface guards like every shipped file (TC-0018-0072).

#### Rejected

- option: The guide inside `SKILL.md`
  reason: `SKILL.md` is instructions to an AI, not to a person.
  do_not: Put the person-facing guide into `SKILL.md`.
  temptation: The skill directory already has one document every reader opens.
- option: The guide under `packages/qfai/docs/`
  reason: That directory does not ship, so an adopter never receives it.
  do_not: Write the guide where `package.json#files` does not reach.
  temptation: The repository's other long-form documentation lives there.

### DL-0002

#### Meta

```yaml
id: DL-0002
date: 2026-09-23
primary: Initial
tags: ["@api", "@nfr"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step01RenameDirectories.ts
  - .qfai/contracts/cli/qfai-migration-spec-to-story.md
notes: DR-0018-0002 — step 1 moves each legacy entry on its own and moves one whose destination exists to legacy/<dir>/, deleting nothing.
```

#### Migration / Follow-ups

- No migration required. The contract's step-1 description states the
  move-aside (Phase 2c, P2C-05).

#### Rejected

- option: Delete the legacy governed directories
  reason: The skill does not require a clean working tree, so a legacy
  directory can hold uncommitted edits that deletion loses.
  do_not: Delete a legacy directory entry instead of moving it aside.
  temptation: After `qfai init` writes the new directories, the legacy copy
  looks like a stale duplicate.
- option: List each collision for a person
  reason: Step 1 prints no `## For a person` section, and the move-aside loses
  nothing.
  do_not: Add a report section to step 1 for collisions.
  temptation: A collision looks like something a person should decide.
- option: Refuse with exit 2 on a collision
  reason: Every project that ran the new `qfai init` has collisions, so the
  step would never run.
  do_not: Treat an existing destination as an error.
  temptation: Refusing is the safest-looking answer.

### DL-0003

#### Meta

```yaml
id: DL-0003
date: 2026-09-23
primary: Initial
tags: ["@api", "@nfr"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0003 — each step removes a source once its content is written elsewhere, and archives a file with no destination under retired/.
```

#### Migration / Follow-ups

- No migration required. The old ledgers keep resolving because
  `10_Plan.md`, `16_Traceability-ledger.md` and `tdd/` are archived rather than
  deleted.

#### Rejected

- option: Delete files that have no destination
  reason: The evidence pointers of the old ledgers would stop resolving.
  do_not: Delete a source whose content was not written elsewhere.
  temptation: Those files have no place in the story tree.
- option: A final sweep step
  reason: It changes the settled step list.
  do_not: Add an eleventh step for cleanup.
  temptation: One place for all removal looks simpler.
- option: Leave removal to a person
  reason: The spec-pack directories would survive and the old-layout error
  would never clear.
  do_not: End a step with its consumed sources still in place.
  temptation: Not deleting anything looks safest.

### DL-0004

#### Meta

```yaml
id: DL-0004
date: 2026-09-23
primary: Initial
tags: ["@api"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step03MoveCatalog.ts
  - packages/qfai/src/migration/specToStory/step04RenumberIds.ts
  - .qfai/contracts/cli/qfai-migration-spec-to-story.md
notes: DR-0018-0004 — step 3 moves _policies/05, 06 and 07; step 4 moves 03 and 04, whose content only the plan's flows can place.
```

#### Migration / Follow-ups

- No migration required. The contract's step-3 and step-4 descriptions name
  these sources (Phase 2c, P2C-05).

#### Rejected

- option: A new step for the shared policy files
  reason: It changes the settled step list.
  do_not: Add a step to move `_policies/03` to `07`.
  temptation: None of the existing step names mentions these files.

### DL-0005

#### Meta

```yaml
id: DL-0005
date: 2026-09-23
primary: Initial
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step03MoveCatalog.ts
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0005 — step 3 moves content section by section by the source map, writes an identical paragraph once, and sends an unmapped section to its source's default destination.
```

#### Migration / Follow-ups

- No migration required. A duplicate that is not word for word is found by the
  skill after step 3, not by the script.

#### Rejected

- option: List every unmapped section for a person
  reason: Step 3 would print a report section it does not otherwise need.
  do_not: Stop step 3 on a section the map does not name.
  temptation: A person seems better placed to judge an unknown section.

### DL-0006

#### Meta

```yaml
id: DL-0006
date: 2026-09-23
primary: Initial
tags: ["@api", "@nfr"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/harness.ts
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0006 — the order guard and the nothing-to-migrate case are inferred from the tree, so idempotency holds by construction.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A progress file recording which steps ran
  reason: A second run would have to update it, so idempotency would no longer
  hold by construction.
  do_not: Write a file that records migration progress.
  temptation: A progress file makes the order guard a one-line lookup.
- option: The old-layout predicate of `qfai init` alone
  reason: It cannot tell the steps apart.
  do_not: Gate the steps on init's predicate.
  temptation: The predicate already exists and is tested.

### DL-0007

#### Meta

```yaml
id: DL-0007
date: 2026-09-23
primary: Initial
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step07RulesToContracts.ts
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0007 — step 7 lists each pack's Applicable NFR under For a person, naming the contracts that pack's rules went to.
```

#### Migration / Follow-ups

- No migration required. Step 7 exits 3 on any project whose packs list a
  requirement.

#### Rejected

- option: A non-functional field in contracts
  reason: It contradicts the contract rule schema, which carries only rules.
  do_not: Add a non-functional field to a contract form.
  temptation: The list would then have a home no person has to choose.
- option: Drop the list
  reason: The requirements would be lost without anyone deciding so.
  do_not: Discard an Applicable NFR list silently.
  temptation: The story tree has no place for it.

### DL-0008

#### Meta

```yaml
id: DL-0008
date: 2026-09-23
primary: Initial
tags: ["@api"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step01RenameDirectories.ts
notes: DR-0018-0008 — step 1 moves a directory and rewrites its config key only where the key holds the old default.
```

#### Migration / Follow-ups

- No migration required. The write set includes a configured `paths.specsDir`
  or `paths.contractsDir` outside `.qfai/`, as the user decided for P2C-05b.

#### Rejected

- option: Always move to the new default
  reason: It overrides a location the project chose.
  do_not: Rewrite a `paths.*` key that does not hold the old default.
  temptation: One target layout for every project looks tidier.

### DL-0009

#### Meta

```yaml
id: DL-0009
date: 2026-09-23
primary: Initial
tags: ["@api"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step04RenumberIds.ts
  - packages/qfai/src/migration/specToStory/idMap.ts
notes: DR-0018-0009 — step 4 computes the test-case-to-example map with step 6's derivation and writes it into the ID map once.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Step 5 appends its map to the ID map
  reason: The contract has step 4 write the ID map once.
  do_not: Write to `id-map.json` from any step but step 4.
  temptation: Step 5 is where test-case-only rows become examples.

### DL-0010

#### Meta

```yaml
id: DL-0010
date: 2026-09-23
primary: Initial
tags: ["@api"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step02MergeTables.ts
notes: DR-0018-0010 — the fixed map from old record statuses to the Status vocabulary of decisions.md and open-questions.md.
```

#### Migration / Follow-ups

- No migration required. A superseded record naming no successor becomes a
  TODO row listed for a person (Phase 2c, P2C-O2).

#### Rejected

- option: List unknown statuses for a person
  reason: Step 2 would print a report section it does not otherwise need.
  do_not: Stop step 2 on an unrecognised status.
  temptation: An unknown status looks like something a person should read.

### DL-0011

#### Meta

```yaml
id: DL-0011
date: 2026-09-23
primary: Initial
tags: ["@api", "@test"]
compat: Improvement
scope:
  - packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts
notes: DR-0018-0011 — step 8 reports every x-qfai-status planned or external line, in test files and under the spec tree.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Report markers in test files only
  reason: The markers step 4 carries into the story blocks would go
  unreported.
  do_not: Limit the marker scan to test files.
  temptation: Step 8 is the annotation step, and annotations live in tests.

### DL-0012

#### Meta

```yaml
id: DL-0012
date: 2026-09-23
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - .qfai/specs/spec-0018/
notes: DR-0018-0012 — the spec keeps every rule and its example although it carries more than 50 test cases.
```

#### Migration / Follow-ups

- No migration required. A later requirement on the migration skill is routed
  here as an append, with its size stated in the Triage rationale.

#### Rejected

- option: Fold rules together to get under the size threshold
  reason: No validator enforces the threshold, and folding loses the one-rule,
  one-example trace.
  do_not: Merge rules or examples to reduce the count.
  temptation: The Triage size test reads as a limit.

### DL-0013

#### Meta

```yaml
id: DL-0013
date: 2026-09-23
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - .qfai/specs/spec-0018/04_Business-Rules.md
notes: DR-0018-0013 — Contract-Refs holds -, and each rule names its CLI contract file and section in its Rule cell.
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Short contract IDs in `Contract-Refs`
  reason: No tool traces CLI contract IDs from that column.
  do_not: Put a CLI contract ID in `Contract-Refs`.
  temptation: The column name suggests it holds every contract a rule cites.

## Rationale

- No active spec owned project migration. The discussion pack requires a skill
  that moves an adopter from spec packs to the story tree
  (`discussion-20260923063306456#REQ-0019`), loses no test case (`REQ-0020`),
  states each merged fact once (`REQ-0023`), and meets NFR-0001, NFR-0002,
  NFR-0003, NFR-0008 and NFR-0010.
- `CAP-0018` is registered for it in `_policies/03_Capabilities.md`, so it maps
  to this spec.

## Candidates Considered

1. A new spec owning the migration skill.
2. The migration inside spec-0003, beside `qfai init`.
3. A `qfai migrate` subcommand instead of a skill.

## Adopted

- Adopted: a new spec owning the migration skill
- Why: the slice policy puts one skill in one spec. The skill ships ten thin
  scripts that load the implementation from the installed package, so no
  command surface is added (N14).
- Evidence: the CREATE row below; `.qfai/evidence/sdd-batch-20260923100952585.md`
  (Stage 1, Phase 0 N14, Phase 2 and Phase 2c).

## Rejected

- Candidate: the migration inside spec-0003
- Reason: spec-0003 is the `init` command and is already over both size
  thresholds, and the slice policy puts one skill in one spec.
- DO NOT: add migration steps to spec-0003's items.
- Temptation: `qfai init` already detects the old layout and ships the skill.
- Re-opened by: `-`

- Candidate: a `qfai migrate` subcommand
- Reason: out of scope in the discussion pack, and rejected by N14.
- DO NOT: add a `qfai` subcommand for the migration.
- Temptation: a subcommand would reuse the CLI's argument parsing and help.
- Re-opened by: `-`

<!--
`Re-opened by:` is the only sanctioned route out of `DO NOT`. Moving a rejected
candidate to `## Adopted` without it is the reintroduction the Delta Rejected
Guard blocks; `npx qfai validate` reports `QFAI-DECISION-006` when a
`- Candidate:` here also appears as an `- Adopted:` name while its own
`Re-opened by:` is empty, and `QFAI-DECISION-004` when the ID here resolves to
no `Status: re-open` record — and equally when such a record names no candidate
here. One `Re-opened by:` covers the candidate block it sits under, so a delta
re-adopting two candidates writes one per candidate.
-->

## Impact

- Affects: `packages/qfai/src/migration/specToStory/`, the re-export in
  `packages/qfai/src/index.ts`, the shipped skill
  `qfai-migration-spec-to-story` (`SKILL.md`, `references/migration-guide.md`,
  `scripts/_step.mjs` and ten step scripts), the fixture
  `packages/qfai/tests/fixtures/migration-spec-to-story/`, and
  `.qfai/contracts/cli/qfai-migration-spec-to-story.md`.
- Validation: `qfai validate --profile sdd --spec spec-0018` with no error; at
  landing, every ledger row green and the `tdd` and `full` profiles clean for
  this spec.

### Landing

Delivery is three pull requests (P3-C1 to P3-C3):

1. P1 alone, merged first: the guard pattern sets, the shape table, and the
   removal of out-of-band IDs from shipped files, as a cleanup commit followed
   by the guard commit.
2. P2 to P8 in one pull request, which also runs `/qfai-atdd` and
   `/qfai-implement` and merges with their tests.
3. The removal of the guard exception for the migration memo's file name, on
   its own, after the second has merged.

This spec has no work in the first or the third. Every row lands in the second,
at P5, in the order `10_Plan.md#order-of-work` gives.

| Triage row                            | Items                                                                                                                                                                                                                                                                                                      | Ledger rows                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| CREATE `spec-0018`                    | US-0018-0001..0003, 0005, 0006, 0008..0010; AC-0018-0001..0008, 0010, 0011, 0014..0018, 0021..0027; BR-0018-0001..0019, 0021..0026, 0031..0042, 0049..0058, 0060; EX-0018-0001..0026, 0028..0034, 0040..0054, 0063..0075, 0077..0079, 0081, 0082; the TC of the same number as each EX; DR-0018-0001..0013 | TDD-0001..0026, 0028..0034, 0040..0054, 0063..0075, 0077, 0078, 0080..0085, 0087..0090, 0093, 0094 |
| UPDATE APPEND, migration step 3       | US-0018-0004; AC-0018-0012, 0013; BR-0018-0027..0030, 0059; EX-0018-0035..0039, 0080; TC-0018-0035..0039, 0080                                                                                                                                                                                             | TDD-0035..0039, 0076, 0091, 0092                                                                   |
| UPDATE APPEND, migration step 7       | US-0018-0007; AC-0018-0019, 0020; BR-0018-0043..0048; EX-0018-0055..0062, 0076; TC-0018-0055..0062, 0076                                                                                                                                                                                                   | TDD-0055..0062, 0079, 0086                                                                         |
| UPDATE APPEND, `skills.local` renamed | AC-0018-0009; BR-0018-0020; EX-0018-0027; TC-0018-0027                                                                                                                                                                                                                                                     | TDD-0027                                                                                           |

No row here is a REMOVE, so the landing retires no item and tombstones no
ledger row of this spec.

### Co-changes the landing carries

- `qfai init` ships and links the skill in the same phase, under spec-0003.
- The contract gains its `SSOT modules:` entry naming
  `packages/qfai/src/migration/specToStory/`.
- `runMigrationStep` is re-exported from `packages/qfai/src/index.ts`, so
  `dist/index.d.ts` carries it and the post-build guard reads it.
- `/qfai-atdd` writes `packages/qfai/tests/e2e/spec0018MigrationJourneyE2E.test.ts`
  for TDD-0073..0082 and the integration tests in the same pull request, which
  clears `QFAI-ATDD-111` and `QFAI-ATDD-112` for this spec without a dogfood pin
  (P3-C1).
- TDD-0039, TDD-0067, TDD-0068, TDD-0091 and TDD-0092 go green only after P6
  lands, in the same pull request. Their code lands at P5 and does not change.
- At P7 the skill migrates this repository's own `.qfai/` (OQ-0170). The P7
  deletion list is checked against the importers under
  `packages/qfai/src/migration/`, and step 8 keeps its own copy of the old
  `QFAI:SPEC-` annotation pattern because P7 deletes the old validators.

## Follow-ups

- Take the ledger rows to green in the P2–P8 pull request, in the plan's order.
- Owner: `/qfai-atdd` and `/qfai-implement`, run inside that pull request.
- Due: when that pull request merges; no date is set.

### Recorded drift

Found while drafting and recorded rather than fixed under these rows (X11).

- BR-0018-0003 resolves `qfai` from the project root, while the shipped loader
  uses a native `import("qfai")`, which resolves from the script's location.
  For a skill installed under the project root both reach
  `<project root>/node_modules/qfai`. Open only for a skill installed elsewhere,
  which nothing ships.
- The `Owning module` cells name the skill's `skill/` path, which exists only
  from P6. The plan carries this as a risk.

### Gaps settled in Phase 2c

The Phase 2 writers reported these, and the Phase 2c grilling settled each one
(`.qfai/evidence/sdd-batch-20260923100952585.md#phase-2c-grilling-decisions`).

- A superseded record naming no successor becomes a TODO row listed for a
  person (BR-0018-0023).
- An example with no single derived criterion stays in its pack with no new ID
  and is listed by step 4 (BR-0018-0033, BR-0018-0042).
- A plan flow that continues no old flow gets the template skeleton and is
  listed (BR-0018-0034).
- Step 3 archives what is left of the abolished assistant directories under
  `retired/assistant/<dir>/`, and moves a `*.local.md` overlay beside its
  master under `rule/` (BR-0018-0015).
- A `QFAI:SPEC-NNNN:` annotation step 8 neither rewrites nor keeps is left
  unchanged and listed (BR-0018-0052).
- A row that opens with `Change request:` or `Unadjudicated:` carries its
  origin in Approach, not Content (BR-0018-0021, BR-0018-0025).
- A step 4 run whose plan disagrees with the existing ID map exits 2
  (BR-0018-0035).
- The working directory must hold `qfai.config.yaml`, with no upward search
  (BR-0018-0002): confirmed unchanged.
- The migration writes into a configured `paths.specsDir` or
  `paths.contractsDir` outside `.qfai/`, decided by the user (P2C-05b).
- The `Owning module` cells were filled in Phase 3.

### Corrections to this run's own items

This spec is created in this run, so these edits change items no earlier
run wrote.

- BR-0018-0027, EX-0018-0035 and TC-0018-0035 name the contract directory as
  `<paths.contractsDir>/` where the Phase 2 text wrote `03_contract/`. This
  is the Phase 2c carry-over correction: Phase 2c placed `tech.md` and
  `structure.md` under `<paths.contractsDir>`, and every reader of the
  contract directory goes through that key
  (`.qfai/contracts/cli/qfai-init.md#configuration`). It was applied in
  Phase 4. The plan's references still hold: `10_Plan.md` names no
  `03_contract/` path, and its step 3 row and TDD-0035's owner name
  `step03MoveCatalog.ts`, which the correction does not touch.
- The Notes of US-0018-0004 name `<paths.contractsDir>/tech.md` and
  `<paths.contractsDir>/structure.md`, as BR-0018-0027 does.
- `06_Test-Cases.md#how-level-was-derived` describes the harness the plan
  uses: the L3 cases run in process through `runStep`, and TC-0018-0001 to
  TC-0018-0004 spawn the real script. No `Level` changed.
- BR-0018-0058, AC-0018-0027, EX-0018-0072 and TC-0018-0072 state that 2.x
  does not read the spec-pack layout: a project that keeps it stays on a
  pinned 1.x release, and a project that upgrades runs the migration first
  (user answer U2 in the batch record). It is an assertion on the same row,
  not a new boundary, so TDD-0072 is unchanged. `10_Plan.md` step 4 of the
  order of work names the statement.
- `10_Plan.md` lists the contract
  `.qfai/contracts/cli/qfai-migration-spec-to-story.md` as architectural
  element 4, with its usages.

The Reviewer Gate's second cycle (2026-09-24) made these edits:

- Step 4 re-keys the `.qfai/steering/*.md` work-log entries (review ruling
  D13 in the batch record). Without it, an entry keyed on a spec ID is never
  read again after the cutover. New items: the `And` line of AC-0018-0014,
  BR-0018-0060, EX-0018-0081 and EX-0018-0082, TC-0018-0081 and TC-0018-0082
  (`L3`), and ledger rows TDD-0093 and TDD-0094 (Integration, T2, `todo`,
  owner `step04RenumberIds.ts`). All six IDs were unused. They land with the
  CREATE row. `01_Spec.md` names the entries in its scope. `10_Plan.md` adds
  the re-key to the step 4 module row, a reuse row for
  `collectWorklogEntries`, the boundary, the NFR-0001 breach measure, the
  L3 count (79 cases, 81 ledger rows), and a P7 note: this repository's
  entries are re-keyed in the migration commit, before the work-log readers
  change.
- `10_Plan.md`: element 3's import-resolution paragraph and its usages sit
  under element 3 again, and element 4 follows them.

The implementation contract was clarified before the migration code landed:

- The migration contract now fixes the `plan.yaml` shape and old-flow
  selector. BR-0018-0004, BR-0018-0031, BR-0018-0032 and BR-0018-0034,
  with EX/TC-0018-0005, 0040, 0041 and 0077, require prewrite refusal of an
  invalid plan and safe reporting of an omitted `from`. Step 4 keeps old AC
  source order after explicit ownership resolves ambiguity.
- Step 9 preserves an occupied user-owned wrapper or obsolete roster and
  reports it for a person; failed inspection exits 2 before writing. The CLI
  contract, BR-0018-0053, EX-0018-0067 and TC-0018-0067 share that boundary.

## Change Requests

<!-- The canonical CR-reference record required by
     `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected` step 4. One row per
     approved Change Request whose owner-skill rerun landed in this spec. The
     rerun writes it in Phase 4, never before approval. `Mode` is the rerun mode
     the CR approved (`confirm-only` or `re-derive`); `Applied at` matches the
     CR's own `Applied at`. A CR that also mints or amends a `DR-*` additionally
     cites its ID in that record's `Related` field in `07_Decisions.md`. Do not
     record a CR as a `## Triage` row: Triage rows carry incoming REQ/NFR
     operations, and only this table is the CR reference. -->

- 0 approved Change Requests recorded. No approved Change Request ordered this
  run.

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                                                                                                                                                                                          | Subject                                                                                                  | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Depends-On |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| discussion-20260923063306456#REQ-0019, discussion-20260923063306456#REQ-0020, discussion-20260923063306456#NFR-0001, discussion-20260923063306456#NFR-0002, discussion-20260923063306456#NFR-0003, discussion-20260923063306456#NFR-0008, discussion-20260923063306456#NFR-0010 | `spec-0018`: `/qfai-migration-spec-to-story`, migration steps 1–2, 4–6 and 8–10, and the migration guide | -             | CREATE    | -      | yusuke_senaga | Slice A. `CAP-0018` (skill: migrate a project from spec packs to the story tree) is registered in `03_Capabilities.md` at position 18, so it maps to `spec-0018`. No active spec owns project migration: the slice policy puts one skill in one spec, spec-0003 is the `init` command and over both size thresholds, and a `qfai migrate` command is out of scope. The number CAP-0018 was used once before and merged away; reusing it follows the CAP-0017 precedent (DR-0275) | -          |
| discussion-20260923063306456#REQ-0019, discussion-20260923063306456#REQ-0023                                                                                                                                                                                                    | Migration step 3: move catalog and manifest content into the five merged files, stating each fact once   | spec-0018     | UPDATE    | APPEND | -             | Slice B                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | OQ-0177    |
| discussion-20260923063306456#REQ-0019                                                                                                                                                                                                                                           | Migration step 7: turn each EX's `BR-Ref` into BR-to-EX citations in the contract's form                 | spec-0018     | UPDATE    | APPEND | -             | Slice B                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | OQ-0176    |
| discussion-20260923063306456#REQ-0018, discussion-20260923063306456#REQ-0019                                                                                                                                                                                                    | Migration step 1 renames `skills.local` to `skill.local`                                                 | spec-0018     | UPDATE    | APPEND | -             | Slice A. Adopted (N11)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | -          |
