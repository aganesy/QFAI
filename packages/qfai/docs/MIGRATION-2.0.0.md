# Migrate to QFAI 2.0.0

QFAI 2.0.0 reads a story tree under `.qfai/spec/`. It no longer accepts the
spec-pack layout under `.qfai/specs/`. Migrate an existing project before
using the new validation and authoring workflow. Projects that cannot migrate
yet must keep a pinned 1.x dependency.

## Prepare

1. Commit or otherwise back up the project before any migration step. Include
   untracked files and any configured spec or contract directory outside
   `.qfai/`: the migration deletes every 1.x file that has no destination, an
   untracked file and an uncommitted edit included, and only what git history
   holds can be recovered. Inspect `qfai.config.yaml` for custom `paths.specsDir` and
   `paths.contractsDir`.
2. Install `qfai@2.0.0` as a local project dependency. The bundled scripts
   load the installed package; an `npx` download alone is insufficient.
3. Run the locally installed `qfai init` without `--force`. On an old-layout
   project, it installs the migration skill without seeding a competing story
   tree. Do not use `init --force` for this migration: it can refresh assets
   outside the scripts' write boundary.
4. From the project root, open `/qfai-migration-v1-to-v2` and read its
   `references/migration-guide.md`. The skill is under
   `.qfai/assistant/skill/qfai-migration-v1-to-v2/`. There is no
   `qfai migrate` command.

## Place content before running the scripts

The migration skill writes `tmp/qfai-migration/plan.yaml`. Review it before
step 4:
each old story needs one destination business flow, and each old business rule
needs one enforcing contract. Some acceptance criteria need an explicit parent
story. A contract path is relative to the configured contracts directory, lies
under `cli/`, `api/`, `db/` or `ui/`, and names the file as it is before the
migration renames it. Flow and story order determine new IDs.
Step 4 creates an ID map that later steps use; after that map exists, move or
place unresolved content through `/qfai-sdd` in the new tree instead of
changing the plan.

Step 3 gives every contract a 2.x contract ID and renames its file to match:
`api/api-0001-orders.yaml`, declaring `CON-API-0001`, can become
`api/api-0002-orders.yaml` declaring `API-0002`. Numbers are unique across
contract kinds. The old and new IDs and paths are recorded in
`tmp/qfai-migration/contract-map.json` and then in the ID
map. Later steps rewrite the old IDs in dependency declarations, rule
statements and test annotations, and number each contract's rules from its own
number, such as `BR-0006-0001`. A Markdown contract takes its rules as rows of
a `## Business rules` table. `contracts.md` becomes one index table.

Two kinds of 1.x file are not 2.0.0 contracts. Step 3 gives them no ID and
does not write them into the new tree:

- a Markdown file under `api/`, `db/` or `ui/`, whose directory holds OpenAPI
  YAML or JSON, SQL or UI YAML contracts;
- every file under `design/`, which no longer exists: the brand belongs in the
  root `DESIGN.md`, and a screen in a `ui/` contract.

Each is listed for a person and deleted, so a plan cannot place a rule in one.
The old `design/prototype-handoff.yaml` is now
`.qfai/prototype/final/handoff.json`, which `/qfai-prototyping` writes. The
migration does not convert the old file into it.

The result separates project policy, concrete behavior, and enforcing
contracts:

| Old content                                                                           | New home                               |
| ------------------------------------------------------------------------------------- | -------------------------------------- |
| Shared objectives, glossary and constraints                                           | `01_policy/`                           |
| Business flows, stories, acceptance criteria and examples                             | `02_business-flow/`                    |
| Contract index, technology stack and commands, and API, database, UI or CLI contracts | `03_contract/`                         |
| Decisions and open questions                                                          | `decisions.md` and `open-questions.md` |

Every story-tree document the scripts write is in the shape of its `qfai-sdd`
template, which is the shape the document schema checks. Content that does not
fit is listed under `## For a person` for a person to rewrite. These are not
carried into the new tree. They stay in the old spec-pack files until step 7
deletes the pack, and then only git history keeps them:

- a spec pack's scope and source provenance;
- a story's `Parent`, `Source` and `Flow` fields;
- a criterion's `# Parent:` line, since its directory names the story.

A Markdown CLI contract takes its template's shape too: its heading, an
`## Ownership boundary` and the `## Business rules` table, which is all its
schema admits. An old ownership boundary of one to three paragraphs is kept.
Where there is none, the section holds the template's placeholder for a person
to replace. Every other part of the old contract is listed for a person with
the old file.

