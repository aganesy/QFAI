# Acceptance Criteria

## Criteria

```gherkin
Feature: direct-pack validator alignment
  # AC-0001-0019-01
  Scenario: UI-bearing packs require the current screen sidecar family
    Given a UI-bearing discussion pack
    When `qfai validate` checks its UI sidecars
    Then missing `uiux/40_screen_contracts.md` or `uiux/50_review_input_bundle.md` produces an error naming the missing file

  # AC-0001-0019-02
  Scenario: A pack that inherits the current DESIGN.md owes no design research
    Given a UI-bearing discussion pack whose classification declares `design_direction: inherit`
    When `qfai validate` checks its UI sidecars and sources
    Then a missing screen contracts file or review bundle, a missing Trend Scan and too few competitive references produce no error
    And the declaration is an error naming the reason when the pack adds a screen or records a design direction of its own
    And the Research Summary of its `04_Sources.md` is checked as in a pack that does not inherit

  # AC-0001-0019-03
  Scenario: A composed profile reports each discussion-pack finding once
    Given a UI-bearing discussion pack
    When `qfai validate --profile verify` or `--profile full` checks it
    Then each finding of the research summary and the canonical UI checks appears once
```
