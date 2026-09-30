# Acceptance Criteria

## Criteria

```gherkin
Feature: Git symlink setting and Windows support
  # AC-0001-0028-01
  Scenario: Init enables core.symlinks inside a Git repository
    Given `qfai init` runs
    When init starts
    Then inside a Git repository it runs `git config core.symlinks true`
    And outside a Git repository it changes no `core.symlinks` setting

  # AC-0001-0028-02
  Scenario: A failed symlink on Windows stops init with Developer Mode guidance
    Given a Windows machine with Developer Mode disabled
    When `qfai init` tries to create a symlink
    Then an error message is shown that explains how to enable Developer Mode
    And the run stops
```
