# Acceptance Criteria

## Criteria

```gherkin
Feature: Internal validation run
  # AC-0001-0061-01
  Scenario: --run-validate runs validation internally
    Given a spec structure exists, and no `validate.json` is needed
    When `qfai report --run-validate` runs
    Then validation runs internally, and the report is built from its result
    And `validate.json` is updated too

  # AC-0001-0061-02
  Scenario: A narrow profile in CI is reported, not fatal
    Given a CI environment and a story tree
    When `qfai report --run-validate --profile atdd` runs
    Then the written validate result carries `QFAI-VALIDATE-017` at warning, and the report warns that a full scan is still needed
    And that finding alone does not make the exit code non-zero
```
