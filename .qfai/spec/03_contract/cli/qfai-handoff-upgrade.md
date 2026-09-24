# CLI Contract: `qfai handoff upgrade`

- Contract scope: the public legacy-handoff conversion command
- Owning spec: `spec-0015`
- Used-by: operators migrating a legacy handoff
- SSOT modules: `packages/qfai/src/cli/commands/handoffUpgrade.ts` and `packages/qfai/src/core/handoff/`

## Command surface

`qfai handoff upgrade <legacy-file>` converts a legacy handoff to the
canonical `.qfai/handoff.yaml`. The original fields are preserved under a
`legacy:` key so conversion does not discard information. `--dry-run` reports
the intended operation without writing. `--force` may replace an existing
canonical handoff only after saving its previous contents to a timestamped
backup. An unreadable or empty input is refused before the output changes.
A nonempty legacy body that does not parse as an object retains its raw text
under `legacy.__legacy_raw__`. The canonical handoff schema, rather than this
adapter, owns the fields read by downstream skills.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                  | Examples        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| BR-0356 | `qfai handoff upgrade` lossless legacy adapter - `qfai handoff upgrade <legacy-file>` (SHOULD) accepts a legacy handoff file and emits a conforming `handoff.yaml` (CLI-HANDOFF) at the canonical path. - The helper MUST preserve all original fields under a `legacy:` key to avoid data loss. - SHOULD-level per the v1.9.1 `qfai prototyping upgrade-{config,json}` precedent (closed OQ-0120 / 0121). | EX-0001-0180-01 |
