# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0004-0002-01
# Parent: US-0004-0002
Scenario: AC-0004-0002-01
  Given a project whose `paths.specsDir`, or the former default `.qfai/specs/`, holds a `spec-*/` or `_policies/` directory
  When `qfai validate` runs under any profile
  Then one error states, in one sentence, the path that holds the old layout and `/qfai-migration-v1-to-v2`
  And no story-tree finding family reports anything in that run
```
