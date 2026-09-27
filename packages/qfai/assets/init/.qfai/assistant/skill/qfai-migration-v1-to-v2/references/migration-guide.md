# Move spec packs to the story tree

QFAI 2.0.0 introduces `.qfai/spec/` with policy, business-flow and contract layers.
QFAI 2.x does not read the old spec-pack layout. A project that keeps spec packs
must stay on a pinned 1.x release. To upgrade, migrate the project before using
the 2.x validation and authoring workflow.

## Prepare

1. Save the current project state in version control. Inspect custom
   `paths.specsDir` and `paths.contractsDir` in `qfai.config.yaml`; the scripts
   honor configured paths and may write there even when outside `.qfai/`.
2. Install a QFAI 2.x release as a local project dependency with the project's
   package manager. A copy available only through `npx` is insufficient.
   Complete the launcher preflight in `.qfai/assistant/rule/shared-skill-operating-baseline.md`:
   confirm the local binary or the Plug'n'Play package and loader before invoking the CLI.
3. Run `npx qfai init` from the local dependency (or `yarn exec qfai init` for Plug'n'Play), without `--force`. On an old-layout
   project it installs and links the migration skill without seeding a second
   spec tree.
4. Open `/qfai-migration-v1-to-v2`. Work from the project root. The
   installed skill is under
   `.qfai/assistant/skill/qfai-migration-v1-to-v2/`.

Do not run `npx qfai init --force` to migrate. It can write beyond the migration
scripts' allowed paths and replace local edits.

## Place stories and rules

The AI writes `.qfai/evidence/migration-spec-to-story/plan.yaml` before running
the steps. Its two lists state the decisions the scripts cannot make: which
business flow holds each old story, and which existing contract enforces each
old business rule. Flow order and story order determine the new IDs. A `from`
value identifies an old flow to continue; omit it for a new flow. Add
`criteria` when a criterion's parent story cannot be derived from the old
records. A `from` value is an exact H2 heading in the old
`_policies/04_Business-Flow.md`. For its unnamed opening flow, use the reserved
value `_policies/04_Business-Flow.md`. If `from` is omitted, the script writes a
template flow and reports that its diagram needs a person. A contract path is
relative to the configured contracts directory, lies under `cli/`, `api/`,
`db/`, `ui/` or `design/`, and names the contract file as it is before step 3
renames it.

```yaml
flows:
  - title: Place an order
    stories:
      - id: US-0001-0001
        criteria: [AC-0001-0001]
rules:
  - id: BR-0001-0001
    contract: api/orders.yaml
```

Use IDs from the old files in this plan. Assign each old story and rule at most
once. A `from` value that matches no old flow or matches several, an invalid
plan, a duplicate assignment, or a contract path that is outside the five
contract directories or names no contract stops step 4 before writing. Check
the step-4 dry run before accepting its numbering. Step 4 writes
`.qfai/evidence/migration-spec-to-story/id-map.json` once. Later steps use that
map. Once it exists, changing the plan to move or newly place a mapped item is
refused; resolve unplaced content in the new tree through `/qfai-sdd`.

## Contract IDs

Step 3 gives every contract file that has no 2.x contract ID one, and renames
the file to match:

| Old contract               | Declares       | New ID   | New file                   |
| -------------------------- | -------------- | -------- | -------------------------- |
| `cli/orders.md`            | nothing        | CLI-0001 | `cli/cli-0001-orders.md`   |
| `api/api-0001-orders.yaml` | `CON-API-0001` | API-0002 | `api/api-0002-orders.yaml` |
| `db/db-0001-orders.sql`    | `CON-DB-0001`  | DB-0003  | `db/db-0003-orders.sql`    |

- Numbers run across all contracts, in the order CLI, API, DB, UI, design,
  then by the old number, then by path. No two contracts share a number.
- The new ID replaces the old one in the file's declaration: the H1 of a
  Markdown contract, as `# CLI-0001: <title>`, and the `QFAI-CONTRACT-ID` line
  of any other. The old IDs in `-- Depends on:` and `x-qfai-depends-on` become
  the new ones.
- `contracts.md` becomes one index table listing every contract. The old
  index's other sections are reported for a person.
- `.qfai/evidence/migration-spec-to-story/contract-map.json` records each old
  path and old ID with the new ones, and step 4 copies it into the ID map.
- Step 7 writes the new IDs into rule statements, and step 8 changes a
  `QFAI:CON-API-0001` test annotation to `QFAI:API-0002`.