The scripts delete old files that have no direct new home. Review the four
assembled files after step 3: `objective.md`, `initiative.md`,
`principle.md` and `tech.md`. Remove duplicated facts
expressed in different words. Do not copy the old slice policy's obsolete rules
into `principle.md`.

## Run the steps

Run each script from the project root with `--dry-run`, inspect its complete
report and write targets, then run it without the flag. Save both reports and
exit codes. Run the next step only after the preceding one has completed.

| Step | Script                       | Result                                                                   |
| ---- | ---------------------------- | ------------------------------------------------------------------------ |
| 1    | `01-rename-directories.mjs`  | Move owned directories and update old default paths.                     |
| 2    | `02-merge-tables.mjs`        | Combine decisions, questions and change records.                         |
| 3    | `03-move-catalog.mjs`        | Move policy and assistant content; number and rename the contracts.      |
| 4    | `04-renumber-ids.mjs`        | Build the flow and story tree and write the ID map.                      |
| 5    | `05-cases-to-examples.mjs`   | Preserve test-case-only behavior as examples.                            |
| 6    | `06-derive-ac-refs.mjs`      | Link examples to acceptance criteria when the source establishes one.    |
| 7    | `07-rules-to-contracts.mjs`  | Place rules in the planned enforcing contracts.                          |
| 8    | `08-rewrite-annotations.mjs` | Rewrite test annotations that the ID map resolves.                       |
| 9    | `09-repoint-links.mjs`       | Update host skill and agent links.                                       |
| 10   | `10-update-gitignore.mjs`    | Reset the managed `.gitignore` block.                                    |
| 11   | `11-install-entry.mjs`       | Install the free-text entry: skills, links, `.gitignore` and the hooks.  |
| 12   | `12-check-entry.mjs`         | Check, without writing, the free-text entry and the project's 1.x paths. |

For example:

```bash
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

Steps 1 to 10 each print one line before their report, in a dry run and a real
run. It is `no 1.x layout found under <specsDir> (paths.specsDir=<value>)` when
the tree shows no trace of the old layout, `1.x layout found, migrating` when it
shows one or the step has work of its own, and
`already migrated (id-map.json present)` when an earlier run finished. If every
one of steps 1 to 10 prints the first, nothing was found to migrate in the
directory it names: check that your specs live there. Step 10 also ends with a `Summary:` line
for the first two cases. Steps 11 and 12 print neither line. A script that reads
the report from its first line should start at `## Operations`, which still
opens the rest of the report.

Step 10 resets the managed `.gitignore` block and leaves every other line as it
is.

Step 11 replaces each shipped skill with the installed package's copy, a copy
the project changed included. Step 12 lists under `## For a person` each check
a shipped plan needs that fails, such as a `qfai.config.yaml` routing
override that drops a reviewer the defaults require. It also lists, as an
`old-path` item, each line of a tracked project file that still names a 1.x
path, and it prints `## Files scanned` with the number of files it read, or a note that the project
is not a git repository. The
migration does not rewrite skills, agents or documents you wrote. The path table
in `references/migration-guide.md` of the migration skill gives the 2.x path for
each 1.x path. Rerunning step 11 settles what it installs; a routing override is
yours to change. Step 11 also installs
the reminder hooks `qfai init` installs, in `.claude/settings.json` and
`.codex/hooks.json`, through the same merge, and brings the text they print,
`.agents/rules/reminders.json`, to the package's copy.

A project already migrated with an earlier 2.x release runs the skill again
after upgrading. Steps 1 to 10 find no 1.x layout and change nothing; step 11
adds only what that release lacked, such as the hooks. The installed skill is still the earlier release's copy, and plain `qfai init`
leaves it as it is, so bring it up to date first:

1. Run the locally installed `qfai init` without `--force`. It installs the
   hooks and `.agents/rules/reminders.json`, and names the older skill copies.
2. Run step 11 of the installed skill, `--dry-run` first. Its script runs the
   upgraded package and replaces the older skill copies with this release's.
3. Then run `/qfai-migration-v1-to-v2` again.

Exit 0 completes a step. Exit 2 refuses before writing; fix the stated input
or order. Exit 3 completes the step but leaves items in `## For a person`.
Resolve those items before declaring migration complete. Completed steps are
safe to rerun and should make no further changes. The scripts make no network
calls, but can write configured paths outside `.qfai/`, test annotations,
host integration links and `.gitignore`. Read the skill guide's write-boundary
table before approving a dry run.

