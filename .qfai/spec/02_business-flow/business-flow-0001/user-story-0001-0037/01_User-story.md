# US-0001-0037: legacy layout past its sunset

## User Story

As an operator of a project still on the legacy `.qfai/assistant/instructions/` layout, I want `qfai init` without a flag to keep my files and report the layout as a `QFAI-DEPRECATED-001` error on stderr that names the v1.10.0 sunset and `qfai init --upgrade-assistant-tree`, so that I know the compatibility window has closed and how to migrate.

## Non-goals

- Writing the legacy layout on any write path.
