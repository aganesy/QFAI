# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- `qfai validate` checks schema, evidence, and canonical validator rules.

## BR-0004-0002: UI Evidence Is Screen-Scoped

- Validation of prototyping evidence is keyed by declared screen IDs from canonical screen contracts.

## BR-0004-0003: Missing Screenshot

- Missing screenshot evidence emits `QFAI-UIE-001`.

## BR-0004-0004: Missing HTML

- Missing HTML snapshot evidence emits `QFAI-UIE-002`.

## BR-0004-0005: Safe Skip Without Screen Contract

- If no canonical screen contract is available, the UI evidence artifact validator skips instead of over-firing.

## BR-0004-0006: Legacy Validator Slices

- Legacy design-system or artifact validators may remain in validate while corresponding code still exists.
- They do not redefine the current public execution model.
