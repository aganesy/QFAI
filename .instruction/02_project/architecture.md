---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Project Structure (QFAI Toolkit)

QFAI Toolkit is a monorepo that distributes the CLI and the validation engine as a single package.

## Repository Overview

- `packages/qfai/`: the CLI and core (published to npm)
- `packages/qfai/assets/init/`: the `qfai init` templates (`.qfai/`, `qfai.config.yaml` and others)
- `packages/qfai/assets/mdschema/` and `packages/qfai/assets/scripts/`: the
  document schemas and the checkers that run them, shipped with the package
- `packages/qfai/docs/`: design notes and the finding-code reference. Not shipped,
  except `docs/MIGRATION-2.0.0.md`, the migration guide that the package `files`
  list publishes with the CLI.
- `.agents/rules/`: the rule masters every assistant follows.
- `scripts/`: the lint and guard scripts the quality gate runs.
- `packages/qfai/tests/`: package tests, including this repository's integration and asset guards.
- `tmp/`: scratch directory (not a deliverable)

## Layout of packages/qfai

```
packages/qfai/
  src/
    cli/
      main.ts     # parses the arguments and dispatches to one command
      commands/   # init, validate, report, doctor, workflow, catalog, sdd (preflight,
                  # next-id, merge-docs), atdd, db-drift, session-review
      lib/        # shared code such as args, exit codes and fail-on
      graphCli.ts # entry of the installed graph CLI (dist/graph/cli)
      turnEndHook.ts # entry of the turn-end hook `qfai init` installs (dist/hook/turn-end)
    core/
      validators/ # one module per check, re-exported from validators/index.ts
      storyTree/  # story-tree layout, IDs, tables and contract-rule parsing
      parse/      # Markdown and design-token parsing (markdown.ts, designToken.ts)
  assets/
    init/         # init templates
  tests/
    cli/          # CLI tests
    core/         # core validation tests
```

## Execution Flow

The command names are the `KNOWN_COMMANDS` set in `packages/qfai/src/cli/main.ts`, and the usage
text in the same file says what each does; read it before relying on this list.

- `qfai init` generates the templates by copying `packages/qfai/assets/init/`
- `qfai validate` aggregates `core/validators` and writes `validate.json` at `output.validateJsonPath`
  (`.qfai/report/validate.json` by default)
- `qfai report` reads that `validate.json` (or the file `--in` names), or runs the validation itself
  with `--run-validate`, and writes `report.md` (or `report.json` with `--format json`) under
  `paths.outDir` (`.qfai/report/` by default) unless `--out` names another file
- `qfai doctor` diagnoses the configuration, the paths and the output preconditions
- `qfai workflow plan` prints, as one JSON document, the route plan the `qfai-run` skill follows
- `qfai sdd preflight`, `sdd next-id` and `sdd merge-docs` serve the `qfai-sdd` skill: the Stage 0
  gate, the next free story-tree ID, and the merge of conflicted story-tree documents
- `qfai atdd scaffold` generates test skeletons for a story's ACs or for a flow
- `qfai catalog components` and `qfai catalog design` write the project's component and design
  catalogs, or with `--check` compare them and write nothing
- `qfai db-drift` compares the DB contracts with the migrations as schemas
- `qfai session-review` prints counts from this project's local agent transcripts
