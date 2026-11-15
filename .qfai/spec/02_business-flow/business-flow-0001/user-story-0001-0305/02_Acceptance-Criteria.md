# Acceptance Criteria

## Criteria

```gherkin
Feature: Write the standard parts of a business screen into its UI contract
  # AC-0001-0305-01
  Scenario: The contract step checks each screen against the business-screen list
    Given the shipped `sdd-contract` step
    When it writes the UI contract of a screen for a UI-bearing flow
    Then after deriving the screen's elements and actions from the examples it checks the screen against `## What a business screen always has` in `interface-clarity.md` and adds each part that applies and is missing
    And a part it adds needs no example of its own unless it carries a business rule

  # AC-0001-0305-03
  Scenario: A part a screen leaves out is recorded in its omitted list
    Given a screen that leaves out a part of the business-screen list in `interface-clarity.md`
    When the contract step writes its UI contract, or the product-surface reviewer reviews the screen
    Then the reason is a `{ part, reason }` entry in that screen's `omitted` list, and for a once-per-application part in the home screen's contract until an app-level UI contract exists
    And the reviewer reads that list, and a state's `none` under `states`, as the recorded reason
```
