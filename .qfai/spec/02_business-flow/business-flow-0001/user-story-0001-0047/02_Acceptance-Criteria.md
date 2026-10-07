# Acceptance Criteria

## Criteria

```gherkin
Feature: Profile-specific validation reports
  # AC-0001-0047-01
  Scenario: Each profile writes its own report
    Given a `qfai validate --profile prototyping` run immediately followed by a `qfai validate --profile tdd` run in the same working tree
    When the two runs complete
    Then `.qfai/report/validate-prototyping.json` and `.qfai/report/validate-tdd.json` both exist with mutually independent contents (neither overwritten by the other); `.qfai/report/validate.json` reflects only the most recent run and carries an explicit top-level `profile` field naming that run's profile
```
