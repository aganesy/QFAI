# US-0001-0171: Cross-skill `handoff.yaml` schema

## User Story

As a QFAI maintainer, I want a single canonical cross-skill handoff schema (`packages/qfai/src/core/schemas/handoff.ts`, documented in `references/handoff.md`) that every skill producing or consuming handoff state reads and writes, with a Reviewer Gate emitting `QFAI-HANDOFF-001` (severity error) on non-conforming writes or on edits to the schema that its writers do not follow, so that handoff state stops fragmenting into ad-hoc per-skill files.
