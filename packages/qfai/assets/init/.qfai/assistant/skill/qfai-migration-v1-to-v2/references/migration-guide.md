# Move spec packs to the story tree

QFAI 2.0.0 introduces `.qfai/spec/` with policy, business-flow and contract layers.
QFAI 2.x does not read the old spec-pack layout. A project that keeps spec packs
must stay on a pinned 1.x release. To upgrade, migrate the project before using
the 2.x validation and authoring workflow.

## Prepare

1. Save the current project state in version control. Inspect custom
   `paths.specsDir` and `paths.contractsDir` in `qfai.config.yaml`; the scripts
   honor configured paths and may write there even when outside `.qfai/`.
   Copy `.qfai/` with its git-ignored files (discussion packs, reports, review
   packs and evidence) to a place outside the repository before step 1, because
   version control does not hold them.
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

The first `npx qfai init` records the workflows it installs in
`.qfai/install-provenance.json`, so delete a shipped workflow the project does
not want after that run and commit the record, and later `npx qfai init` runs
leave it deleted.

## Place stories and rules

The AI writes `.qfai/evidence/migration-spec-to-story/plan.yaml` before running
step 4. `plan.yaml` may be written before step 1, because only steps 4 and 7
read it and a contract is named by the path it has in the contracts directory
before step 3, which is also a key of `contract-map.json` once step 3 has run.

The plan states the decisions the scripts cannot make. `flows` says which
business flow holds each old story. `rules` says which existing contract
enforces each old business rule, or that it enforces none. The optional
`examples` list places an example whose criterion the test cases leave open.
Flow order and story order determine the new IDs.

- **`from`.** A `from` value identifies an old flow to continue; omit it for a
  new flow. It is the exact title of any H2 section of the old
  `_policies/04_Business-Flow.md`, and no other H2 of that file has the same
  title. For the unnamed opening flow, which is the text before the first
  `CHG-` heading or the whole file where it has none, use the reserved value
  `_policies/04_Business-Flow.md`. Several flows may continue the same section,
  and each takes that section's prose and diagram. If `from` is omitted, the
  script writes a template flow and reports that its diagram needs a person.
- **`criteria`.** An old criterion belongs to the story its `Parent:` line
  names or, where it has none, to the story its row of the criteria catalog
  table names in the `US Ref`, `US-Refs` or `Maps To` column. Add `criteria`
  to a story only when the criterion has no such reference, the reference
  names several stories, or the two disagree.
- **`contract`.** A contract path is relative to the configured contracts
  directory, lies under `cli/`, `api/`, `db/` or `ui/`, and names the contract
  file as it is before step 3 renames it. A Markdown file under `api/`, `db/`
  or `ui/` and a file under `design/` hold no contract, so a rule cannot be
  placed in one.
- **`binds: none` and `retire`.** A rule with no contract takes one of these
  instead of `contract`. `binds: none` is allowed only where the rule's
  `Contract-Refs` cell is `-`. `retire` takes a reason. Step 7 removes such a
  rule from its `04_Business-Rules.md`, lists it under `## Operations` with
  its old ID and, for `retire`, the reason, and gives it no new ID.
- **`examples`.** An entry names an old example ID and a `criterion`, one of
  the old criterion IDs that the `AC-Refs` of the test cases citing the example
  name. Step 4 places the example under that criterion's story, and its test
  cases enter the ID map, so that step 8 rewrites their annotations.

```yaml
flows:
  - title: Place an order
    stories:
      - id: US-0001-0001
        criteria: [AC-0001-0001]
examples:
  - id: EX-0001-0002
    criterion: AC-0001-0001
rules:
  - id: BR-0001-0001
    contract: api/orders.yaml
  - id: BR-0001-0002
    binds: none
  - id: BR-0001-0003
    retire: The payment provider enforces this limit.
```

Use IDs from the old files in this plan. Assign each old story, rule, example
and criterion at most once. A `from` value that matches no old flow or matches
several, an invalid plan, a duplicate assignment, an `examples` criterion that
none of the citing test cases names, a rule with none or more than one of
`contract`, `binds` and `retire`, or a contract path that is outside the four
contract directories or names no contract stops step 4 before writing. Check
the step-4 dry run before accepting its numbering. Step 4 writes
`.qfai/evidence/migration-spec-to-story/id-map.json` once, and later steps use
that map. Write the `examples` entries and the rule marks before step 4: once
the map exists, an `examples` entry and a mark on a rule the map holds are
refused. A mark on a rule step 4 left unplaced is still accepted while a spec
pack is left. Place any other unplaced content in the new tree through `/qfai-sdd`. While the
map exists and no spec pack is left, steps 4 and 7 read no plan, so a missing or
rewritten `plan.yaml` stops nothing.

