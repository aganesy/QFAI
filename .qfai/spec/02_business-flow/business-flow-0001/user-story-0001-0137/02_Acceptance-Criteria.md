# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping-phase certification check
  # AC-0001-0137-01
  Scenario: Self-completable certify via verify.json#scope
    Given a `verify.json` carrying `scope: "prototyping"`,
    When `qfai prototyping certify --check` runs,
    Then certify MUST return exit 0 WITHOUT requiring `/qfai-atdd` or `/qfai-implement` artifacts.
    And the resulting `completion-certificate.json` MUST explicitly record `scope: "prototyping"` and MUST NOT claim full DONE.
    And Reviewer-Gate finding `R-CERTIFY-VERIFY-CIRCULAR` (severity: error) MUST fire when a future PR reintroduces the cycle "certify requires full verify PASS AND full verify requires ATDD/implement artifacts".
```