`design/DESIGN.md.lock.yaml`, `design/design-system.yaml` and
`design/prototype-handoff.yaml` are not contracts. Step 3 gives them no ID, and
QFAI 2.x reads none of them. The handoff is now the `handoff` object of
`.qfai/evidence/prototyping/prototyping.json`, which `/qfai-prototyping` writes
when a loop ends with the prototype accepted. The migration does not convert
the old file into it.

An old ID the map cannot translate, such as a UI marker in application code or
an ID no contract declared, is reported for a person with its file and line.

## Business rules

Rules are numbered per contract, `BR-<contract number>-NNNN` from `0001` in plan
order: the first rule step 4 places in API-0002 is BR-0002-0001. Step 7 writes
each rule into its contract in the form the contract's format takes:

| Contract format | Where the rule goes                                                     |
| --------------- | ----------------------------------------------------------------------- |
| Markdown        | A row of the `## Business rules` table: BR-ID, Statement and Examples   |
| YAML or JSON    | An entry `{ id, statement, examples }` of the top-level `x-qfai-rules:` |
| SQL             | A `-- Rule BR-0002-0001: <statement>` line, then an `-- Examples:` line |

A Markdown contract without a `## Business rules` section gets one as its last
section. A rule's examples are the new IDs of the examples that cited it.

## Documents in their template's shape

Each story-tree document the steps write takes the shape of its `qfai-sdd`
template, which is the shape the document schema checks:

| Documents                                                                               | Step |
| --------------------------------------------------------------------------------------- | ---- |
| `decisions.md` and `open-questions.md` rows                                             | 2    |
| `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`      | 3    |
| `contracts.md` and `tech.md`                                                            | 3    |
| `business-flows.md`, `business-flow.md`, `user-stories.md` and each story's three files | 4    |
| Examples turned from test cases                                                         | 5    |

Content that does not fit that shape is listed under `## For a person`, and the
step exits 3:

- Step 3 leaves it out of the policy file or `tech.md`, and names the source
  file, its archived copy and, where one fits, the template section that takes
  the content once a person rewrites it.
- Step 3 also leaves as it is a policy file or `tech.md` that already exists
  and differs from what it would write.
- Steps 4 and 5 write a story sentence or an example cell of another form as it
  stands, for a person to rewrite.
- Step 4 lists every business flow, so that a person writes its alternate and
  exception paths.

The steps do not write these into the new tree. Each stays in its old spec-pack
file, which stays in the pack while any of its content is unplaced and then
moves to `.qfai/evidence/migration-spec-to-story/retired/<spec-id>/`:

- a spec pack's scope and source provenance;
- a story block's `Parent`, `Source` and `Flow` fields;
- a criterion's `# Parent:` line, since its directory names the story;
- a `Background:`, any scenario after a criterion's first named one, and a
  `Scenario Outline:`, each listed for a person.

Step 3 writes no structure document. It routes the old `catalog/structure.md`
section by section:

| Old content                                          | New home                                              |
| ---------------------------------------------------- | ----------------------------------------------------- |
| An entrypoint with a smoke or skeleton command       | A `- Skeleton:` line in `tech.md`'s Standard commands |
| An `## Architecture constraints` row with a `TC-` ID | The Technical Constraints section of `constraint.md`  |
| The `ui_paths:` globs of `## UI surface paths`       | `uiux.surfacePaths` in `qfai.config.yaml`, if unset   |
| Anything else                                        | `## For a person`, with the archived copy             |

A Markdown contract keeps its own body: step 3 changes only its H1, and step 7
adds the `## Business rules` table. The CLI contract schema requires
`## Ownership boundary` and that table, and admits nothing else. Rewrite any
other section of a migrated CLI contract into those two by hand.

## Run the bundled steps

For each row, run the script with `--dry-run`, read its operations, and then run
it without the flag. Save both complete reports and both exit codes as migration
evidence. The scripts write no report file themselves.

