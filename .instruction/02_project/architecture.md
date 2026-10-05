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
- `packages/qfai/docs/`: design notes and the finding-code reference. Not shipped.
- `.agents/rules/`: the rule masters every assistant follows.
- `scripts/`: the lint and guard scripts the quality gate runs.
- `packages/qfai/tests/`: package tests, including this repository's integration and asset guards.
- `tmp/`: scratch directory (not a deliverable)

## Layout of packages/qfai

```
packages/qfai/
  src/
    cli/
      commands/   # init / validate / report
      lib/        # shared code such as args and logger
    core/
      validators/ # spec/delta/scenario/contracts/traceability/ids
      parse/      # parsing of spec/delta/scenario
      gherkin/    # Gherkin model helpers
  assets/
    init/         # init templates
  tests/
    cli/          # CLI tests
    core/         # core validation tests
```

## Execution Flow

- `qfai init` generates the templates by copying `packages/qfai/assets/init/`
- `qfai validate` aggregates `core/validators` and writes `.qfai/report/validate.json`
- `qfai report` reads `validate.json` and generates Markdown/JSON
