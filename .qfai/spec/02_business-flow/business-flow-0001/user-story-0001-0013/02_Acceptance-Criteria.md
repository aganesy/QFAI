# Acceptance Criteria

## Criteria

```gherkin
Feature: 15-file discussion-pack structure
  # AC-0001-0013-01
  Scenario: The discussion pack holds the 15 required files
    Given a discussion-pack directory
    When its required files are checked
    Then the 15 files from `01_Context.md` to `99_delta.md` exist
```