| Step | Script                       | Purpose                                                                                                 |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | `01-rename-directories.mjs`  | Move old owned directories entry by entry; move a colliding entry into the migration `legacy/` archive. |
| 2    | `02-merge-tables.mjs`        | Merge decisions, questions, triage and change records.                                                  |
| 3    | `03-move-catalog.mjs`        | Move policy and assistant content, number and rename the contracts, and keep project overrides.         |
| 4    | `04-renumber-ids.mjs`        | Write the flow and story tree, archive old plans and test lists, and write the ID map.                  |
| 5    | `05-cases-to-examples.mjs`   | Turn old cases with no example into examples.                                                           |
| 6    | `06-derive-ac-refs.mjs`      | Give each example one criterion reference where the cases establish it.                                 |
| 7    | `07-rules-to-contracts.mjs`  | Put rules into the contracts named by the plan.                                                         |
| 8    | `08-rewrite-annotations.mjs` | Update resolvable test annotations; keep and report the rest.                                           |
| 9    | `09-repoint-links.mjs`       | Repoint host skill and agent links.                                                                     |
| 10   | `10-update-gitignore.mjs`    | Keep `.qfai/evidence/` out of git: the managed block, its re-include lines and the git index.           |
| 11   | `11-install-entry.mjs`       | Install the free-text entry: shipped skills, host skill links, entry directive and `.gitignore` lines.  |
| 12   | `12-check-entry.mjs`         | Check, without writing, that `npx qfai workflow start` would accept the project.                        |

Run a row from the project root in this form:

```text
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

The shared `scripts/_step.mjs` loads the locally installed package for each
script. Keep it with the twelve numbered scripts.

## Write boundary

The dry run lists the operations the real run would perform. No step makes a
network call. The scripts write only these targets:

| Target                                                                                                                                                      | Steps                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `.qfai/` and configured spec and contract paths outside it                                                                                                  | 1–7                                  |
| `qfai.config.yaml`                                                                                                                                          | 1, 3                                 |
| `QFAI:` annotation lines in test files                                                                                                                      | 8                                    |
| `.claude/skills`, `.agents/skills`, `.codex/skills`, `.github/skills`, `.claude/agents`, `.github/agents`                                                   | 9; 11 for the four skill directories |
| Managed block of `.gitignore`                                                                                                                               | 10, 11                               |
| A `.gitignore` line outside the managed block that re-includes `.qfai/evidence/`, removed                                                                   | 10                                   |
| `.qfai/evidence/.gitignore`, deleted                                                                                                                        | 10                                   |
| Git index entries under `.qfai/evidence/`, removed; the files stay on disk                                                                                  | 10                                   |
| Shipped skill directories under `.qfai/assistant/skill/`, and `.qfai/evidence/migration-spec-to-story/legacy/skill/`                                        | 11                                   |
| `AGENTS.md` and `CLAUDE.md`, only to add the entry directive, with a staging file beside each                                                               | 11                                   |
| Temporary staging inside `.qfai/evidence/migration-spec-to-story/`, configured spec, contract or test directories, or `.qfai/report/` for the managed block | 1–8, 10, 11                          |

The scripts verify ownership before clearing staging left by an interrupted
run. If a marker is incomplete or the staged bytes changed, they preserve it
for a person to inspect.

Step 12 writes nothing.

Every report contains `## Operations`. Steps 2 through 12 also contain
`## For a person`; step 5 contains `## Cases to examples`; step 8 contains
`## Annotations kept`; step 10 contains `## Git index`. Empty sections say
`none`. Exit 0 means the step is
complete. Exit 2 means it refused before writing; read the message and fix the
input or order. Exit 3 means the step completed but reports content that needs a
person. An unexpected failure can be retried after the cause is fixed. A
completed step is safe to run again and changes no file. If steps 1 to 9 all
report `none` on a project already using the story tree, there is nothing to
migrate; run steps 10 to 12 all the same.

Immediately after step 3, confirm the complete old `_policies/11_Slice-Policy.md`
is archived under `retired/_policies/` and none of its sections was copied to
`principle.md`. Current triage operations and ID allocation are in the shipped
`qfai-sdd/references/sdd-triage.md`. Read `objective.md`, `initiative.md`, `principle.md`
and `tech.md`. Remove facts repeated in different words. The
scripts remove byte-identical repeats; a person must judge paraphrases. Quality
gate commands have one home: the Standard commands section of `tech.md`, which
step 3 writes in its template's shape. Replace each `<...>` placeholder the old
`catalog/tech.md` did not supply.

## Resolve the reports

Keep all files moved to `.qfai/evidence/migration-spec-to-story/legacy/` or
`retired/` until their content is accounted for. Nothing is silently discarded.
Resolve each `## For a person` row using its file path and reason. Common cases
include a story without a flow, a rule without an enforcing contract, an example
without exactly one criterion, an unresolved annotation, an applicable
non-functional requirement, a catalog overlay without a matching rule, and
content that does not fit its template's shape. A
migrated test case with no previous example appears
under `## Cases to examples` or `## For a person`; check that none is missing.

Step 8 changes test-case annotations to example annotations where the ID map
resolves them, and contract annotations to the new contract IDs. It changes an
old user-story annotation to a business-flow annotation only in an E2E test.
Unresolved annotations and old deferral markers stay in place and are
reported. Step 9 changes only the host integration links.

