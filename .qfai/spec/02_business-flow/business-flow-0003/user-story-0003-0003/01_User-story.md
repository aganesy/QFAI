# US-0003-0003: Path resolution diagnosis

## User Story

As an operator, I want `qfai doctor` to check that each path in the configuration file (`testsDir`, `outDir` and the like) resolves, so that a path pointing nowhere is reported before a command relies on it.

## Non-goals

- Correcting paths automatically.
