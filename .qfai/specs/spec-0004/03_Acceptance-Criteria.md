# 03 Acceptance Criteria

- `qfai validate` runs deterministic validators and aggregates issues.
- The canonical UIX validator set remains the production path.
- `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence.
- `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence.
- If no screen contract exists, the UI evidence validator skips without error.
- The prototyping skill validator confirms current skill sections, evidence paths, and CLI-removal wording.
- Legacy artifact validators may still exist, but they are treated as validator slices rather than proof of a public runtime surface.
