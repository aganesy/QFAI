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

  # AC-0001-0305-02
  Scenario: The contract step writes the app frame once
    Given the shipped `sdd-contract` step
    When it writes the UI contracts of a UI-bearing flow and no UI contract holds the app shell or records why the application has none
    Then it writes one UI contract, the app frame, holding the shell with the navigation for each role and the home
    And every other application screen that renders inside the shell names the frame's shell screen in `navigation.shell`
    And a once-per-application part left out gets its reason in the frame
    And settings, member management and notifications are frame screens only when a story needs them

  # AC-0001-0305-03
  Scenario: A part a screen leaves out is recorded in its omitted list
    Given a screen that leaves out a part of the business-screen list in `interface-clarity.md`
    When the contract step writes its UI contract, or the product-surface reviewer reviews the screen
    Then the reason is a `{ part, reason }` entry in that screen's `omitted` list, and for a once-per-application part in the app frame
    And the reviewer reads that list, and a state's `none` under `states`, as the recorded reason
```
