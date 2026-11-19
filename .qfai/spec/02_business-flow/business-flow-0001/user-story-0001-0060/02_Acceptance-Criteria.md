# Acceptance Criteria

## Criteria

```gherkin
Feature: Repository links
  # AC-0001-0060-01
  Scenario: --base-url links file paths to the repository
    Given `validate.json` exists
    When `qfai report --format md --base-url https://github.com/org/repo` runs
    Then the file paths in the report link to the repository URL

  # AC-0001-0060-02
  Scenario: Diagnostic text cannot change the report's structure or links
    Given `validate.json` holds a finding whose code, message or file contains Markdown syntax
    When `qfai report --format md --base-url <url>` runs
    Then the finding renders as text and its link stays under the base URL
```