## Retired configuration keys

Three keys of `qfai.config.yaml` no longer exist in 2.x. Each is handled by the
step named here:

| Key                                                 | What the migration does                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `validation.traceability.scMustHaveTest`            | Step 1 removes it and lists it under `## Operations`                                                       |
| `validation.traceability.unknownContractIdSeverity` | Step 1 removes it and lists it under `## Operations`                                                       |
| `prototyping.primarySpecId`                         | Step 3 replaces it with `prototyping.primaryUiContract` where exactly one UI contract is tied to that spec |

Step 1 also removes a `validation.traceability` or `validation` mapping that
the removal leaves empty. Steps 1 to 3 run although the configuration loader
reports these keys. Steps 4 to 12 refuse with exit 2 before writing, naming the
key, while `qfai.config.yaml` still holds one of the three. That refusal does
not mean an earlier step has not run.

A UI contract is tied to a spec when the contract IDs named by the
`Contract-Refs` of that spec's business rules translate, through the contract
map, to one UI contract. Step 3 lists the replacement under `## Operations`.
Where `prototyping.primaryUiContract` is already set, step 3 removes the old key
instead. Where no UI contract is tied, more than one is, or the spec pack is
gone, step 3 leaves `prototyping.primarySpecId` and lists it under
`## For a person` with its old value, and exits 3. Replace it by hand with
`prototyping.primaryUiContract: UI-NNNN` naming the contract. Steps 4 to 12 then
run.

When a step cannot load `qfai.config.yaml` for any other reason, it exits 2
before writing and prints on standard error the message of each configuration
issue, one per line.

## Contract IDs

Step 3 gives every contract file that has no 2.x contract ID one, and renames
the file to match:

| Old contract               | Declares       | New ID   | New file                   |
| -------------------------- | -------------- | -------- | -------------------------- |
| `cli/orders.md`            | nothing        | CLI-0001 | `cli/cli-0001-orders.md`   |
| `api/api-0001-orders.yaml` | `CON-API-0001` | API-0002 | `api/api-0002-orders.yaml` |
| `db/db-0001-orders.sql`    | `CON-DB-0001`  | DB-0003  | `db/db-0003-orders.sql`    |

- Numbers run across all contracts, in the order CLI, API, DB, UI, then by
  the old number, then by path. No two contracts share a number.
- The new ID replaces the old one in the file's declaration: the H1 of a
  Markdown contract, as `# CLI-0001: <title>`, and the `QFAI-CONTRACT-ID` line
  of any other. The old IDs in `-- Depends on:` and `x-qfai-depends-on` become
  the new ones, and a YAML contract keeps its `x-qfai-depends-on` list on one
  line.
- `contracts.md` becomes one index table listing every contract. The old
  index's other sections are reported for a person.
- `.qfai/evidence/migration-spec-to-story/contract-map.json` records each old
  path and old ID with the new ones, and step 4 copies it into the ID map.
- Step 7 writes the new IDs into rule statements, and step 8 changes a
  `QFAI:CON-API-0001` test annotation to `QFAI:API-0002`.

Step 3 gives no ID to a file that is not a 2.x contract, and does not write it
into the new tree:

| Old file                                     | Why it is not a contract                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A Markdown file under `api/`, `db/` or `ui/` | Those directories hold OpenAPI YAML or JSON, SQL and UI YAML contracts                                  |
| Any file under `design/`                     | The directory no longer exists: the brand belongs in the root `DESIGN.md`, a screen in a `ui/` contract |

Step 3 moves each one to
`.qfai/evidence/migration-spec-to-story/retired/contract/` under its old path,
`design/` as one directory, and lists each file under `## For a person` with
its archived copy. Rewrite what the file states in the form its row names.

The old `design/prototype-handoff.yaml` is now the `handoff` object of
`.qfai/evidence/prototyping/prototyping.json`, which `/qfai-prototyping` writes
when a loop ends with the prototype accepted. The migration does not convert
the old file into it.

