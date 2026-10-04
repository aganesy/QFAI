# Move spec packs to the story tree

QFAI 2.0.0 introduces `.qfai/spec/` with policy, business-flow and contract layers.
QFAI 2.x does not read the old spec-pack layout. A project that keeps spec packs
must stay on a pinned 1.x release. To upgrade, migrate the project before using
the 2.x validation and authoring workflow.

## Prepare

1. Commit the current project state. The migration deletes every 1.x file
   that has no destination, an untracked file and an uncommitted edit included,
   and replaces every shipped skill the project customised. Only what git
   history holds can be recovered, so commit or copy anything you need first.
   Copy `.qfai/` with its git-ignored files to a place outside the repository
   before step 1, because version control does not hold them.
   Inspect custom `paths.specsDir` and `paths.contractsDir` in
   `qfai.config.yaml`; the scripts honor configured paths and may write there
   even when outside `.qfai/`.
2. Install a QFAI 2.x release as a local project dependency with the project's
   package manager. A copy available only through `npx` is insufficient.
   Each checkout and each git worktree needs its own install before `npx qfai` resolves 2.x.
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

The AI writes `tmp/qfai-migration/plan.yaml` before running
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
`tmp/qfai-migration/id-map.json` once, and later steps use
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
- `tmp/qfai-migration/contract-map.json` records each old
  path and old ID with the new ones, and step 4 copies it into the ID map.
- Step 7 writes the new IDs into rule statements, and step 8 changes a
  `QFAI:CON-API-0001` test annotation to `QFAI:API-0002`.

Step 3 gives no ID to a file that is not a 2.x contract, and does not write it
into the new tree:

| Old file                                     | Why it is not a contract                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A Markdown file under `api/`, `db/` or `ui/` | Those directories hold OpenAPI YAML or JSON, SQL and UI YAML contracts                                  |
| Any file under `design/`                     | The directory no longer exists: the brand belongs in the root `DESIGN.md`, a screen in a `ui/` contract |

Step 3 deletes each one, `design/` as one directory, and lists each file under
`## For a person`. Rewrite what the file stated, from git history, in the form
its row names.

The old `design/prototype-handoff.yaml` is now
`.qfai/prototype/final/handoff.json`, which `/qfai-prototyping` writes when
the user confirms the prototype. The migration does not convert
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
  file and, where one fits, the template section that takes the content once a
  person rewrites it. The source file is deleted, so the content is read from
  git history.
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
file, which stays in the pack while any of its content is unplaced and is then
deleted, kept in git history only:

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
| Anything else                                                                                                                              | `## For a person`                                     |

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
  and every other section are left out. Each is listed with the old file.

Step 7 then writes the contract's rules into that table. A rule whose statement
names another rule is written and listed for a person, because a CLI contract's
rule cites only examples.

## Run the bundled steps

For each row, run the script with `--dry-run`, read its operations, and then run
it without the flag. Dry runs are sequential: the dry run of a step refuses until
the earlier steps ran, so run the steps one after another, each dry run before
its real run. Step 1 is the first write and the point of no return for the
layout. Step 3 is the point of no return for the contract names.

Each step prints its report and writes it to no file. Read the report of every
run, and its exit code.

| Step | Script                       | Purpose                                                                                             |
| ---- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | `01-rename-directories.mjs`  | Move old owned directories entry by entry; delete an entry whose destination exists.                |
| 2    | `02-merge-tables.mjs`        | Merge decisions, questions, triage and change records.                                              |
| 3    | `03-move-catalog.mjs`        | Move policy and assistant content, number and rename the contracts, and keep project overrides.     |
| 4    | `04-renumber-ids.mjs`        | Write the flow and story tree, delete old plans and test lists, and write the ID map.               |
| 5    | `05-cases-to-examples.mjs`   | Turn old cases with no example into examples.                                                       |
| 6    | `06-derive-ac-refs.mjs`      | Give each example one criterion reference where the cases establish it.                             |
| 7    | `07-rules-to-contracts.mjs`  | Put rules into the contracts named by the plan, and delete each spec pack once all of it is placed. |
| 8    | `08-rewrite-annotations.mjs` | Update resolvable test annotations; keep and report the rest.                                       |
| 9    | `09-repoint-links.mjs`       | Repoint host skill and agent links.                                                                 |
| 10   | `10-update-gitignore.mjs`    | Reset the managed `.gitignore` block.                                                               |
| 11   | `11-install-entry.mjs`       | Install the free-text entry: skills, host skill links, `.gitignore` lines and hooks.                |
| 12   | `12-check-entry.mjs`         | Check, without writing, what a shipped plan needs of the project; list 1.x paths in it.             |

