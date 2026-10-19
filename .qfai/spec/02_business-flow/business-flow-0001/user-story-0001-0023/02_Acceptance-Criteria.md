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

  # AC-0001-0023-02
  Scenario: A forced dry run gives each path its state
    Given an initialized project
    When `qfai init --force --dry-run --verbose` runs
    Then each path it lists carries its state
    And no file is written
```
