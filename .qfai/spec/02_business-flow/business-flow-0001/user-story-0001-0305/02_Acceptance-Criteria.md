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
  Scenario: Validate reads the surface kind of each screen
    Given a UI contract whose screens declare `surface` or leave it out
    When `qfai validate` runs the contract checks
    Then a screen that writes no `surface`, leaves it empty, or writes `application` or `marketing` raises nothing, and one that writes none is an application screen
    And any other value raises `QFAI-CONTRACT-051` at error, naming the contract, the screen, the value and the vocabulary

  # AC-0001-0305-03
  Scenario: A marketing screen is written, built and reviewed against the marketing patterns
    Given a screen whose UI contract declares `surface: marketing`
    When the `sdd-contract` step writes its contract, `implement-tdd` builds it, or the product-surface reviewer reviews it
    Then each reads it against its section entries in the shipped `marketing-ui-patterns.md`, which gives every section its purpose, standard parts, states and anti-patterns and records each image's source and licence
    And the list of parts every business screen has in `interface-clarity.md` applies to application screens only
```
