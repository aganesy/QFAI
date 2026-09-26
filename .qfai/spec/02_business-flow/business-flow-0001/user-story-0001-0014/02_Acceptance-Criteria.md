# Acceptance Criteria

## Criteria

```gherkin
Feature: OQ-driven discussion completion

# AC-0001-0014-01
# Parent: US-0001-0014
Scenario: Open questions block discussion completion
  Given the discussion pack's `11_OQ-Register.md` contains an item with `Disposition: open`
  When `/qfai-discussion` evaluates completion
  Then the pack remains incomplete and names the open item
  And a deferred item is accepted only when `13_Deferred.md` records its disposition details
```
