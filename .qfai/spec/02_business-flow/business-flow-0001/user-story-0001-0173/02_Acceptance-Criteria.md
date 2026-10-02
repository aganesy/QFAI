# Acceptance Criteria

## Criteria

```gherkin
Feature: `qfai audit log` CLI surface
  # AC-0001-0173-01
  Scenario: `qfai audit log` lists and filters decision records
    Given `.qfai/evidence/decision/<ts>.json` records exist,
    When `qfai audit log` runs,
    Then it lists the records newest-first and supports `--scope`, `--operator`, and `--clause` (filtering on `envelopeContractClause`) plus `--format table|json` defaulting to `table`, per DR-0271 (CLI-0006). Because `.qfai/evidence/decision/` is human-readable JSON, the CLI is SHOULD-level (ergonomic, not a hard requirement).
```
