# Move spec packs to the story tree

QFAI 2.0.0 introduces `.qfai/spec/` with policy, business-flow and contract layers.
QFAI 2.x does not read the old spec-pack layout. A project that keeps spec packs
must stay on a pinned 1.x release. To upgrade, migrate the project before using
the 2.x validation and authoring workflow.

## Contents

- Prepare
- Run the bundled steps
- Write boundary
- Resolve the reports
- Install and check the free-text entry
- Former migration memos

## Prepare

1. Save the current project state in version control. Inspect custom
   `paths.specsDir` and `paths.contractsDir` in `qfai.config.yaml`; the scripts
   honor configured paths and may write there even when outside `.qfai/`.
   Copy `.qfai/` with its git-ignored files (discussion packs, reports, review
   packs and evidence) to a place outside the repository before step 1, because
   version control does not hold them.
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

The first `npx qfai init` records the workflows it installs in
`.qfai/install-provenance.json`, so delete a shipped workflow the project does
not want after that run and commit the record, and later `npx qfai init` runs
leave it deleted. A workflow already in the 1.x tree has no record, because
`init` records only the files it writes. To keep such a workflow deleted, delete
it before that run, let `init` write it and record it, then delete it again and
commit the record.

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
| 11   | `11-install-entry.mjs`       | Install the free-text entry: skills, host skill links, `.gitignore` lines and hooks.                    |
| 12   | `12-check-entry.mjs`         | Check, without writing, that `npx qfai workflow start` would accept the project; list 1.x paths in it.  |

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

Steps 1 to 10 each print one line before their report, in a dry run and a real
run, and the report file keeps it. The line says what the step found:

| First line                                                      | What it means                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `no 1.x layout found under <specsDir> (paths.specsDir=<value>)` | The tree shows no trace of the old layout, and steps 1, 9 and 10 have no work of their own. |
| `1.x layout found, migrating`                                   | The tree shows a trace of the old layout, or step 1, 9 or 10 has work of its own.           |
| `already migrated (id-map.json present)`                        | An earlier run migrated the project and no step has anything left to do.                    |

The traces are an ID map, a source of step 1's renames, a spec pack or
`_policies/` directory in the specs directory, staging the step has to clear and
a retired key in `qfai.config.yaml`. `<specsDir>` is the specs directory the
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
| `.claude/settings.json` and `.codex/hooks.json`, only to add the reminder hooks                                                                             | 11                                   |
| `.agents/rules/reminders.json` and its entry in `.agents/rules/.qfai-rules.lock.json`, with a staging file beside it                                        | 11                                   |
| A report file of each run, under `.qfai/evidence/migration-spec-to-story/report/`                                                                           | 1–12                                 |
| Temporary staging inside `.qfai/evidence/migration-spec-to-story/`, configured spec, contract or test directories, or `.qfai/report/` for the managed block | 1–8, 10, 11                          |

The scripts verify ownership before clearing staging left by an interrupted
run. If a marker is incomplete or the staged bytes changed, they preserve it
for a person to inspect.

Step 12 writes only its report file.

Every report contains `## Operations`, after the first line of steps 1 to 10.
Steps 2 through 12 also contain
`## For a person`; step 5 contains `## Cases to examples`; step 8 contains
`## Annotations kept`; step 10 contains `## Git index`; step 11 contains
`## Reminder hooks`; step 12 contains `## Files scanned`. Empty sections say
`none`. Exit 0 means the step is
complete. Exit 2 means it refused before writing; read the message and fix the
input or order. Exit 3 means the step completed but reports content that needs a
person. An unexpected failure can be retried after the cause is fixed. A
completed step is safe to run again and changes no file but its report file.
When every one of steps 1 to 10 prints
`no 1.x layout found under <specsDir> (paths.specsDir=<value>)` first on a
project already using the story tree, report that there is nothing to migrate
in the directory that line names and ask the person to check that the specs
live there. Run steps 11 and 12 all the same.

Immediately after step 3, confirm the complete old `_policies/11_Slice-Policy.md`
is archived under `retired/_policies/` and none of its sections was copied to
`principle.md`. Current triage operations and ID allocation are in the shipped
SDD triage reference the skill body names. Read `objective.md`, `initiative.md`, `principle.md`
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
that file to this release the way `npx qfai init` brings a rule master, through
its entry in `.agents/rules/.qfai-rules.lock.json`: a copy nobody edited is
replaced, a missing one is written, and an edited one is kept and named under
`## Reminder hooks`. Run the step rather than editing these files by hand.

