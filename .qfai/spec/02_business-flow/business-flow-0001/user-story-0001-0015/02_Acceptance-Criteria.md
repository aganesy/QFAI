# Acceptance Criteria

## Criteria

```gherkin
Feature: UI-bearing detection

# AC-0001-0015-01
# Parent: US-0001-0015
Scenario: prototyping.yaml is optional for a pack with a visual prototyping surface
  Given the shipped discussion README and skill contract
  When their wording for `prototyping.yaml` is inspected
  Then they offer it as optional to a pack whose surfaces include web, mobile, desktop or mixed
  And they say a cli-only pack carries none
```
