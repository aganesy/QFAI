# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- AC-Refs: AC-0004-0001
- `qfai validate` checks schema, evidence, and canonical validator rules.

## BR-0004-0002: UI Evidence Is Screen-Scoped

- AC-Refs: AC-0004-0002
- Validation of prototyping evidence is keyed by declared screen IDs from canonical screen contracts.

## BR-0004-0003: Missing Screenshot

- AC-Refs: AC-0004-0003
- Missing screenshot evidence emits `QFAI-UIE-001`.

## BR-0004-0004: Missing HTML

- AC-Refs: AC-0004-0004
- Missing HTML snapshot evidence emits `QFAI-UIE-002`.

## BR-0004-0005: Safe Skip Without Screen Contract

- AC-Refs: AC-0004-0005
- If no canonical screen contract is available, the UI evidence artifact validator skips instead of over-firing.

## BR-0004-0006: Skill Contract Validator

- AC-Refs: AC-0004-0006
- The prototyping skill validator checks current section presence, canonical evidence paths, and CLI-removal wording.

## BR-0004-0007: Legacy Validator Slices

- AC-Refs: AC-0004-0007
- Legacy design-system or artifact validators may remain in validate while corresponding code still exists.
- They do not redefine the current public execution model.