Step 12 makes the checks `npx qfai workflow start` makes on the project,
without starting a run, checks what step 11 installs, and lists the project
files that still name a 1.x path. Each failed check is reported by name:

| Check                 | Fails when                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `contract-undeclared` | A step a built-in plan runs is not installed under `.qfai/assistant/step/`                       |
| `reviewer-missing`    | A `routing:` override in `qfai.config.yaml` drops a reviewer the package's default routing needs |
| `invalid-mode`        | `workflow.mode` is set to anything other than `active`, `shadow` or `off`                        |
| `gitignore`           | The managed `.gitignore` block lacks `.qfai/run/`, or a line re-includes `.qfai/evidence/`       |
| `qfai-run-link`       | A host skill directory has no link to `.qfai/assistant/skill/qfai-run/`                          |
| `evidence-tracked`    | Git tracks a path under `.qfai/evidence/`                                                        |
| `old-path`            | A line of a tracked project file names a 1.x path                                                |

Run step 11 again for what it installs, and step 10 again for an evidence
re-include line or a tracked evidence path. A routing override belongs to the
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

| 1.x path                                                    | Where its content is now                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.qfai/specs`                                               | `.qfai/spec`                                                                                                                                                                                                                                                                                                                                                                                    |
| `.qfai/contracts`                                           | `.qfai/spec/03_contract`                                                                                                                                                                                                                                                                                                                                                                        |
| `.qfai/prototypes`                                          | `.qfai/prototype`                                                                                                                                                                                                                                                                                                                                                                               |
| `.qfai/assistant/skills` and `.qfai/assistant/skills.local` | `.qfai/assistant/skill` and `.qfai/assistant/skill.local`                                                                                                                                                                                                                                                                                                                                       |
| `.qfai/assistant/agents`                                    | `.qfai/assistant/agent`                                                                                                                                                                                                                                                                                                                                                                         |
| `.qfai/assistant/prompts`                                   | `.qfai/assistant/prompt`                                                                                                                                                                                                                                                                                                                                                                        |
| `.qfai/evidence/decisions`                                  | `.qfai/evidence/decision`                                                                                                                                                                                                                                                                                                                                                                       |
| `.qfai/report/specs-coverage`                               | `.qfai/report/spec-coverage`                                                                                                                                                                                                                                                                                                                                                                    |
| `_policies/`                                                | `.qfai/spec/01_policy/`: `01_Objective.md` is `objective.md`, `02_Initiative.md` is `initiative.md`, `06_Glossary.md` is `glossary.md` and `07_Constraints.md` is `constraint.md`; `.qfai/spec/03_contract/contracts.md` (`05_Contracts.md`); `.qfai/spec/02_business-flow/` (`04_Business-Flow.md`); `03_Capabilities.md` stays in `.qfai/evidence/migration-spec-to-story/retired/_policies/` |
| `spec-NNNN`                                                 | The `business-flow-NNNN/` and `user-story-NNNN-NNNN/` directories of `.qfai/spec/02_business-flow/`; `.qfai/evidence/migration-spec-to-story/id-map.json` pairs each old ID with its new one                                                                                                                                                                                                    |
| `01_Spec.md`                                                | The copy kept under `.qfai/evidence/migration-spec-to-story/retired/<spec-id>/`                                                                                                                                                                                                                                                                                                                 |
| `assistant/steering`                                        | `.qfai/assistant/rule/` for a rule; `.qfai/spec/01_policy/` and `.qfai/spec/03_contract/tech.md` for a project fact                                                                                                                                                                                                                                                                             |
| `assistant/instructions`                                    | `.qfai/assistant/rule/` for a rule; `.qfai/spec/01_policy/` and `.qfai/spec/03_contract/tech.md` for a project fact                                                                                                                                                                                                                                                                             |

A person rewords each listed line so that it no longer names the old path.
The `retired/` copies exist only in this working copy, so a line that points at
one of them points at a file nobody else has.

After step 12, run `npx qfai validate` from the local dependency (or `yarn exec qfai validate` for Plug'n'Play). Resolve every
layout and chain error. Its test-obligation findings identify any business
flow, acceptance criterion or example still missing a test in its layer. E2E
tests cover flows, integration and API tests cover criteria, and other tests
cover examples. Record a permitted exception in `decisions.md` when a test is
intentionally absent.

Then send the project's first free-text change request to the `qfai-run`
skill. The prompt-time hook step 11 installed points agents there.

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
