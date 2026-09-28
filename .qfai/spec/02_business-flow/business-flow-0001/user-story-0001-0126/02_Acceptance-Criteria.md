# Acceptance Criteria

## Criteria

```gherkin
Feature: Safe CSS-wide keywords
  # AC-0001-0126-01
  Scenario: SAFE_LITERALS covers CSS-wide keywords
    Given a declaration whose value is any of `inherit`, `initial`, `unset`, `revert`, `currentColor`,
    When any of the four scanners (`scanColors` / `scanFonts` / `scanRadius` / `scanShadow`) inspects the declaration,
    Then `designMdViolations[]` MUST NOT contain an entry naming that keyword.
    And the unit test matrix MUST assert `5 keywords × 4 scanners = 20` pass cells.
```
