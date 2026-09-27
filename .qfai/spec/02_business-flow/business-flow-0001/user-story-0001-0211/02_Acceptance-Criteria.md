# Acceptance Criteria

## Criteria

```gherkin
Feature: Settle one visual decision as a stage of a run

# AC-0001-0211-01
# Parent: US-0001-0211
Scenario: The prototyping skill follows the stage-skill handover
  Given workflow mode active
  When qfai-prototyping starts with no name invocation and no work order
  Then it edits nothing and passes the request to qfai-run
  And with a valid work order it does only that work
  And its SKILL.md cites references/orchestrated-mode.md with one line

# AC-0001-0211-02
# Parent: US-0001-0211
Scenario: The prototyping skill declares its operation
  Given references/orchestrated-mode.md of qfai-prototyping
  When its Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-prototyping

# AC-0001-0211-03
# Parent: US-0001-0211
Scenario: A prototype stage stays inside the flow its work order binds
  Given a prototype work order whose target binds one business flow with a UI-bearing contract
  When qfai-prototyping runs under it
  Then it settles the one visual decision the plan needs for that flow within the existing root DESIGN.md and UI contracts
  And it changes no UI contract of another flow and creates no contract
  And a standalone invocation still resolves every UI-bearing contract

# AC-0001-0211-04
# Parent: US-0001-0211
Scenario: A prototype stage on a flow with no UI-bearing contract is blocked
  Given a prototype work order whose target binds a business flow no UI-bearing contract serves
  When qfai-prototyping runs under it
  Then it writes nothing
  And it returns outcome blocked with the missing UI surface as a debt the operator resolves
```
