# Acceptance Criteria

## Criteria

```gherkin
Feature: Send session feedback to QFAI when the work is complete
  # AC-0001-0231-01
  Scenario: Init installs no stop-time group, so an ordinary turn end costs nothing
    Given a fresh project, or a project whose hook files already hold its own `Stop` groups
    When `qfai init` runs
    Then neither `.claude/settings.json` nor `.codex/hooks.json` receives a `Stop` group from QFAI
    And the project's own `Stop` groups stay as they were, and nothing the project wrote is reordered or removed

  # AC-0001-0231-03
  Scenario: A complete session is reviewed, and nothing is filed without a yes
    Given the agent follows `.agents/rules/session-feedback.md`
    When every task the user gave this session is complete and nothing waits on the user
    Then the agent reviews the whole session for blockers, structural problems and contradictions, lost efficiency, tokens spent against output, poor value, over-work, and quality that missed the user's request, where QFAI's own rules, skills, steps, commands, hooks or documents caused them
    And it drafts one issue per problem, free of the project's names, source, secrets and personal data, so that a public repository receives nothing the project did not mean to share
    And it asks the user through the structured question tool whether to file, showing each draft
    And it files to the QFAI repository only the drafts the user approved

  # AC-0001-0231-04
  Scenario: The agent declines the review at a pause and where the user cannot be asked
    Given the agent reaches the end of a turn or a final report
    When any task the user gave is unfinished, or the turn waits on the user, or the review already ran after the user's latest instruction
    Then the agent reviews nothing
    And when the run is under a no-question mode, it asks nothing, files nothing, and puts the drafts in its final report

  # AC-0001-0231-05
  Scenario: The rule ships and the entry points cite it
    Given a project initialised by `qfai init`
    When an agent reads `AGENTS.md` or the Copilot instructions
    Then each cites `.agents/rules/session-feedback.md`
    And the rule master is under `.agents/rules/` with the same text the package carries

  # AC-0001-0231-06
  Scenario: The end of the run triggers the review once
    Given `qfai-run` gives its final report
    When the report closes the user's last task and nothing waits on the user
    Then the agent follows `.agents/rules/session-feedback.md` once, after the report
    And a report at a chosen scope, at a halt, with a gate failing or CI pending, or with a question is a pause that runs no review
```