## Review decisions and verify

The plan and the ID map are under `tmp/qfai-migration/`, which git ignores,
and can be deleted once the migration is done. A story with no flow, a rule with no contract, an example with
no single criterion, an unresolved test annotation and a non-functional
requirement with no destination need content-owner judgment. Do not copy a
retired rule or example into the active tree merely to clear a report.

After step 12, run the locally installed `qfai validate --profile full
--fail-on error`. Resolve layout and link errors. Inspect test-obligation
findings: end-to-end tests cover business flows, integration or API tests
cover acceptance criteria, and other tests cover examples. Step 8 changes
only resolvable annotations; inspect `## Annotations kept` and verify each
new annotation against the test's actual assertion. An old contract ID the
steps could not translate, such as a UI marker in application code, is
listed for a person with its file and line; replace it by hand. Record a permitted
exception in `decisions.md` when a test is intentionally absent.

Update project CI to use the new tree and annotation patterns. On pull
requests, run full validation and the drift profile. No profile reads
prototyping evidence. The `saas-package` profile needs root `DESIGN.md` and
the handoff record `.qfai/prototype/final/handoff.json`, which
`/qfai-prototyping` writes when the user confirms the prototype. Run
document-shape and
Mermaid checks against the configured story-tree path. Keep test jobs for
the applicable layers. The workflows installed by `qfai init` are
create-only: compare a project's edited copies with the new shipped
templates and apply changes deliberately. Update `qfai.config.yaml` test
globs and the Standard commands in `03_contract/tech.md` to match the
project's test layout. Step 3 moves the old structure catalog's entrypoints
to Skeleton lines in `tech.md`, its layer table to the Architecture
section of `tech.md` and its UI surface paths to `uiux.surfacePaths` in
`qfai.config.yaml`, and lists the rest for a person. The layers are drawn as
a diagram and their rows ordered from the uppermost layer down; a layer
table that cannot be ordered is listed for a person instead.

## Roll back

The scripts do not provide a reverse migration. To abandon the change,
restore the pre-migration project snapshot, including configured external
spec and contract paths, test files, host integration links, `.gitignore`
and `qfai.config.yaml`, then restore the pinned 1.x dependency. After the
first complete run, rerun the steps and confirm that they change no files.

## Start with a free-text request

Once step 12 exits 0 and validation passes, send the project's first
free-text change request to `qfai-run`. The prompt-time hook step 11 installed
points agents there.

## Workflow routes and payloads

`npx qfai workflow` chooses each run's route from a catalog of 39 routes. The
five route ids of earlier 2.0.0 builds are retired. A run record written under
one is read under its successor, and the record itself is never rewritten.

| Retired id       | Read as                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `direct`         | `edit-text`                                                                |
| `bugfix`         | `fix-defect`                                                               |
| `bounded-change` | `add-feature`                                                              |
| `feature`        | `prototype-feature` when the run has a prototype stage, else `add-feature` |
| `discovery`      | `decide-design`                                                            |

`status` and every report show the successor. An unfinished run on a retired id
cannot continue: every write operation and `resume` refuse it `fail-closed` with
cause `contract-undeclared`, naming the route. A `stop` still cancels it. State
the request again to start a new run.

What changed in the payloads and plans:

- A route proposal carries `extraction`: the request's intent, entry flags,
  qualifiers, signals, risks, gate, artifacts and confidence. The CLI chooses
  the route from it. `candidateRoute`, `requiredStages` and `optionalSteps` are
  gone, and a proposal that carries one is refused as an unknown key.
- A plan no longer carries `when`, on a stage or on a step, and no step is
  marked `proposed`. Every step of a plan runs.
- A step marked `passThrough: true` still runs. When it has nothing to write, it
  records a pass in the stage result's `passes`, and `accept` refuses the pass
  while work it owns remains.
- A plan carries `family`, `defaultModifiers`, `decisionPoints`, `releasePoint`
  and `branchPoints`. A step entry is a step name or `{ step, mode, passThrough }`.
  Plans ship in the package, and a project does not edit them.
- A run's `summary.json` adds `modifiers`, `reroutes` and `closure`.
- The routing defaults moved from `assets/defaults/agent-routing.yml` to one
  file per owner under `assets/defaults/agent-routing/`, read in file-name order
  as one list. No entry changed. A `routing:` entry in `qfai.config.yaml` still
  replaces the default entry of the same name.
- The new `qfai-triage` skill owns the routes that end without a change. Step 11
  installs it with the other shipped skills.
