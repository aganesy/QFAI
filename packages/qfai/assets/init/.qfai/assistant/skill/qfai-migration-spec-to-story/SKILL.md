---
name: qfai-migration-spec-to-story
title: QFAI Spec-to-Story Migration
description: "Move an existing QFAI spec-pack project to the story-based spec tree using the bundled steps."
allowed-tools: [Read, Glob, Write, Edit, Bash]
roles:
  [
    orchestrator,
    requirements-analyst,
    solution-architect,
    devops-ci-engineer,
    completion-reviewer,
    architecture-reviewer,
  ]
routing-profile: architecture-heavy
---

## /qfai-migration-spec-to-story

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Agents MUST follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
for every user question. With `--auto`, they MUST ask nothing and record
explicit assumptions in the migration report.

Read `references/migration-guide.md` before changing the project. Run this
skill from the project root, where `qfai.config.yaml` and a locally installed
`qfai` package are available. The ten scripts use the installed package. They
do not add a `qfai` subcommand or make network calls.
Complete the launcher preflight in `.qfai/assistant/rule/shared-skill-operating-baseline.md`
before running a CLI command.
Use `rule/shared-skill-delegation-baseline.md` to route the declared roles and
keep authors separate from reviewers.

### Procedure

1. Inspect the spec packs, contracts, assistant files and configured paths. If
   the project already has the story tree and no migration ID map, run the ten
   scripts to confirm their empty reports, then report that there is nothing to
   migrate. Otherwise write
   `.qfai/evidence/migration-spec-to-story/plan.yaml` with each old story's
   destination flow, any criterion whose parent story needs a judgment, and
   each old business rule's destination contract. Use the format in the guide.
2. Run steps 1 to 3 in order. For **each** step, run `--dry-run` first, inspect
   its operations and write targets, then run it without `--dry-run`. Keep the
   complete Markdown report and exit code from **every** invocation as
   migration evidence. Exit 2 stops before that step writes. Exit 3 means the
   step completed with items in `## For a person`; keep them for resolution.
3. After step 3, confirm the complete old `_policies/11_Slice-Policy.md` is
   archived and none of its sections was copied into `principle.md`. Current
   triage rules belong to `qfai-sdd/references/sdd-triage.md`. Read the five files assembled from multiple
   sources: `objective.md`, `initiative.md`, `principle.md`, `tech.md` and
   `structure.md`. Remove facts duplicated in different words. Keep the
   source files archived by the scripts.
4. Run steps 4 to 10 in order, each with `--dry-run` followed by the real run.
   Inspect and keep every report and exit code as in step 2.
5. Resolve every reported item with the person responsible for the content.
   Preserve any item the scripts could not place. After step 4 writes
   `id-map.json`, do not change `plan.yaml` to move a mapped item. Resolve
   remaining content in the new tree through `/qfai-sdd`.
6. After step 10, run `npx qfai validate` through the launcher proven by preflight. Resolve
   layout and chain errors. Use its BF, AC and EX test-obligation findings to
   finish test coverage or record a permitted decision exception.

| Step | Bundled script               | Result                                                         |
| ---- | ---------------------------- | -------------------------------------------------------------- |
| 1    | `01-rename-directories.mjs`  | Rename owned directories and update old default config paths.  |
| 2    | `02-merge-tables.mjs`        | Merge decisions, questions and change records into two tables. |
| 3    | `03-move-catalog.mjs`        | Move policy, catalog and assistant content to its new home.    |
| 4    | `04-renumber-ids.mjs`        | Build the flow and story tree and write the fixed ID map.      |
| 5    | `05-cases-to-examples.mjs`   | Convert test-case-only rows into examples.                     |
| 6    | `06-derive-ac-refs.mjs`      | Derive each example's criterion reference.                     |
| 7    | `07-rules-to-contracts.mjs`  | Put business rules in their enforcing contracts.               |
| 8    | `08-rewrite-annotations.mjs` | Rewrite resolvable test annotations.                           |
| 9    | `09-repoint-links.mjs`       | Repoint host integration links only.                           |
| 10   | `10-update-gitignore.mjs`    | Refresh only the managed `.gitignore` block.                   |

Each script is invoked as
`node <skill-dir>/scripts/<script>.mjs [--dry-run]`, with `<skill-dir>` set to
this installed skill directory. `scripts/_step.mjs` is the shared package
loader used by all ten entry points and must be shipped with them. Step 9 only
repairs links. Do not run `npx qfai init --force` during migration.

The scripts print `## Operations` even when empty. Steps 2 through 8 also print
`## For a person`; step 5 prints `## Cases to examples`; step 8 prints
`## Annotations kept`. An empty section says `none`. Rerunning a completed step
must change no file, and an interrupted step can be run again. The complete
write boundary is in `references/migration-guide.md#write-boundary`.

### Reviewer Gate

The architecture reviewer checks the old-to-new mapping and preservation of
unplaced content. The completion reviewer checks the ten reports, rerun
behavior, and validation result. Enforce the Drift Protocol and
`rule/test-layers.md` when reviewing test obligations. Counts and effort
estimates are signals, not gates. Record PASS or REVISE on the final tree.

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
- ask-user:
  - a story or rule placement that project evidence cannot settle and that is
    needed to finish migration
  - an operation beyond the declared write boundary
- hard-required:

The skill authors the plan from project evidence. It has no separate
user-supplied input that every invocation must provide.

project_memory:

- After step 4, resolve unplaced content through `/qfai-sdd` without changing the plan.
