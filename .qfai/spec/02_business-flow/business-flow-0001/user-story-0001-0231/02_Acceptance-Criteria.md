# Acceptance Criteria

## Criteria

```gherkin
Feature: Send session feedback to QFAI when the work is complete
  # AC-0001-0231-01
  Scenario: Init installs no stop-time group but the turn-end check, so an ordinary turn end costs nothing
    Given a fresh project, or a project whose hook files already hold its own `Stop` groups
    When `qfai init` runs
    Then neither `.claude/settings.json` nor `.codex/hooks.json` receives a `Stop` group from QFAI other than the turn-end check group
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

  # AC-0001-0231-07
  Scenario: A correction the user gave twice is proposed for the project, apart from the QFAI issues
    Given the agent follows `.agents/rules/session-feedback.md` at the end of the session
    When the user gave the same correction twice in the session
    Then the agent proposes where the project could record it: the project rules of `AGENTS.md` or a path-scoped rule for a convention, a skill for a procedure pasted three times, a hook for something that has to happen every time
    And it proposes nothing where an equivalent rule, skill or hook already exists, for a correction given once, or for a procedure pasted fewer than three times
    And it writes nothing until the user says yes, and files none of it with QFAI
    And under a no-question mode it writes nothing and puts the proposals in the final report

  # AC-0001-0231-08
  Scenario: Review findings on the session's work are analysed for what QFAI could have prevented
    Given the agent follows `.agents/rules/session-feedback.md` at the end of the session
    When a reviewer sub-agent returned findings during the session under any verdict, or a pull request the session opened, or replied to or pushed a fix for a review of, carries review comments by the time of the review
    Then the agent reads each finding and asks whether QFAI's design, specification, implementation, test or verification guidance should have prevented it, such as a design flaw a design step let through, a defect, or a boundary value no example fixed
    And each such finding becomes a draft that reports the gap in QFAI's guidance, never the project's defect, names the shipped skill, step, rule, template or command that should change, and is generalised as AC-0001-0231-03 requires, quoting no code, path or name of the project
    And a finding whose cause lies only in the project, with no QFAI guidance that applied, is not drafted
    And the review reads no pull request the session did not open or answer review on, and where the forge cannot be read it skips the pull request comments and says so in one line
```