Run a row from the project root in this form:

```text
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

The shared `scripts/_step.mjs` loads the locally installed package for each
script. Keep it with the twelve numbered scripts.

The same steps serve two runs:

| Project                                    | What the steps do                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| On the 1.x spec-pack layout                | Every step runs: steps 1 to 10 migrate the spec packs, and step 11 installs the free-text entry and the reminder hooks   |
| Migrated already by an earlier 2.x release | Steps 1 to 10 each find no 1.x layout and change nothing; step 11 adds only what that release lacked, the hooks among it |

Steps 1 to 10 each print one line before their report, in a dry run and a real
run. The line says what the step found:

| First line                                                      | What it means                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `no 1.x layout found under <specsDir> (paths.specsDir=<value>)` | The tree shows no trace of the old layout, and steps 1, 9 and 10 have no work of their own. |
| `1.x layout found, migrating`                                   | The tree shows a trace of the old layout, or step 1, 9 or 10 has work of its own.           |
| `already migrated (id-map.json present)`                        | An earlier run migrated the project and no step has anything left to do.                    |

The traces are an ID map, a source of step 1's renames, a spec pack or
`_policies/` directory in the specs directory, and a retired key in
`qfai.config.yaml`. `<specsDir>` is the specs directory the
configuration names and `<value>` is the configured `paths.specsDir`, each
written from the project root with `/` and never as an absolute path.

Step 10 also ends with a `Summary:` line for the first two, and with the line
saying the migration is already done for the third. Steps 11 and 12 print
neither line, because they compare the project with the installed package and
not with the old layout. A step never decides that the project is in the wrong
place. It names the directory it looked in and leaves the check to the person.

After upgrading a project the second row describes:

1. Run `npx qfai init` without `--force`. It installs the reminder hooks and
   `.agents/rules/reminders.json`. It leaves the skill copies the earlier
   release installed as they are, and names them as differing.
2. Run step 11 of the installed skill, `--dry-run` first:
   `node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/11-install-entry.mjs`.
   The script runs the upgraded package, so it brings every shipped skill,
   this one included, to this release and replaces a copy the project edited.
3. Run the skill again from the start. Report that only the files step 11
   listed changed.

## Write boundary

The dry run lists the operations the real run would perform. No step makes a
network call. The scripts write only these targets:

| Target                                                                                                    | Steps                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `.qfai/` and configured spec and contract paths outside it                                                | 1–7                                  |
| `qfai.config.yaml`                                                                                        | 1, 3                                 |
| `QFAI:` annotation lines in test files                                                                    | 8                                    |
| `.claude/skills`, `.agents/skills`, `.codex/skills`, `.github/skills`, `.claude/agents`, `.github/agents` | 9; 11 for the four skill directories |
| Managed block of `.gitignore`                                                                             | 10, 11                               |
| `tmp/qfai-migration/contract-map.json` and `tmp/qfai-migration/id-map.json`                               | 3, 4                                 |
| Shipped skill and step directories under `.qfai/assistant/skill/` and `.qfai/assistant/step/`             | 11                                   |
| `.claude/settings.json` and `.codex/hooks.json`, only to add the reminder hooks                           | 11                                   |
| `.agents/rules/reminders.json`                                                                            | 11                                   |

No step writes under `.qfai/evidence/`. Step 12 writes nothing.

Every report contains `## Operations`, after the first line of steps 1 to 10.
Steps 2 through 12 also contain
`## For a person`; step 5 contains `## Cases to examples`; step 8 contains
`## Annotations kept`; step 11 contains `## Reminder hooks`; step 12 contains
`## Files scanned`. Empty sections say
`none`. Exit 0 means the step is
complete. Exit 2 means it refused before writing; read the message and fix the
input or order. Exit 3 means the step completed but reports content that needs a
person. An unexpected failure can be retried after the cause is fixed. A
completed step is safe to run again and changes no file.
When every one of steps 1 to 10 prints
`no 1.x layout found under <specsDir> (paths.specsDir=<value>)` first on a
project already using the story tree, report that there is nothing to migrate
in the directory that line names and ask the person to check that the specs
live there. Run steps 11 and 12 all the same.

