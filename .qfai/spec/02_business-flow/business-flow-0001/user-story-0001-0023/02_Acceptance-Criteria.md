# Acceptance Criteria

## Criteria

```gherkin
Feature: Dry run
  # AC-0001-0023-01
  Scenario: `--dry-run` previews the changes
    Given an empty project directory
    When `qfai init --dry-run` runs
    Then the files it would create are listed
    And no file is actually created
```
