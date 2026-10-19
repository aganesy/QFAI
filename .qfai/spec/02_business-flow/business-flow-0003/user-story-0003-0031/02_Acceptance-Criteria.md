# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped assistant file checks
  # AC-0003-0031-01
  Scenario: A shipped assistant file that differs from the shipped text is reported
    Given a project whose `.qfai/assistant/` holds a shipped file whose text differs from the copy in the package, one that matches it, one that matches it apart from line endings, a shipped file that is not installed, and files the package does not ship: a `rule/*.local.md` overlay, an agent the project added and a `skill.local/` skill
    When `qfai doctor` runs
    Then each differing file is a `warning` and never an `error`, naming the installed file, the packaged file and `qfai init --force`
    And a matching file, one that differs only in line endings, an absent one and a file the package does not ship raise no finding
    And doctor writes no assistant file

  # AC-0003-0031-02
  Scenario: An assistant tree written by another release is reported
    Given a project whose `.qfai/assistant/VERSION` records a release other than the installed qfai, or is missing
    When `qfai doctor` runs
    Then one `assistant.version` check is a `warning` that names the recorded and the running version and the repair
    And a version file that records the installed qfai raises no such check
    And doctor writes no assistant file
```