Immediately after step 3, confirm the old `_policies/11_Slice-Policy.md` is
deleted and none of its sections was copied to `principle.md`. Current triage operations and ID allocation are in the shipped
`qfai-sdd/references/sdd-triage.md`. Read `objective.md`, `initiative.md`, `principle.md`
and `tech.md`. Remove facts repeated in different words. The
scripts remove byte-identical repeats; a person must judge paraphrases. Quality
gate commands have one home: the Standard commands section of `tech.md`, which
step 3 writes in its template's shape. Replace each `<...>` placeholder the old
`catalog/tech.md` did not supply.

## Resolve the reports

Every deletion is listed under `## Operations`, and every item a step could not
settle under `## For a person`. Resolve each `## For a person` row using its file path and reason. Common cases
include a story without a flow, a rule without an enforcing contract, an example
without exactly one criterion, an unresolved annotation, an applicable
non-functional requirement, a catalog overlay without a matching rule, and
content that does not fit its template's shape. A
migrated test case with no previous example appears
under `## Cases to examples` or `## For a person`; check that none is missing.

Finish each kind of item that a step leaves as follows:

- **A step 5 item.** Place the case in the story tree through `/qfai-sdd`, then
  remove its row from the pack's `06_Test-Cases.md`. Step 5 stops listing it.
- **A leftover pack file.** A story, rule or example that a step could not place
  keeps its old file in the spec directory, and step 7 deletes the pack only once
  all of it is placed. Place the item in the story tree through `/qfai-sdd`, and
  delete the pack's files once nothing in them is unplaced; git history keeps
  them.
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
  the old ledger is deleted with the ledger, and no step reads it. Its
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

Step 10 makes the managed `.gitignore` block equal the installed package's
block, and leaves every line outside it as it is.

## Install and check the free-text entry

Step 11 makes each skill and step directory the package ships equal to the
installed package's copy. A copy the project changed is replaced, an untracked
file and an uncommitted edit included, and the replacement is listed under
`## Operations`. A skill the package does not ship and
`.qfai/assistant/skill.local/` are left alone. Step 11 also adds each missing
host skill link and the `.qfai/run/` line of the managed `.gitignore` block. A
path it cannot write is reported with the reason. It leaves `AGENTS.md` and
`CLAUDE.md` as they are, a line an earlier `npx qfai init` wrote included.

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
that file to this release as `npx qfai init --force` brings a rule master: it is
replaced with the shipped text, or written where it is missing, and named under
`## Reminder hooks`. Run the step rather than editing these files by hand.

Step 12 makes the checks a shipped plan needs of the project, checks what step
11 installs, and lists the project files that still name a 1.x path. Each failed
check is reported by name:

| Check              | Fails when                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `plan-invalid`     | A step a built-in plan runs is not installed under `.qfai/assistant/step/`                       |
| `reviewer-missing` | A `routing:` override in `qfai.config.yaml` drops a reviewer the package's default routing needs |
| `invalid-mode`     | `workflow.mode` is set to anything other than `active`, `shadow` or `off`                        |
| `gitignore`        | The managed `.gitignore` block differs from the one the installed package writes                 |
| `qfai-run-link`    | A host skill directory has no link to `.qfai/assistant/skill/qfai-run/`                          |
| `old-path`         | A line of a tracked project file names a 1.x path                                                |

Run step 11 again for what it installs, and step 10 again for a `gitignore`
item. A routing override belongs to the
project, so its owner decides whether to restore the reviewer. Rerun step 12
until it exits 0.

