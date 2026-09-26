# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0130-01
# Parent: US-0001-0130
Scenario: SAFE_LITERALS covers CSS-wide keywords
  Given a declaration whose value is any of `inherit`, `initial`, `unset`, `revert`, `currentColor`,
  When any of the four scanners (`scanColors` / `scanFonts` / `scanRadius` / `scanShadow`) inspects the declaration,
  Then `designMdViolations[]` MUST NOT contain an entry naming that keyword.
  And the unit test matrix MUST assert `5 keywords × 4 scanners = 20` pass cells.
```
