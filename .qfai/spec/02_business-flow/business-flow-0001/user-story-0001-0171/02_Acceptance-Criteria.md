# Acceptance Criteria

## Criteria

```gherkin
Feature: Pattern-Doubler Reviewer

# AC-0001-0171-01
# Parent: US-0001-0171
Scenario: Concrete additions have rationale without a numeric target
  Given optional advisory pattern review of concrete behavior
  When the mode proposes additions
  Then each addition concerns business-flow, US, AC, EX or TC coverage
  And each addition includes a rationale
  And no numeric growth target is required

# AC-0001-0171-02
# Parent: US-0001-0171
Scenario: Abstract-only artifacts do not require more patterns
  Given an empty artifact or only BR, NFR, policy, decision or architectural items
  When optional pattern review evaluates the artifact
  Then the mode returns N/A even if those items carry IDs
  And no increase in abstract items is required
  And missing mandatory pairings and independently required obligations and gates remain required
```
