# Acceptance Criteria

## Criteria

```gherkin
Feature: Direct discussion-pack validator alignment

# AC-0001-0019-01
# Parent: US-0001-0019
Scenario: UI-bearing packs require the current screen sidecar family
  Given a UI-bearing discussion pack
  When `qfai validate` checks its UI sidecars
  Then missing `uiux/40_screen_contracts.md` or `uiux/50_review_input_bundle.md` produces an error naming the missing file
  And a legacy evaluation heading in a current sidecar produces a legacy-format error
```
