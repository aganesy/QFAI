# Migrate to QFAI 2.0.0

QFAI 2.0.0 reads a story tree under `.qfai/spec/`. It no longer accepts the
spec-pack layout under `.qfai/specs/`. Migrate an existing project before
using the new validation and authoring workflow. Projects that cannot migrate
yet must keep a pinned 1.x dependency.

## Prepare

1. Commit or otherwise back up the project before any migration step. Include
   untracked files and any configured spec or contract directory outside
   `.qfai/`. Inspect `qfai.config.yaml` for custom `paths.specsDir` and
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

The migration skill writes
`.qfai/evidence/migration-spec-to-story/plan.yaml`. Review it before step 4:
each old story needs one destination business flow, and each old business rule
needs one enforcing contract. Some acceptance criteria need an explicit parent
story. Contract paths are relative to the configured contracts directory.
Flow and story order determine new IDs. Step 4 creates an ID map that later
steps use; after that map exists, move or place unresolved content through
`/qfai-sdd` in the new tree instead of changing the plan.

The result separates project policy, concrete behavior, and enforcing
contracts:

| Old content                                                                    | New home                               |
| ------------------------------------------------------------------------------ | -------------------------------------- |
| Shared objectives, glossary and constraints                                    | `01_policy/`                           |
| Business flows, stories, acceptance criteria and examples                      | `02_business-flow/`                    |
| Contract index, technical rules and API, database, UI, CLI or design contracts | `03_contract/`                         |
| Decisions and open questions                                                   | `decisions.md` and `open-questions.md` |

The scripts archive old files that have no direct new home. Review the five
assembled files after step 3: `objective.md`, `initiative.md`,
`principle.md`, `tech.md` and `structure.md`. Remove duplicated facts
expressed in different words. Keep the complete old slice-policy file in the
migration archive; do not copy its obsolete rules into `principle.md`.

## Run the steps

Run each script from the project root with `--dry-run`, inspect its complete
report and write targets, then run it without the flag. Save both reports and
exit codes. Run the next step only after the preceding one has completed.

| Step | Script                       | Result                                                                                   |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | `01-rename-directories.mjs`  | Move owned directories and update old default paths.                                     |
| 2    | `02-merge-tables.mjs`        | Combine decisions, questions and change records.                                         |
| 3    | `03-move-catalog.mjs`        | Move policy and assistant content; archive content with no new home.                     |
| 4    | `04-renumber-ids.mjs`        | Build the flow and story tree and write the ID map.                                      |
| 5    | `05-cases-to-examples.mjs`   | Preserve test-case-only behavior as examples.                                            |
| 6    | `06-derive-ac-refs.mjs`      | Link examples to acceptance criteria when the source establishes one.                    |
| 7    | `07-rules-to-contracts.mjs`  | Place rules in the planned enforcing contracts.                                          |
| 8    | `08-rewrite-annotations.mjs` | Rewrite test annotations that the ID map resolves.                                       |
| 9    | `09-repoint-links.mjs`       | Update host skill and agent links.                                                       |
| 10   | `10-update-gitignore.mjs`    | Refresh the managed `.gitignore` block.                                                  |
| 11   | `11-install-entry.mjs`       | Install the free-text entry: skills, host links, entry directive and `.gitignore` lines. |
| 12   | `12-check-entry.mjs`         | Check, without writing, that the free-text entry can start a run.                        |

For example:

```bash
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs --dry-run
node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs
```

Step 11 replaces each shipped skill with the installed package's copy. A copy
the project changed is moved whole to
`.qfai/evidence/migration-spec-to-story/legacy/skill/<id>/` first, never
deleted. Step 12 lists under `## For a person` each check
`npx qfai workflow start` would fail, such as a `qfai.config.yaml` routing
override that drops a reviewer the defaults require. Rerunning step 11 settles
what it installs; a routing override is yours to change.

Exit 0 completes a step. Exit 2 refuses before writing; fix the stated input
or order. Exit 3 completes the step but leaves items in `## For a person`.
Resolve those items before declaring migration complete. Completed steps are
safe to rerun and should make no further changes. The scripts make no network
calls, but can write configured paths outside `.qfai/`, test annotations,
host integration links, `AGENTS.md`, `CLAUDE.md` and the managed `.gitignore`
block. Read the skill guide's write-boundary table before approving a dry run.

## Review decisions and verify

Keep the migration `legacy/` and `retired/` archives until every item is
accounted for. A story with no flow, a rule with no contract, an example with
no single criterion, an unresolved test annotation and a non-functional
requirement with no destination need content-owner judgment. Do not copy a
retired rule or example into the active tree merely to clear a report.

After step 12, run the locally installed `qfai validate --profile full
--fail-on error`. Resolve layout and link errors. Inspect test-obligation
findings: end-to-end tests cover business flows, integration or API tests
cover acceptance criteria, and other tests cover examples. Step 8 changes
only resolvable annotations; inspect `## Annotations kept` and verify each
new annotation against the test's actual assertion. Record a permitted
exception in `decisions.md` when a test is intentionally absent.

Update project CI to use the new tree and annotation patterns. On pull
requests, run full validation and the drift profile; run document-shape and
Mermaid checks against the configured story-tree path. Keep test jobs for
the applicable layers. The workflows installed by `qfai init` are
create-only: compare a project's edited copies with the new shipped
templates and apply changes deliberately. Update `qfai.config.yaml` test
globs and the Standard commands in `03_contract/tech.md` to match the
project's test layout.

## Roll back or resume

The scripts do not provide a reverse migration. To abandon the change,
restore the pre-migration project snapshot, including configured external
spec and contract paths, test files, host integration links, `.gitignore`
and `qfai.config.yaml`, then restore the pinned 1.x dependency. The
`legacy/` and `retired/` archives preserve old content for review, but
are not a substitute for a full backup.

To resume an interrupted migration, inspect its report and staging marker,
fix the stated cause and rerun that step with the same plan. The scripts
preserve incomplete or changed staging for inspection. After the first
complete run, rerun the steps and confirm that they change no files.

## Start with a free-text request

Once step 12 exits 0 and validation passes, send the project's first
free-text change request to `qfai-run`. The entry directive step 11 added to
`AGENTS.md` and `CLAUDE.md` points agents there.

A project that ran the migration under its earlier name,
`qfai-migration-spec-to-story`, continues with `qfai-migration-v1-to-v2` from
the step it reached: the plan, the ID map and the archives stay under
`.qfai/evidence/migration-spec-to-story/`. `qfai init --force` removes the host
links of the old name.