### Files the project wrote

The migration does not rewrite a skill, agent or document the project wrote.
One that reads `.qfai/specs/spec-0001/01_Spec.md` still reads it after step 10,
and fails on its first run. Step 12 lists each line of a tracked file that names
a 1.x path as an `old-path` item, with the file, the line number and the paths
the line names. Step 12 prints `## Files scanned` whatever it finds: the number
of files it read for lines, or that the project is not a git repository. Any
other failure of git ends the step with exit 2 and git's message.

Step 12 does not scan a file under `.qfai/`, a file under the configured spec
and contract directories, `.github/copilot-instructions.md`, a symbolic link, a
binary file or a file git does not track. A skill kept in
`.qfai/assistant/skill.local/` lies under `.qfai/`, so check it by hand against
this table:

| 1.x path                                                    | Where its content is now                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.qfai/specs`                                               | `.qfai/spec`                                                                                                                                                                                                                                                                                                                                        |
| `.qfai/contracts`                                           | `.qfai/spec/03_contract`                                                                                                                                                                                                                                                                                                                            |
| `.qfai/prototypes`                                          | `.qfai/prototype`                                                                                                                                                                                                                                                                                                                                   |
| `.qfai/assistant/skills` and `.qfai/assistant/skills.local` | `.qfai/assistant/skill` and `.qfai/assistant/skill.local`                                                                                                                                                                                                                                                                                           |
| `.qfai/assistant/agents`                                    | `.qfai/assistant/agent`                                                                                                                                                                                                                                                                                                                             |
| `.qfai/assistant/prompts`                                   | `.qfai/assistant/prompt`                                                                                                                                                                                                                                                                                                                            |
| `.qfai/evidence/decisions`                                  | Not moved: 2.x keeps no decision records under `.qfai/evidence/`                                                                                                                                                                                                                                                                                    |
| `.qfai/report/specs-coverage`                               | `.qfai/report/spec-coverage`                                                                                                                                                                                                                                                                                                                        |
| `_policies/`                                                | `.qfai/spec/01_policy/`: `01_Objective.md` is `objective.md`, `02_Initiative.md` is `initiative.md`, `06_Glossary.md` is `glossary.md` and `07_Constraints.md` is `constraint.md`; `.qfai/spec/03_contract/contracts.md` (`05_Contracts.md`); `.qfai/spec/02_business-flow/` (`04_Business-Flow.md`); `03_Capabilities.md` kept in git history only |
| `spec-NNNN`                                                 | The `business-flow-NNNN/` and `user-story-NNNN-NNNN/` directories of `.qfai/spec/02_business-flow/`; `tmp/qfai-migration/id-map.json` pairs each old ID with its new one                                                                                                                                                                            |
| `01_Spec.md`                                                | Kept in git history only                                                                                                                                                                                                                                                                                                                            |
| `assistant/instructions`                                    | `.qfai/assistant/rule/` for a rule; `.qfai/spec/01_policy/` and `.qfai/spec/03_contract/tech.md` for a project fact                                                                                                                                                                                                                                 |

A person rewords each listed line so that it no longer names the old path.

After step 12, run `npx qfai validate` from the local dependency (or `yarn exec qfai validate` for Plug'n'Play). Resolve every
layout and chain error. Its test-obligation findings identify any business
flow, acceptance criterion or example still missing a test in its layer. E2E
tests cover flows, integration and API tests cover criteria, and other tests
cover examples. Record a permitted exception in `decisions.md` when a test is
intentionally absent.

Then send the project's first free-text change request to the `qfai-run`
skill. The prompt-time hook step 11 installed points agents there.

The plan and the ID map are under `tmp/qfai-migration/`, which git ignores, and
can be deleted once the migration is done. What the migration deleted survives
only where git history held it.

## Former migration memos

QFAI 2.0.0 has no `.qfai/assistant/process/` directory, and `npx qfai init` writes
no migration memo. Step 3 deletes the memos a 1.x release wrote to
`.qfai/assistant/process/migrations/`; git history keeps them.

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
