# Acceptance Criteria

## Criteria

```gherkin
Feature: Profile-specific validation reports
  # AC-0001-0049-01
  Scenario: Each profile writes its own report
    Given a `qfai validate --profile prototyping` run immediately followed by a `qfai validate --profile tdd` run in the same working tree
    When the two runs complete
    Then `.qfai/report/validate-prototyping.json` and `.qfai/report/validate-tdd.json` both exist with mutually independent contents (neither overwritten by the other); `.qfai/report/validate.json` reflects only the most recent run and carries an explicit top-level `profile` field naming that run's profile

  # AC-0001-0049-02
  Scenario: The legacy output path is deprecated, then retired
    Given a downstream project that still reads from the legacy `.qfai/output/validate.json` path
    When `qfai validate` runs during the deprecation window (current minor)
    Then the legacy path continues to receive a copy of the latest validate JSON and `D-DEPRECATED-PATH` is emitted at severity warning naming the sunset version `1.10.0` (literal string in the message body)
    And at sunset (when the running tool reaches the named version), the same condition escalates to severity error and the legacy path is no longer written

  # AC-0001-0049-03
  Scenario: Certify reads its profile report
    Given a prototyping-profile report and a newer tdd-profile report both exist
    When `qfai prototyping certify` checks validation evidence
    Then it reads `validate-prototyping.json` and does not accept the newer tdd-profile `validate.json` pointer as its gate result
```
