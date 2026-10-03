# Acceptance Criteria

## Criteria

```gherkin
Feature: Repository links
  # AC-0001-0060-01
  Scenario: --base-url links file paths to the repository
    Given `validate.json` exists
    When `qfai report --format md --base-url https://github.com/org/repo` runs
    Then the file paths in the report link to the repository URL
```
