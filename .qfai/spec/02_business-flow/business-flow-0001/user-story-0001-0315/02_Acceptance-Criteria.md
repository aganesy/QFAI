# Acceptance Criteria

## Criteria

```gherkin
Feature: A refused argument shows the command's own usage, not the whole help
  # AC-0001-0315-01
  Scenario: A refused argument of a known command prints that command's usage lines
    Given a qfai command name the CLI knows
    When the CLI refuses one of its arguments, such as a missing value, an unknown option or a missing subcommand
    Then stderr carries the reason, as before
    And stdout carries the usage lines of that command, narrowed to the subcommand when one was given, and one line pointing to `qfai --help`
    And the exit code is the argument-error code, as before
    And `--help`, a missing command and an unknown command name still print the whole help
```
