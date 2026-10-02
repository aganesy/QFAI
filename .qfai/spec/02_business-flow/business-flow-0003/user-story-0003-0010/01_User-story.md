# US-0003-0010: per-skill manifest runtimeDependencies probe

## User Story

As an operator, I want `qfai doctor --profile <skill>` to read `<paths.skillsDir>/<skill>/manifest.json` and probe `node_modules` for each `runtimeDependencies` entry, reporting a missing dependency with its install command and leaving an empty list unprobed, so that I learn what a skill needs before it fails without seeing false positives.

## Non-goals

- Authoring the manifest schema or linting it on the distribution side.
- Installing dependencies automatically, which `--autoremediate` owns.
