# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a typo directly

# AC-0001-0198-01
# Parent: US-0001-0198
Scenario: A typo is fixed through the direct route
  Given a change confirmed to alter no behaviour, story, setting or contract
  When the run routes it
  Then `qfai-maintain` makes the edit inside the scope and returns the diff, the no-behaviour-change judgement, an independent review and the lint and link checks
  And a full verify follows

# AC-0001-0198-02
# Parent: US-0001-0198
Scenario: Excluded changes never take the direct route
  Given a change to a dependency, a workflow file, an authorization condition, an environment setting, SQL, a generated file, a normative README command, or QFAI's own skills or rules
  When the run routes it
  Then the route is not `direct`
  And a semantic effect found during a direct change reclassifies the run before the edit
```