Step 3 also replaces every old `CON-*` ID that the contract map translates inside
the contract files it writes, wherever it stands in the file, and lists none of
them. It writes nothing outside those files. An old ID the map cannot translate,
such as an ID no contract declared or that several declared, stays as written
and is reported for a person with its file and line, as is a UI marker in
application code.

Step 3 groups its `## For a person` items under `### Content` and
`### Identifiers`. `### Content` comes first and holds what a person rewrites
or decides. `### Identifiers` holds an item that only pairs an old ID with its
new one, such as a changed constraint ID. A group with no item is not printed.

Step 3 writes a `routing:` override into `qfai.config.yaml` only for an entry
of `agent-routing.yml` that differs from the installed default. It writes none
for an entry equal to a default or to an entry a 1.x release shipped. Step 3
lists each routing entry it does write under `## For a person`, with its name
and a warning that a routing entry copied from a 1.x manifest hides the roles
the 2.x skills declare.

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
section. A rule's examples are the new IDs of the examples that cited it. A
rule written as a heading section takes the value of its `Rule` field as its
statement, and a SQL contract holds that statement on one line.

## Documents in their template's shape

Each story-tree document the steps write takes the shape of its `qfai-sdd`
template, which is the shape the document schema checks:

| Documents                                                                               | Step |
| --------------------------------------------------------------------------------------- | ---- |
| `decisions.md` and `open-questions.md` rows                                             | 2    |
| `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`      | 3    |
| `contracts.md` and `tech.md`                                                            | 3    |
| Markdown contracts under `cli/`                                                         | 3    |
| `business-flows.md`, `business-flow.md`, `user-stories.md` and each story's three files | 4    |
| Examples turned from test cases                                                         | 5    |

Content that does not fit that shape is listed under `## For a person`, and the
step exits 3:

- Step 3 leaves it out of the policy file, `tech.md` or CLI contract, and names the source
  file, its archived copy and, where one fits, the template section that takes
  the content once a person rewrites it.
- Step 3 also leaves as it is a policy file or `tech.md` that already exists
  and differs from what it would write.
- A constraint row keeps only its ID, Constraint and Rationale. Step 3 lists
  an Impact column, whose content belongs to the contract or `tech.md` that
  owns it, and a row that names a file, a command or a rule ID, to be rewritten
  in plain words.
- Step 3 numbers each constraint section from 01 in table order, and lists
  every ID that changed with the ID that replaces it.
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

| Old content                                                                                                                                | New home                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| An entrypoint with a smoke or skeleton command                                                                                             | A `- Skeleton:` line in `tech.md`'s Standard commands |
| A layer row of an `## Architecture` or `## Architecture constraints` table of Layer, Responsibility and Depends on columns, naming no path | The `## Architecture` table of `tech.md`              |
| The `ui_paths:` globs of `## UI surface paths`                                                                                             | `uiux.surfacePaths` in `qfai.config.yaml`, if unset   |
| Anything else                                                                                                                              | `## For a person`, with the archived copy             |

Step 3 writes the moved layers in the shape of the Architecture section: a
`flowchart TD` with a node per layer and an edge per dependency, then the table
with the rows ordered from the uppermost layer down. Where the rows cannot be
ordered, because a layer depends on one that has no row or layers depend on each
other, none of them moves: the section is listed under `## For a person` with
the reason, and `tech.md` keeps the template's Architecture section.

Step 3 writes each Markdown contract under `cli/` in the shape of the CLI
contract template: its `# CLI-0001: <title>` heading, `## Ownership boundary`
and a `## Business rules` table, and nothing else.

- An old `## Ownership boundary` of one to three paragraphs that name no rule is
  kept as it stands.
- Where the old contract has none, the section holds the template's placeholder,
  and the contract is listed for a person to write it.
- The text before the first section, lines such as `Status:` or `Rule refs:`,
  and every other section are left out. Each is listed with the old file and
  its copy under `.qfai/evidence/migration-spec-to-story/retired/contract/`.

Step 7 then writes the contract's rules into that table. A rule whose statement
names another rule is written and listed for a person, because a CLI contract's
rule cites only examples.

## Run the bundled steps

