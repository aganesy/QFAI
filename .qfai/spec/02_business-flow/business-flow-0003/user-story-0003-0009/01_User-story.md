# US-0003-0009: doctor --autoremediate mode

## User Story

As an operator, I want `qfai doctor --autoremediate` to fix what it safely can — installing a skill manifest's `runtimeDependencies`, TTL-archiving stale review packs as `--clean` does, and writing missing default-keyed fields into `qfai.config.yaml` — behind a `--yes` confirmation, with `--dry-run` previewing without side effects and the mode off by default in CI, so that routine environment repairs need no manual steps and never happen by surprise.

## Non-goals

- Rewriting fields that are not default-keyed.
- Overwriting user-authored config values.
- Installing anything implicitly in CI.
