# Acceptance Criteria

## Criteria

```gherkin
Feature: UI-bearing detection

# AC-0001-0015-01
# Parent: US-0001-0015
Scenario: UI-bearing discussion packs require prototyping.yaml
  Given latest discussion pack is UI-bearing
  When discussion README / skill contract を検証する
  Then `prototyping.yaml` requiredness が明記されている
```
