# 10 Plan

**How-only.** Approach, seams and order. Progress belongs in `tdd/test-list.md`,
history in `09_delta.md`, and release judgement nowhere in this pack.

## Implementation approach

The migration is package code. The skill ships ten thin scripts that load it
from the `qfai` package installed in the project, and no `qfai` subcommand is
added (`.qfai/contracts/cli/qfai-migration-spec-to-story.md#no-qfai-subcommand`).
Each step reads the tree, works out every operation it will perform, and only
then writes. A dry run prints that list, and a real run prints it and carries it
out.

### Files this spec owns

Every step module and the harness live under
`packages/qfai/src/migration/specToStory/`. The skill's shipped files live under
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-migration-spec-to-story/`
until P6 renames the assistant tree, and under `.../assistant/skill/...` after
it. The ledger's `Owning module` cells name the `skill/` path, where the rows
land.

| Path                                                                                              | What it holds                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/src/migration/specToStory/index.ts`                                                | `runMigrationStep(step, argv)`: checks both arguments, then runs the step through the harness with the process's working directory and standard streams. Re-exported from `packages/qfai/src/index.ts`                                                                                                        |
| `packages/qfai/src/migration/specToStory/harness.ts`                                              | `runStep(step, argv, io)`: argument parsing, the project-root check, the order guard, the operation journal, the write-set guard, removal of emptied directories, the report with its `none` sections, and exit codes 0, 2 and 3                                                                              |
| `packages/qfai/src/migration/specToStory/idMap.ts`                                                | Reading, writing and comparing `.qfai/evidence/migration-spec-to-story/id-map.json`                                                                                                                                                                                                                           |
| `packages/qfai/src/migration/specToStory/step01RenameDirectories.ts`                              | The rename map, which the harness's order guard also reads; the entry-by-entry move with the `legacy/` set-aside; the config-key rewrite from the raw YAML                                                                                                                                                    |
| `packages/qfai/src/migration/specToStory/step02MergeTables.ts`                                    | Record discovery, row writing and the status mapping. The mapping is a pure function, exported for its unit cases                                                                                                                                                                                             |
| `packages/qfai/src/migration/specToStory/step03MoveCatalog.ts`                                    | The source map, whole-section moves, the identical-paragraph check, the agent-setting overrides, overlay moves and the archive of the four abolished assistant directories                                                                                                                                    |
| `packages/qfai/src/migration/specToStory/step04RenumberIds.ts`                                    | The `plan.yaml` reader (step 7 imports it), the numbering as a pure function exported for its unit case, the test-case-to-example map, the story-tree files, the archive of `10_Plan.md`, `16_Traceability-ledger.md` and `tdd/`, and the re-key of the `.qfai/steering/*.md` work-log entries (BR-0018-0060) |
| `packages/qfai/src/migration/specToStory/step05CasesToExamples.ts`                                | Test-case-only rows turned into EX rows, and the `## Cases to examples` section                                                                                                                                                                                                                               |
| `packages/qfai/src/migration/specToStory/step06DeriveAcRefs.ts`                                   | `AC-Ref` derivation from the citing test-case rows                                                                                                                                                                                                                                                            |
| `packages/qfai/src/migration/specToStory/step07RulesToContracts.ts`                               | The rule-block writer for YAML or JSON, SQL and Markdown contracts, and the non-functional lists put to a person                                                                                                                                                                                              |
| `packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts`                             | The old annotation pattern, the rewrite to `QFAI:EX-` and `QFAI:BF-`, and the `## Annotations kept` section                                                                                                                                                                                                   |
| `packages/qfai/src/migration/specToStory/step09RepointLinks.ts`                                   | Preflight inspection of all six host integration paths, then init's `repairIntegrationWrappers` for managed paths; occupied user-owned paths are reported and kept                                                                                                                                            |
| `packages/qfai/src/migration/specToStory/step10UpdateGitignore.ts`                                | A call to init's `ensureRootGitignoreEntries`, and nothing else                                                                                                                                                                                                                                               |
| `.../qfai-migration-spec-to-story/SKILL.md`                                                       | The sequence in BR-0018-0055, and a list of the scripts that includes `_step.mjs`                                                                                                                                                                                                                             |
| `.../qfai-migration-spec-to-story/references/migration-guide.md`                                  | The guide in BR-0018-0058. It names `_step.mjs` as the loader the ten scripts share, so nobody deletes it as unused                                                                                                                                                                                           |
| `.../qfai-migration-spec-to-story/scripts/_step.mjs`                                              | The shared loader                                                                                                                                                                                                                                                                                             |
| `.../qfai-migration-spec-to-story/scripts/01-rename-directories.mjs` to `10-update-gitignore.mjs` | One entry point per step, named as the contract's Invocation table names them                                                                                                                                                                                                                                 |
| `packages/qfai/tests/fixtures/migration-spec-to-story/`                                           | The old-layout fixture tree ([Test approach](#test-approach))                                                                                                                                                                                                                                                 |
| `.qfai/contracts/cli/qfai-migration-spec-to-story.md`                                             | Gains its `SSOT modules:` entry naming `packages/qfai/src/migration/specToStory/` in the change that creates the module, as its header says                                                                                                                                                                   |

### Architectural elements

**1. The step runner: `runMigrationStep` and the harness.** Each step module
exports one declaration: its number, its write set, the report sections it
prints, and a function that reads the tree and returns the ordered operations
and the items for a person. A step also returns prewrite validation findings
for inputs it owns. The harness applies the refusal and formats the report;
the step functions do not choose an exit code or format a report.

Each step computes its operations from the tree as it finds it, so a migrated
tree yields none. That is how a second run changes nothing and an interrupted
run finishes. No progress file exists (DR-0018-0006). Where a step appends, it
first reads what is already there:

- Step 2 skips a record whose origin a row already names.
- Step 5 skips a case whose EX row exists.
- Step 7 skips a rule whose ID the contract already declares.

Usages, all consumed by the ten step modules:

1. Refusal before the first write (contract `#exit-codes`): an unknown argument
   (EX-0018-0001), no config in the working directory (EX-0018-0003), an
   unreadable or invalid input (EX-0018-0005). This includes parsing and
   validating the entire plan before step 4 or 7 writes.
2. The order guard (contract `#invocation`, "Order"): EX-0018-0007, EX-0018-0008,
   and its valid side EX-0018-0009.
3. The dry run printed from the same journal the real run carries out (contract
   `#--dry-run`): EX-0018-0010, EX-0018-0011.
4. Idempotency (contract `#idempotency`): EX-0018-0012, EX-0018-0013,
   EX-0018-0070.
5. The write set (contract `#write-set`): EX-0018-0014, EX-0018-0073.
6. The report and the exit code (contract `#report`): EX-0018-0016 to
   EX-0018-0018.
7. Removal of an emptied directory: EX-0018-0022.

The project-root check reads `qfai.config.yaml` in the working directory only.
It does not call `findConfigRoot`, which searches the parent directories
(BR-0018-0002).

The write-set guard compares every operation's target with the step's set
before the first write, so a step defect is refused rather than written outside
the set. Steps 9 and 10 delegate their writes to init's writers, which the
guard cannot see into. The per-step snapshot cases (EX-0018-0014,
EX-0018-0073) cover those two steps.
Step 9 inspects every host integration path before calling the writer. An
inspection failure refuses all writes; a user-owned occupied path is kept and
reported after the managed paths are repointed (EX-0018-0067).

**2. The ID map: `idMap.ts`.** Written once by step 4, and read by steps 5 to 8
and by the order guard. Usages:

1. Step 4 writes it and, on a later run, compares the plan with it: EX-0018-0044,
   EX-0018-0045, EX-0018-0079.
2. Step 5 takes each converted case's EX ID from it: EX-0018-0047.
3. Step 6 reads the case-to-example map: EX-0018-0052.
4. Step 7 takes each rule's new ID and its examples' new IDs: EX-0018-0058.
5. Step 8 maps each annotation: EX-0018-0063.
6. The order guard refuses steps 5 to 8 while it is absent (EX-0018-0008), and
   the harness refuses a file it cannot parse (EX-0018-0006).

**3. The thin entry points: `scripts/_step.mjs` and the ten scripts.** Each
script imports `_step.mjs` and calls it with its step number. `_step.mjs` loads
the package with a native `import("qfai")`:

- On `ERR_MODULE_NOT_FOUND` for `qfai`, it prints the install command to
  standard error and sets exit code 2.
- Otherwise it sets `process.exitCode` from
  `runMigrationStep(step, process.argv.slice(2))`.
- Any other failure propagates, and Node exits non-zero: the contract's "Other".

The import resolves from the script's own location. An installed skill sits
under the project root, and Node follows a host link to its real path, so the
lookup reaches `<project root>/node_modules/qfai`. A `qfai` reachable only
through `npx` is not on that path.

Usages:

1. The ten scripts of the contract's Invocation table.
2. The package-missing refusal: EX-0018-0004 (contract `#no-qfai-subcommand`).
3. The refusals reached through a real script rather than an in-process call:
   EX-0018-0001 to EX-0018-0003.

**4. The contract: `.qfai/contracts/cli/qfai-migration-spec-to-story.md`.**
It is the interface the ten scripts, the harness and the skill share. This
spec adds only its `SSOT modules:` entry. Usages:

1. `#no-qfai-subcommand`: the package-missing refusal, EX-0018-0004.
2. `#invocation` and `#exit-codes`: the refusals before the first write and
   the order guard, EX-0018-0001 to EX-0018-0003 and EX-0018-0007 to
   EX-0018-0009.
3. `#--dry-run`, `#idempotency`, `#write-set` and `#report`: EX-0018-0010 to
   EX-0018-0014, EX-0018-0016 to EX-0018-0018 and EX-0018-0073.
4. `#distributed-surface-obligations`: the sample-band IDs in the guide,
   EX-0018-0072.

### The package export

`runMigrationStep` is the one symbol this spec adds to the package's `"."`
entry. The existing tsup entry `index` carries it, so the build does not
change.

- **It is a trust boundary.** It is a published function. A `step` that is not
  an integer from 1 to 10 is rejected with an error before anything is read, and
  so is an `argv` that is not an array of strings. The contents of `argv` are
  the harness's: anything but `--dry-run` is exit 2 under the contract.
- **It carries init.ts into `dist/index`.** Steps 9 and 10 import init's
  writers, so the `index` bundle now holds `cli/commands/init.ts`.
  `getInitAssetsDir` already resolves from `dist/index.*`, so the asset lookups
  keep working from that bundle.
- **It is public API.** Removing or changing its signature later is a major
  version. The harness's `runStep`, which takes an explicit working directory
  and output streams, stays internal. The in-process tests import it directly,
  so the public signature does not grow a parameter only tests need.
- **Its doc comments name no internal ID.** tsup carries them into
  `dist/index.d.ts`, where the pre-build lint and the post-build guard read
  them.

### What each step reuses

The migration adds no parser or writer the repository already has.

| Need                                                | Reused from                                                                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID shapes, layout paths, the next free ID           | `packages/qfai/src/core/storyTree/ids.ts` and `packages/qfai/src/core/storyTree/layout.ts`, with `config.ts#resolvePath` for the configured paths                                 |
| Re-reading the tree a step wrote, for idempotency   | `packages/qfai/src/core/storyTree/tree.ts`, and `contractRules.ts` beside it for the rules a contract already declares (step 7)                                                   |
| `decisions.md` and `open-questions.md` rows         | `packages/qfai/src/core/storyTree/tables.ts` (step 2)                                                                                                                             |
| Whether a test file is under the E2E layer (step 8) | The kind-returning layer function exported from `packages/qfai/src/core/atddTraceability.ts`                                                                                      |
| Host links (step 9), the managed block (step 10)    | `repairIntegrationWrappers` and `ensureRootGitignoreEntries` from `packages/qfai/src/cli/commands/init.ts`, as `doctor.ts` already imports them. Neither is copied (BR-0003-0055) |
| Markdown tables and sections in the old packs       | `parseFirstMarkdownTable` and `parseAllMarkdownTables` in `core/specPackParsers.ts`, and `extractH2Sections` in `core/parse/markdown.ts`                                          |
| Work-log entries (step 4)                           | `collectWorklogEntries` in `packages/qfai/src/core/worklogEntries.ts` finds and parses them; the `yaml` document API below rewrites the four fields in place                      |
| `qfai.config.yaml`, `plan.yaml`, YAML contracts     | The `yaml` dependency's document API, which keeps comments and key order when a key is rewritten                                                                                  |
| The `qfai-sdd` templates step 4 writes from         | The installed package's init assets, found through `getInitAssetsDir`, the same lookup init uses                                                                                  |
| The built-in routing and review-profile defaults    | The package data under `packages/qfai/assets/defaults/`, found the same way (step 3)                                                                                              |

The steps read the old layout through these generic parsers and not through
the old-layout validators. P7 deletes those validators, and the migration keeps
reading old projects after they are gone. Where an old grammar exists only
inside a module P7 removes, the step that reads it holds that grammar itself:
step 8 declares the old `QFAI:SPEC-NNNN:TC-` and `QFAI:SPEC-NNNN:US-` patterns,
and step 2 reads the `#### Meta` block of a `### DL-NNNN` entry.

Three candidates stay inside their callers because each has fewer than three:

- The `plan.yaml` reader has two callers, steps 4 and 7, and stays in step 4.
  It accepts only the contract's `flows` and `rules` shape. The optional
  `from` selects a unique old H2 title, with the reserved document path for
  the unnamed initial flow. Omission uses the template and a person report;
  a bad selector, repeated assignment, invalid ID or unsafe contract path
  fails before writing. It restores old criteria source order after explicit
  ownership resolves an ambiguous AC-to-US reference.
- The rule-block writer has one caller and stays in step 7.
- The contract-rule reader has two callers, the story-tree reader and step 7.
  It stays with the story-tree reader, and step 7 reads existing rules through
  it.

### Order of work

1. **P5, the seams.** `index.ts`, `harness.ts`, `idMap.ts`, the re-export in
   `src/index.ts`, `_step.mjs` and the ten scripts. The fixture and its test
   helpers land with them.
2. **P5, steps 1, 2 and 4 to 8, in number order.** Step 4 needs step 1's
   layout. Steps 5 to 8 need step 4's ID map. Step 2 needs only step 1.
3. **P5, step 3's section moves** and its archive of the assistant
   directories. These need only the story-tree policy files from P2 and P3.
4. **P5, `SKILL.md` and `references/migration-guide.md`,** and the contract's
   `SSOT modules:` entry. `qfai init` ships and links the skill in the same
   phase under spec-0003. The guide states that 2.x does not read the
   spec-pack layout: a project that keeps it stays on a pinned 1.x release,
   and a project that upgrades runs the migration first (BR-0018-0058, user
   answer U2 in the batch record).
5. **After P6 lands, the rows that observe P6 output.** The code for these lands
   at P5 and does not change; what the cases observe arrives with P6:
   - Step 9 calls init's link writer, which targets `skill/` and `agent/` from
     P6: TDD-0067.
   - Step 10 calls init's managed-block writer, which negates
     `.qfai/evidence/decision/` from P6: TDD-0068.
   - Step 3's agent-setting overrides read the built-in defaults P6 places
     under `assets/defaults/`: TDD-0039.
   - Step 3's overlay move needs `rule/`, which P6 creates: TDD-0091 and
     TDD-0092.
6. **P7, the cutover.** The skill migrates this repository's own `.qfai/`
   (OQ-0170, outside this spec). Its step 4 re-keys this repository's
   `.qfai/steering/` entries in the migration commit, before the commit that
   changes the work-log readers (spec-0004 `10_Plan.md`, step 5). The
   migration suite runs again in the change that deletes the old validators.

### Alternatives rejected

| Alternative                                        | Why not                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `qfai migrate` subcommand                        | Out of scope in the discussion pack and rejected by N14                                                                                               |
| The step logic inside the shipped `.mjs` scripts   | The scripts could not import init's writers without copying them, which BR-0003-0055 rejects                                                          |
| `src/core/migration/`                              | Step 9 and step 10 import `cli/commands/init.ts`, and no `core` module imports `cli/`                                                                 |
| A `qfai/migration` subpath with its own tsup entry | A build change for one function. The `"."` entry already ships to every adopter                                                                       |
| Ten inline copies of the loader                    | Ten copies of one message and one exit path                                                                                                           |
| A progress file recording which steps ran          | A second run would have to update it, so idempotency would no longer hold by construction (DR-0018-0006)                                              |
| A final sweep step removing leftovers              | It would change the settled step list. Each step removes what it consumed (DR-0018-0003)                                                              |
| Every step as its own process in the tests         | Up to ten processes per case across 79 cases, each loading the full `index` bundle. The loader is covered by four cases that do spawn the real script |

## Test approach

### Layers

| Layer | Cases                                                                                | Where                                                                        | How                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| L1    | TC-0018-0030, TC-0018-0031, TC-0018-0041                                             | `packages/qfai/tests/unit/migration/specToStory/`                            | The status mapping of step 2 and the numbering of step 4, called directly. Each compares its whole result in one assertion         |
| L2    | None                                                                                 | -                                                                            | A step's behaviour is what it does to files. A fixture tree on disk is simpler than a fake file system and observes the real thing |
| L3    | The other 79 cases: 81 ledger rows, since TC-0018-0079 and TC-0018-0080 split in two | `packages/qfai/tests/integration/migrationSpecToStory/`, one file per module | See below                                                                                                                          |
| L4    | None                                                                                 | -                                                                            | The steps have no service boundary                                                                                                 |
| L5    | The ten E2E rows, TDD-0073 to TDD-0082                                               | `packages/qfai/tests/e2e/spec0018MigrationJourneyE2E.test.ts`                | One journey: the ten shipped scripts on one fixture copy, then `qfai validate`. Each story's test asserts on that one run          |

### How the L3 cases run

- **In process, through `runStep`.** Every case copies the fixture into a
  `mkdtemp` directory with the existing `tests/helpers/tempTree.ts`, applies the
  change its example names, and calls `runStep` with that directory and captured
  output streams. The call is the same one the script makes, so the oracle
  observes the same tree either way.
- **The four entry-point cases spawn the real script**, TC-0018-0001 to
  TC-0018-0004. The builder copies the skill into the fixture copy where the
  released `qfai init` installs it, `.qfai/assistant/skill/`, and links
  `node_modules/qfai` to `packages/qfai`. The script then loads `dist/`, which
  the integration leg builds before it runs. Spawning uses
  `tests/helpers/spawnCaptured.ts`.
- **The two asset cases read the shipped file**, TC-0018-0069 and TC-0018-0072,
  from the package's assets.
- **TC-0018-0071 runs `qfai validate`** through the built CLI on the migrated
  copy, after applying resolutions stored beside the fixture.
- **TC-0018-0015 refuses the network in the test process.** For the length of
  the case, `net.Socket.prototype.connect`, `dns.lookup` and `globalThis.fetch`
  are replaced with recorders that throw. The case fails on a non-empty record.
- **TC-0018-0067 records process creation** the same way, so it can show that
  no `qfai init` starts.

### The fixture

`packages/qfai/tests/fixtures/migration-spec-to-story/old-layout/` is one small
project on the spec-pack layout. It holds:

- `qfai.config.yaml` and `.qfai/specs/_policies/`
- two spec packs, one of them `superseded`
- API, database and Markdown contracts under `.qfai/contracts/`
- the four abolished assistant directories, `skills/`, `agents/`, `prompts/`
  and `skills.local/`
- a change request under `.qfai/decisions/`
- test files under `tests/integration/` and `tests/e2e/` carrying old
  annotations
- one `plan.yaml` per plan shape the examples name, including invalid schema,
  duplicate assignments, bad old-flow selectors and unsafe contract paths

A case adds or removes only what its example names
(`05_Examples.md#Conventions`).

Three kinds of file cannot be stored as themselves, because git would act on
them inside this repository: `.gitignore`, symbolic links and `node_modules/`.
The fixture stores the first under a neutral name. A builder in the test
directory renames it in the copy, creates the host links and links
`node_modules/qfai`.

The tree hash follows `05_Examples.md#Conventions`: path, mode and content of
every file, link targets included. One helper in the test directory computes it
and the changed-path set between two snapshots, and every L3 file uses that
helper.

### Boundaries with a case of their own

Each of these has its own ledger row, and none shares a case with its
neighbour:

- An argument list: `--dry-run` alone, and no argument (TC-0018-0002).
- A step run before its predecessor, and the valid side (TC-0018-0007 to
  TC-0018-0009).
- A half-migrated step 1 (TC-0018-0013). The fixture holds the state; no
  process is stopped.
- A config key holding the old default, holding another path, and absent
  (TC-0018-0024, TC-0018-0025).
- Configured `paths.specsDir` and `paths.contractsDir` outside `.qfai/`
  (TC-0018-0073).
- An entry whose destination exists (TC-0018-0026).
- A superseded record with no mappable successor (TC-0018-0074).
- A plan edited after step 4: a mapped item moved, and an unmapped item placed
  (TDD-0089 and TDD-0090).
- An overlay beside its rule, and one with no rule (TDD-0091 and TDD-0092).
- A work-log entry step 4 can re-key, one it cannot, and a second step 4 over
  re-keyed entries (TC-0018-0081, TC-0018-0082).
- An example with no single derived criterion: none, several, uncited
  (TC-0018-0053, TC-0018-0054, TC-0018-0075).
- A flow the plan gives no old flow (TC-0018-0077).
- A specified `from` H2 that is absent or repeated, an ambiguous criterion
  explicitly assigned in the plan, and a criterion list in reverse source
  order (TC-0018-0005, TC-0018-0040, TC-0018-0041).
- A user-owned host wrapper or obsolete roster, and a link inspection failure
  (TC-0018-0067).
- A project with nothing to migrate (TC-0018-0070).

## NFR approach

- **NFR-0001, idempotency.** Operations are computed from the tree as found,
  appends skip what is already written, and no progress file exists. Breach
  measure: the tree hash after a second pass differs from the first
  (TC-0018-0012); an interrupted run ends on a different hash from an
  uninterrupted one (TC-0018-0013); `id-map.json` changes by a byte on a
  second step 4 (TC-0018-0045); a `.qfai/steering/` entry changes on a second
  step 4 (TC-0018-0082).
- **NFR-0002, dry run.** The printed list and the applied list are one journal.
  Steps 9 and 10 print what init's writers report in their own dry-run mode.
  Breach measure: the tree hash changes across a dry run (TC-0018-0010), or a
  step's dry-run operations differ from its real-run operations or from the
  paths the real run changed (TC-0018-0011).
- **NFR-0003, no case lost.** Step 5 lists every test-case-only row, converted
  or not. Breach measure: the entries under `## Cases to examples` plus the
  test-case rows under `## For a person` differ from the input count
  (TC-0018-0051).
- **NFR-0008, write set and no network.** The harness refuses an operation
  outside the step's set before the first write. No module under
  `packages/qfai/src/migration/` imports a network API. Breach measure: a
  changed path outside the step's set in the per-step snapshots (TC-0018-0014,
  TC-0018-0073), or a non-empty connection record (TC-0018-0015).
- **NFR-0010, decision records tracked.** Step 10 writes the block init's
  writer produces. Breach measure: `git check-ignore` reports a path under
  `.qfai/evidence/decision/` (TC-0018-0068).
- **DTC-1, the distributed surface.** The skill, its scripts and its guide ship.
  The three guards scan them with the new ID shapes, and the doc comments under
  `src/migration/` reach `dist/index.d.ts`. Breach measure: a finding from
  `lint-shipping.ts`, `check-no-internal-version-leakage.sh` or
  `distributedSurfaceLeakage.test.ts` that names a file under the skill or
  `dist/index.*`, or TC-0018-0072 failing on the guide.
- **DTC-6, English output.** The report and every refusal message are English.
  Breach measure: `cliMessageLanguage.test.ts` failing on a string under
  `packages/qfai/src/migration/`.
- **OC-82, one release.** P5 lands in the same pull request as P2, P3, P6 and
  P7, so no release carries the skill without the story tree. Breach measure: a release
  tag that contains the commit adding the skill but not the cutover commit.

## Risk mitigation

| Risk                                                                                                                                | Likelihood / impact | Mitigation                                                                                                                                                                                   | Trigger to act                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A real project holds shapes the fixture lacks                                                                                       | medium / high       | This repository's own migration at P7 is the first real input. Each unfamiliar shape it meets becomes a fixture case before the cutover lands                                                | A step exits 3 on this repository with an item no fixture case produces, or exits with a code other than 0, 2 or 3 |
| P7 deletes an old-layout reader a step imports                                                                                      | medium / high       | Steps read the old layout only through generic parsers P7 keeps, and hold the old grammars that live nowhere else. The P7 deletion list is checked against the importers of `src/migration/` | A typecheck error or a failing migration case in the change that deletes the old validators                        |
| The cases for steps 3, 9 and 10 that observe P6 output fail between P5 and P6                                                       | high / low          | Those rows are taken to green after P6 in the work order. Their code only calls the writer or reads the package data, so it needs no rework                                                  | TDD-0039, TDD-0067, TDD-0068, TDD-0091 or TDD-0092 still failing once P6 has landed                                |
| The `Owning module` cells name the skill's `skill/` path, which exists only from P6                                                 | high / low          | No check reads the cell for existence, and P6's asset rename makes each path true. Between P5 and P6 the file is at the same path under `skills/`                                            | Someone looks up one of these cells before P6 lands and finds no file                                              |
| `dist/` is stale when the entry-point cases spawn the script                                                                        | medium / low        | The integration leg builds before it runs, and the cases assert that the loaded module exports `runMigrationStep`                                                                            | The entry-point cases pass locally and fail in CI, or the reverse                                                  |
| An init writer's dry-run report differs from its real run, or `ensureRootGitignoreEntries` keeps an old negation beside the new one | low / medium        | Fix the writer, which init and doctor share, never a copy in the migration (BR-0003-0055)                                                                                                    | TC-0018-0011 fails only for step 9 or 10, or TC-0018-0068 fails on block equality while `git check-ignore` passes  |
| A fixture file git acts on (`.gitignore`, a link, `node_modules/`) is ignored or lost in this repository                            | medium / medium     | Store those under neutral names and create them in the temporary copy                                                                                                                        | A fixture case passes locally and fails in a clean CI checkout                                                     |
| The export makes `dist/index` carry init.ts, and the export becomes a compatibility promise                                         | low / medium        | Export one function and validate its arguments. Keep `runStep` internal. The post-build guard reads the `.d.ts`                                                                              | A request to change the signature of `runMigrationStep`, or a guard finding in `dist/index.d.ts`                   |
| A shipped-file list or a cleanup treats `_step.mjs` as unused                                                                       | low / high          | `SKILL.md` and the guide both list it with the ten scripts                                                                                                                                   | An entry-point case fails with a module-not-found error for `_step.mjs`                                            |
