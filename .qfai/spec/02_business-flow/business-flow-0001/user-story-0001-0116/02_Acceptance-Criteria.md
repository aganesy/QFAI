# Acceptance Criteria

## Criteria

```gherkin
Feature: Deterministic DESIGN.md token scan

# AC-0001-0116-01
# Parent: US-0001-0116
Scenario: Token mismatch blocks convergence
  Given root `DESIGN.md` declares color, font, radius, and shadow tokens
  When `findDesignMdViolations` scans the prototype HTML body
  Then it reports a deterministic violation for any disallowed value in those categories
  And a non-empty `designMdViolations[]` blocks convergence for the affected UI contract screen

Scenario: Allowed token use passes the scan
  Given the prototype HTML body uses only declared tokens and allowed literals
  When `findDesignMdViolations` scans it
  Then `designMdViolations[]` is empty
```
