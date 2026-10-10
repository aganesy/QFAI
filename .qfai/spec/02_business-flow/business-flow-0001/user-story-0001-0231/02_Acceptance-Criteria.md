# Acceptance Criteria

## Criteria

```gherkin
Feature: Send session feedback to QFAI when the work is complete
  # AC-0001-0231-01
  Scenario: Init installs the stop-time group in both hook files
    Given a fresh project, or a project whose hook files an earlier release wrote without it
    When `qfai init` runs
    Then `.claude/settings.json` and `.codex/hooks.json` each carry one `Stop` group marked `QFAI session feedback reminder`
    And the group is appended after the project's own `Stop` groups in each file, and nothing the project wrote is reordered or removed
    And `.agents/rules/reminders.json` carries the `session-feedback` message the group prints

  # AC-0001-0231-02
  Scenario: The group blocks a stop once, and only where the turn is not already a pause
    Given the hook receives the input of a turn that is ending
    When no stop hook is already continuing the turn and the last assistant message does not end in a question mark, ASCII or fullwidth
    Then it prints the `session-feedback` message as a decision that blocks the stop, the same in both hook files
    And when a stop hook is already continuing the turn, or the last message ends in either question mark, it prints nothing
    And when its input cannot be read, or the message file or the key is missing, it prints nothing
    And in every case it exits 0

  # AC-0001-0231-03
  Scenario: A complete session is reviewed, and nothing is filed without a yes
    Given the agent reads the `session-feedback` message at the end of a turn
    When every task the user gave this session is complete and nothing waits on the user
    Then the agent reviews the whole session for blockers, structural problems and contradictions, lost efficiency, tokens spent against output, poor value, over-work, and quality that missed the user's request, where QFAI's own rules, skills, steps, commands, hooks or documents caused them
    And it drafts one issue per problem, free of the project's names, source, secrets and personal data, so that a public repository receives nothing the project did not mean to share
    And it asks the user through the structured question tool whether to file, showing each draft
    And it files to the QFAI repository only the drafts the user approved

  # AC-0001-0231-04
  Scenario: The agent declines the review at a pause and where the user cannot be asked
    Given the agent reads the `session-feedback` message at the end of a turn
    When any task the user gave is unfinished, or the turn waits on the user, or the review already ran after the user's latest instruction
    Then the agent ends the turn with one short line and reviews nothing
    And when the run is under a no-question mode, it asks nothing, files nothing, and puts the drafts in its final report

  # AC-0001-0231-05
  Scenario: The rule ships and the entry points cite it
    Given a project initialised by `qfai init`
    When an agent reads `AGENTS.md`, `CLAUDE.md` or the Copilot instructions
    Then each cites `.agents/rules/session-feedback.md`
    And the rule master is under `.agents/rules/` with the same text the package carries
```
