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
```
