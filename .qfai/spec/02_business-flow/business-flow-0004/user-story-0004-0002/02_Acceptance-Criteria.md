# Acceptance Criteria

## Criteria

```gherkin
Feature: Old spec-layout migration error
  # AC-0004-0002-01
  Scenario: An old spec layout raises one migration error
    Given a project whose `paths.specsDir`, or the former default `.qfai/specs/`, holds a `spec-*/` or `_policies/` directory
    When `qfai validate` runs under any profile
    Then one error names the path that holds the old layout
    And it lists, one per line, each file that remains under the `spec-*/` and `_policies/` directories of that path
    And its last line names `/qfai-migration-v1-to-v2` and `/qfai-sdd`
    And no story-tree finding family reports anything in that run
```