For each row, run the script with `--dry-run`, read its operations, and then run
it without the flag. Dry runs are sequential: the dry run of a step refuses until
the earlier steps ran, so run the steps one after another, each dry run before
its real run. Step 1 is the first write and the point of no return for the
layout. Step 3 is the point of no return for the contract names.

Every run keeps its report in a file under
`.qfai/evidence/migration-spec-to-story/report/`: `dry-run/step-NN-NNN.md` for a
dry run and `run/step-NN-NNN.md` for a real run. `NN` is the step number and
`NNN` counts the step's files in that directory from `001`. The file holds what
the run printed on standard output, then on standard error, and ends with the
line `Exit code: N`. Read every report from that directory. No step reads them.

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
| 11   | `11-install-entry.mjs`       | Install the free-text entry: skills, host skill links, entry directive, `.gitignore` lines and hooks.   |
| 12   | `12-check-entry.mjs`         | Check, without writing, that `npx qfai workflow start` would accept the project.                        |

Run a row from the project root in this form:

```text
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

The shared `scripts/_step.mjs` loads the locally installed package for each
script. Keep it with the twelve numbered scripts.

The same steps serve two runs:

| Project                                    | What the steps do                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| On the 1.x spec-pack layout                | Every step runs: steps 1 to 10 migrate the spec packs, and step 11 installs the free-text entry and the reminder hooks                                |
| Migrated already by an earlier 2.x release | Steps 1 to 10 each change nothing and add a line saying the migration is already done; step 11 adds only what that release lacked, the hooks among it |

After upgrading a project the second row describes:

1. Run `npx qfai init` without `--force`. It installs the reminder hooks and
   `.agents/rules/reminders.json`. It leaves the skill copies the earlier
   release installed as they are, and names them as differing.
2. Run step 11 of the installed skill, `--dry-run` first:
   `node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/11-install-entry.mjs`.
   The script runs the upgraded package, so it brings every shipped skill,
   this one included, to this release and archives a copy the project edited.
3. Run the skill again from the start. Report that only the files step 11
   listed changed.

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
| `.claude/settings.json` and `.codex/hooks.json`, only to add the reminder hooks                                                                             | 11                                   |
| `.agents/rules/reminders.json` and its entry in `.agents/rules/.qfai-rules.lock.json`, with a staging file beside it                                        | 11                                   |
| A report file of each run, under `.qfai/evidence/migration-spec-to-story/report/`                                                                           | 1–12                                 |
| Temporary staging inside `.qfai/evidence/migration-spec-to-story/`, configured spec, contract or test directories, or `.qfai/report/` for the managed block | 1–8, 10, 11                          |

The scripts verify ownership before clearing staging left by an interrupted
run. If a marker is incomplete or the staged bytes changed, they preserve it
for a person to inspect.

Step 12 writes only its report file.

Every report contains `## Operations`. Steps 2 through 12 also contain
`## For a person`; step 5 contains `## Cases to examples`; step 8 contains
`## Annotations kept`; step 10 contains `## Git index`; step 11 contains
`## Reminder hooks`. Empty sections say `none`. Exit 0 means the step is
complete. Exit 2 means it refused before writing; read the message and fix the
input or order. Exit 3 means the step completed but reports content that needs a
person. An unexpected failure can be retried after the cause is fixed. A
completed step is safe to run again and changes no file but its report file. If steps 1 to 9 all
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

Finish each kind of item that a step leaves as follows:

- **A step 5 item.** Place the case in the story tree through `/qfai-sdd`, then
  remove its row from `retired/<spec-id>/06_Test-Cases.md`, which lies under
  `.qfai/evidence/migration-spec-to-story/`. Step 5 stops listing it.
- **A leftover pack file.** A story, rule or example that a step could not place
  keeps its old file in the spec directory. Place the item in the story tree
  through `/qfai-sdd` and leave the pack file untouched; delete the pack file
  once nothing in it is unplaced, because the archived original stays under
  `retired/<spec-id>/`. Steps 4 and 7 refuse a pack file that was edited, so do
  not remove single rows from it.
- **An example that cites several criteria, or a rule with no contract.** Settle
  it before step 4 with an `examples` entry, or a rule mark, in `plan.yaml`. After
  step 4, place it through `/qfai-sdd` as above; a rule mark is the exception
  while a spec pack is left.
