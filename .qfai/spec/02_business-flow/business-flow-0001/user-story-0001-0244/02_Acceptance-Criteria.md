# Acceptance Criteria

## Criteria

```gherkin
Feature: Keep an agent's turn going while a turn-end check fails

  # AC-0001-0244-01
  Scenario: A failing turn-end check continues the turn
    Given a project whose tech.md marks Standard commands for turn end and whose host runs the Stop hook qfai init installs
    When the agent ends a turn or a subagent ends its work and a marked command fails
    Then the hook blocks the stop with a reason naming the command, its exit and the end of its output

  # AC-0001-0244-02
  Scenario: Passing or absent checks let the turn end
    Given a project whose marked commands all pass, or that marks none
    When the agent ends a turn
    Then the hook lets the turn end and prints nothing

  # AC-0001-0244-03
  Scenario: A repeated failure lets the turn end
    Given the hook blocked a stop on a failure
    When the agent ends the turn again and the same failure is seen, or the hook would block a fourth time in a row
    Then the hook lets the turn end and tells the user which check still fails and how to run it

  # AC-0001-0244-04
  Scenario: A project turns the hook off
    Given `workflow.stopGate` in qfai.config.yaml
    When the value is false, or is not a boolean
    Then the hook runs no command, and qfai validate reports a value that is not a boolean

  # AC-0001-0244-05
  Scenario: qfai init installs the hook
    Given an empty directory, or a project whose host hook files lack the Stop hook
    When qfai init runs
    Then .claude/settings.json and .codex/hooks.json carry the Stop and SubagentStop groups, merged the way the reminder groups merge
```
