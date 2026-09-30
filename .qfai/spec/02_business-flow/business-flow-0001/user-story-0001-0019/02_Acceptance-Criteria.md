# Acceptance Criteria

## Criteria

```gherkin
Feature: direct-pack validator alignment
  # AC-0001-0019-01
  Scenario: UI-bearing packs require the current screen sidecar family
    Given a UI-bearing discussion pack
    When `qfai validate` checks its UI sidecars
    Then missing `uiux/40_screen_contracts.md` or `uiux/50_review_input_bundle.md` produces an error naming the missing file
    And a legacy evaluation heading in a current sidecar produces a legacy-format error
```
