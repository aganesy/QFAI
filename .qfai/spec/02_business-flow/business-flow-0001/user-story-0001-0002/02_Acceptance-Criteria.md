# Acceptance Criteria

## Criteria

```gherkin
Feature: Drift protocol
  # AC-0001-0002-01
  Scenario: The drift protocol procedure is defined
    Given `drift-protocol.md`
    When the procedure on drift detection is read
    Then it defines the steps stop the affected scope → prepare a change request → approval, recorded as a `Change request:` row the branch appends → owner skill rerun → recheck dependent obligations
    And on the story tree, a change request is a row opening `Change request:` that the branch making the change appends to `decisions.md` once the user approves it, and a declined request is a row opening `Declined change request:` that authorizes no edit
    And on the story tree, a change request authorizes edits to the paths it names only on the branch that adds it, and the row is never edited afterwards

  # AC-0001-0002-02
  Scenario: A bugfix that changes no upstream file raises no change request
    Given the shipped `drift-protocol.md`
    When its allowed exceptions are read
    Then every exception it listed before is still listed
    And it states that a bugfix which changes no file of the story tree or the contract layer raises no change request, because no upstream change happened
```
