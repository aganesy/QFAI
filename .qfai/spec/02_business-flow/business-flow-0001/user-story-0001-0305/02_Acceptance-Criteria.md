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
  Scenario: The contract step names each application screen's type by its ID
    Given the shipped `sdd-contract` step and `business-ui-patterns.md`
    When the step names the type of an application screen in its UI contract
    Then it writes `pattern: <id>` with the ID the reference gives that type
    And a screen that fits no type, and a marketing screen, leave `pattern` out
```
