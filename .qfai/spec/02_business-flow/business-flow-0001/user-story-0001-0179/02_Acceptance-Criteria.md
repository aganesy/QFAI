# Acceptance Criteria

## Criteria

```gherkin
Feature: `qfai audit log` CLI surface

# AC-0001-0179-01
# Parent: US-0001-0179
Scenario: `qfai audit log` lists and filters decision records
  Given `.qfai/evidence/decision/<ts>.json` records exist,
  When `qfai audit log` runs,
  Then it lists the records newest-first and supports `--scope`, `--operator`, and `--clause` (filtering on `envelopeContractClause`) plus `--format table|json` defaulting to `table`, per DR-0271 (CLI-AUDIT). Because `.qfai/evidence/decision/` is human-readable JSON, the CLI is SHOULD-level (ergonomic, not a hard requirement).
```
