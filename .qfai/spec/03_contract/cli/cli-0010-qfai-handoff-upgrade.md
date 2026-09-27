# CLI-0010: `qfai handoff upgrade`

## Ownership boundary

This contract decides how `qfai handoff upgrade <legacy-file>` turns a legacy handoff file into the canonical `.qfai/handoff.yaml`, when it may replace an existing canonical handoff, and what it does on a dry run.

The fields of the canonical handoff, and which of them downstream skills read, are decided by the canonical handoff schema the package ships, not by this adapter.

## Business rules

| BR-ID        | Statement                                                                                                                                                                                                                                                                                                                                                                                                           | Examples        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| BR-0010-0001 | `qfai handoff upgrade <legacy-file>` accepts a legacy handoff file and writes a conforming `handoff.yaml` at the canonical path. It keeps every original field under a `legacy:` key, so the conversion loses nothing, and a nonempty legacy body that does not parse as an object is kept as text under `legacy.__legacy_raw__`. The command is a convenience for migrating a legacy handoff, not a required step. | EX-0001-0180-01 |
| BR-0010-0002 | An existing canonical handoff is replaced only under `--force`, and only after its previous contents are saved to a timestamped backup beside it. Without `--force` the command refuses, exits 1 and leaves the existing file unchanged.                                                                                                                                                                            | EX-0001-0180-02 |
| BR-0010-0003 | `--dry-run` reports the operation the command would perform, or the refusal it would meet, and writes nothing, with or without `--force`.                                                                                                                                                                                                                                                                           | EX-0001-0180-03 |
| BR-0010-0004 | A legacy file that cannot be read, or is empty, is refused before any output changes, and an existing canonical handoff stays as it was.                                                                                                                                                                                                                                                                            | EX-0001-0180-04 |
