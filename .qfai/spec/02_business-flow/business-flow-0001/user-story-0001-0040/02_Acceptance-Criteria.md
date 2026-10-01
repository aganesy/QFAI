# Acceptance Criteria

## Criteria

```gherkin
Feature: Declared screen evidence validation
  # AC-0001-0040-01
  Scenario: Missing screenshot evidence raises QFAI-UIE-001
    Given a declared screen has no screenshot evidence
    When the UI evidence validator runs
    Then `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence, under the `prototyping` and `saas-package` profiles and under `full` and `verify` when `.qfai/evidence/prototyping/` exists.

  # AC-0001-0040-02
  Scenario: Missing HTML snapshot evidence raises QFAI-UIE-002
    Given a declared screen has no HTML snapshot evidence
    When the UI evidence validator runs
    Then `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence, under the `prototyping` and `saas-package` profiles and under `full` and `verify` when `.qfai/evidence/prototyping/` exists.

  # AC-0001-0040-03
  Scenario: No screen contract means no UI evidence finding
    Given no screen contract exists
    When the UI evidence validator runs
    Then the UI evidence validator skips without error.

  # AC-0001-0040-04
  Scenario: No evidence directory means the presence checks stay silent in full and verify
    Given a declared screen and no `.qfai/evidence/prototyping/` directory
    When `qfai validate` runs the `full` or `verify` profile
    Then `QFAI-PROT-001` for a missing `prototyping.json`, `QFAI-UIE-001` and `QFAI-UIE-002` are not reported, and the `prototyping` and `saas-package` profiles still report them.
```