Step 10 keeps `.qfai/evidence/` out of git:

- it makes the managed `.gitignore` block equal the installed package's block;
- it removes every `.gitignore` line that re-includes `.qfai/evidence` or a
  path under it, and lists each one under `## Operations`. `!.qfai/`,
  `!.qfai/install-provenance.json` and the `!.qfai/assistant` lines stay;
- it deletes `.qfai/evidence/.gitignore`, and reports that path for a person
  when it is not a regular file;
- it removes every git index entry under `.qfai/evidence/`, as
  `git rm -r --cached .qfai/evidence` would. The files stay on disk and nothing
  is committed: commit the staged removals with the rest of the migration.

`## Git index` says how many paths left the index, or why none did: the
project is not a git repository, or its index tracks nothing there.

## Install and check the free-text entry

Step 11 makes each skill directory the package ships equal to the installed
package's copy. A copy the project changed is first moved whole to
`.qfai/evidence/migration-spec-to-story/legacy/skill/<id>/`; nothing is
deleted. Where that archive already holds a different copy, both stay as they
are and the pair is reported for a person: keep the copy you need, delete the
other, and run step 11 again. A skill the package does not ship and
`.qfai/assistant/skill.local/` are left alone. Step 11 also adds each missing
host skill link, the entry directive at the top of `AGENTS.md` and `CLAUDE.md`,
and the `.qfai/run/` line of the managed `.gitignore` block. A path it cannot
write is reported with the reason.

Step 12 makes the checks `npx qfai workflow start` makes on the project,
without starting a run, and checks what step 11 installs. Each failed check is
reported by name:

| Check                 | Fails when                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `contract-undeclared` | A step a built-in plan runs is not installed under `.qfai/assistant/step/`                       |
| `reviewer-missing`    | A `routing:` override in `qfai.config.yaml` drops a reviewer the package's default routing needs |
| `invalid-mode`        | `workflow.mode` is set to anything other than `active`, `shadow` or `off`                        |
| `entry-directive`     | `AGENTS.md` or `CLAUDE.md` lacks the entry directive                                             |
| `gitignore`           | The managed `.gitignore` block lacks `.qfai/run/`, or a line re-includes `.qfai/evidence/`       |
| `qfai-run-link`       | A host skill directory has no link to `.qfai/assistant/skill/qfai-run/`                          |
| `evidence-tracked`    | Git tracks a path under `.qfai/evidence/`                                                        |

Run step 11 again for what it installs, and step 10 again for an evidence
re-include line or a tracked evidence path. A routing override belongs to the
project, so its owner decides whether to restore the reviewer. Rerun step 12
until it exits 0.

After step 12, run `npx qfai validate` from the local dependency (or `yarn exec qfai validate` for Plug'n'Play). Resolve every
layout and chain error. Its test-obligation findings identify any business
flow, acceptance criterion or example still missing a test in its layer. E2E
tests cover flows, integration and API tests cover criteria, and other tests
cover examples. Record a permitted exception in `decisions.md` when a test is
intentionally absent.

Then send the project's first free-text change request to the `qfai-run`
skill. The entry directive step 11 added points agents there.

The plan, the ID map and the `legacy/` and `retired/` archives under
`.qfai/evidence/migration-spec-to-story/` exist only in this working copy,
like everything else under `.qfai/evidence/`. Keep a copy elsewhere if anyone
needs them beyond it.

## Former migration memos

QFAI 2.0.0 has no `.qfai/assistant/process/` directory, and `npx qfai init` writes
no migration memo. Step 3 moves the memos a 1.x release wrote to
`.qfai/assistant/process/migrations/` into
`.qfai/evidence/migration-spec-to-story/retired/assistant/process/migrations/`.
Nothing reads them after that. Keep them as a record, or delete them once the
migration is committed.

The upgrade notes for each release are in the QFAI changelog, under that
release's heading. The memos announced deprecation windows, and every one of
them closed at 1.10.0. A project upgrading from an earlier release meets these
forms as errors for the first time:

| Old form                                                             | Current form                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `playwright-cli` as the browser wrapper or `prototyping.browserTool` | `playwright`                                                                               |
| A reader of `.qfai/output/validate.json`                             | `.qfai/report/validate-<profile>.json`, or `.qfai/report/validate.json` for the latest run |
| A hand-written, per-skill handoff file                               | The canonical `handoff.yaml`. `npx qfai handoff upgrade <legacy-file>` converts one        |
