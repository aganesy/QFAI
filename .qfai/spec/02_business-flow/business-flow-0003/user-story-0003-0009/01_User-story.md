# US-0003-0009: doctor --autoremediate mode

## User Story

As an operator, I want `qfai doctor --autoremediate` to fix what it safely can — installing a skill manifest's `runtimeDependencies`, refreshing the managed `.gitignore` block and pruning stale run logs as `--clean` does — behind a `--yes` confirmation, with `--dry-run` previewing without side effects and the mode off by default in CI, so that routine environment repairs need no manual steps and never happen by surprise.

## Non-goals

- Writing to `qfai.config.yaml`.
- Installing anything implicitly in CI.
