# Acceptance Criteria

## Criteria

```gherkin
Feature: SaaS package validation profile
  # AC-0001-0049-01
  Scenario: The saas-package profile passes on its three conditions and names each skipped gate
    Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with a root `DESIGN.md` that parses as the design-system attestation and a `.qfai/prototype/final/handoff.json` that conforms to the CLI-HANDOFF schema
    When `qfai validate --profile saas-package` runs
    Then validate PASSes; the ATDD / implement-class gates are SKIPPED and each skip is surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate
    And when any of the three required conditions fails (prototyping-profile fails, root `DESIGN.md` absent or unparseable, or CLI-HANDOFF schema fails), `qfai validate --profile saas-package` does NOT PASS
```
