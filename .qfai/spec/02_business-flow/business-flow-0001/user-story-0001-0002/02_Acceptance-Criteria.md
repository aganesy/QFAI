# Acceptance Criteria

## Criteria

```gherkin
Feature: Drift protocol
  # AC-0001-0002-01
  Scenario: The drift protocol procedure is defined
    Given `drift-protocol.md`
    When the procedure on drift detection is read
    Then it defines the steps stop the affected scope → record a CR → approval → owner skill rerun → recheck dependent obligations → DONE
    And on the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO
    And on the story tree, approval moves that row to WIP, the owner skill reruns, and the row ends DONE

  # AC-0001-0002-02
  Scenario: A bugfix that changes no upstream file raises no change request
    Given the shipped `drift-protocol.md`
    When its allowed exceptions are read
    Then every exception it listed before is still listed
    And it states that a bugfix which changes no file of the story tree or the contract layer raises no change request, because no upstream change happened
```
