# Acceptance Criteria

## Criteria

```gherkin
Feature: A refused argument shows the command's own usage, not the whole help
  # AC-0001-0315-01
  Scenario: Output and exit status follow the flags for help and argument refusal
    Given a qfai invocation using the general help and usage format
    When an argument is refused, the command name is missing or unknown, or the invocation requests help
    Then `--version` or `-V` prints only the version on stdout, leaves stderr empty, and exits 0, even when help is requested
    And with no version flag, a refusal writes the reason to stderr and exits 2
    And with no version flag, an explicit `--help` or `-h` prints the whole help on stdout
    And with neither a version flag nor a help flag, a known command that refuses an argument prints only its usage lines on stdout, narrowed to the subcommand when one was given, and one line pointing to `qfai --help`
    And with no version flag, a missing or unknown command name prints the whole help
```
