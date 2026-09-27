# Acceptance Criteria

## Criteria

```gherkin
Feature: Resolve only the unsettled scope as a stage of a run

# AC-0001-0206-01
# Parent: US-0001-0206
Scenario: A discussion stage does not re-ask a settled decision
  Given a discussion work order whose settled field lists the checked route proposal and the answered questions
  When the discussion stage runs
  Then it covers only the scope that settled leaves unresolved
  And it asks no question settled already answers

# AC-0001-0206-02
# Parent: US-0001-0206
Scenario: The discussion skill follows the stage-skill handover
  Given workflow mode active
  When qfai-discussion starts with no name invocation and no work order
  Then it edits nothing and passes the request to qfai-run
  And with a valid work order it does only that work
  And its SKILL.md cites references/orchestrated-mode.md with one line

# AC-0001-0206-03
# Parent: US-0001-0206
Scenario: The discussion skill declares its operations
  Given references/orchestrated-mode.md of qfai-discussion
  When its Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-discussion
```