- **An outline or a further scenario.** Step 4 lists a `Scenario Outline:`, a
  `Scenario Template:`, a further `Scenario:` and a `Background:` with the old
  file and line, and the item for an outline also carries the header row of its
  `Examples:` table. Place the cases of an outline and the further scenarios
  through `/qfai-sdd`.
- **A story with no criterion.** Step 4 lists a story none of whose criteria
  takes a new ID, with the old criteria that named it, and writes no
  `02_Acceptance-Criteria.md` for it. Where a story with no criterion shared
  one with another story, write its criterion through `/qfai-sdd`.
- **An unfinished test of the old ledger.** A `todo`, `blocked` or `red` row of
  the old ledger leaves with the archived ledger, and no step reads it. Its
  example has no test, and `npx qfai validate` lists it as `QFAI-STORY-006`.
  The same holds for a criterion that lost its integration or API annotation
  when step 8 rewrote the old annotations to the example level. Finish each
  with the test, or with a `decisions.md` row whose Content is `Test exception:`
  followed by the ID of the example or criterion, whose Approach holds the
  reason and whose Status is DONE.
- **A test-case annotation in an E2E file.** Step 8 leaves it unchanged,
  because an example annotation there is an error, and lists its file, line,
  annotation and example. Settle it with a test outside the E2E layer annotated
  with that example, or with a `decisions.md` row whose Content is
  `Test exception: <EX>`, whose Approach holds the reason and whose Status is
  DONE. Then delete the old annotation, because step 8 lists it on each run
  until it is deleted.
- **An annotation of an unplaced example.** Step 8 keeps it as written and lists
  its file and line. Edit an annotation by hand only for an example step 4 left
  unplaced: place the example through `/qfai-sdd`, then write
  `QFAI:EX-0001-0001-01`, naming the new example, over the annotation. An
  example named under `examples` before step 4 needs no edit, because step 8
  rewrites its annotations.
- **The old-layout error.** While any file remains under a `spec-*/` or
  `_policies/` directory of the spec directory, `npx qfai validate` reports
  one error and runs no other check. It lists each remaining file and ends
  with a line naming `/qfai-migration-v1-to-v2` and `/qfai-sdd`. Finish those
  files as above, and the other checks run.

An old ID may stand in one old file as an index table row, as a heading section
or as both. The steps read them as one record, and the two forms must hold equal
values: a difference ends the run with exit 2 before any write, naming both
locations. When a step removes a record it moved, it removes only that record's
table row and heading section. A table of `04_Business-Rules.md`,
`05_Examples.md` or `06_Test-Cases.md` whose header reads `BR ID`, `EX ID` or
`TC ID` is read as the hyphen form, and a table whose first column holds only
IDs under any other header stops the run with exit 2, naming the file and line.

Step 8 changes test-case annotations to example annotations where the ID map
resolves them, outside the E2E layer, and contract annotations to the new contract IDs. It changes an
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

Step 11 also installs the reminder hooks `npx qfai init` installs, through the
same merge, into `.claude/settings.json` and `.codex/hooks.json`:

- a missing file is written from the package's template;
- an existing file keeps its other settings and gains the hook groups it lacks;
- a hook group the project edited is kept, and `## Reminder hooks` names it;
- a file behind a symbolic link, or one the merge cannot read, is left as it is
  and reported for a person.

When it writes `.codex/hooks.json`, `## Reminder hooks` says that Codex runs
those hooks only after you review and trust them with `/hooks`.

The hooks print their text from `.agents/rules/reminders.json`. Step 11 brings
that file to this release the way `npx qfai init` brings a rule master, through
its entry in `.agents/rules/.qfai-rules.lock.json`: a copy nobody edited is
replaced, a missing one is written, and an edited one is kept and named under
`## Reminder hooks`. Run the step rather than editing these files by hand.

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
them has closed. A project upgrading from an earlier release meets these forms
as errors for the first time:

| Old form                                                             | Current form                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `playwright-cli` as the browser wrapper or `prototyping.browserTool` | `playwright`                                                                               |
| A reader of `.qfai/output/validate.json`                             | `.qfai/report/validate-<profile>.json`, or `.qfai/report/validate.json` for the latest run |
| A hand-written, per-skill handoff file                               | The canonical `.qfai/handoff.yaml`, rewritten by hand                                      |
| A plain string in a UI contract's `screens[].primary_tasks`          | A mapping with exactly `id`, `label` and `acceptance`                                      |
