# Acceptance Criteria

## Criteria

```gherkin
Feature: Deterministic design-token violation scan
  # AC-0001-0113-01
  Scenario: Token mismatch blocks convergence
    Given root `DESIGN.md` declares color, font, radius, and shadow tokens
    When `findDesignMdViolations` scans the prototype HTML body
    Then it reports a deterministic violation for any disallowed value in those categories
    And a non-empty `designMdViolations[]` blocks convergence for the affected UI contract screen

  # AC-0001-0113-02
  Scenario: Allowed token use passes the scan
    Given the prototype HTML body uses only declared tokens and allowed literals
    When `findDesignMdViolations` scans it
    Then `designMdViolations[]` is empty
```
