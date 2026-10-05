# Acceptance Criteria

## Criteria

```gherkin
Feature: See the files an earlier release left behind
  # AC-0001-0227-01
  Scenario: Init lists each leftover path and deletes none
    Given a project holding paths an earlier release wrote and this release no longer uses
    When `npx qfai init` runs
    Then its summary lists each such path that exists
    And every listed path stays on disk

  # AC-0001-0227-02
  Scenario: The migration's folder is marked on its own
    Given a project holding `.qfai/evidence/migration-spec-to-story/`
    When `npx qfai init` runs
    Then it lists that folder on its own line, saying it may hold the only copy of content the 1.x migration retired

  # AC-0001-0227-03
  Scenario: Nothing left over, nothing listed
    Given a project holding none of those paths
    When `npx qfai init` runs
    Then no leftover line is printed
```
