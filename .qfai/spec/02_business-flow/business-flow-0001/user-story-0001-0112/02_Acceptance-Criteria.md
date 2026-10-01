# Acceptance Criteria

## Criteria

```gherkin
Feature: DESIGN.md hash drift rejection
  # AC-0001-0112-01
  Scenario: Cycle ≥1 hash gate
    Given `prototyping.json#designMdSha256 === H_recorded`,
    When `qfai prototyping iterate --cycle <n>` (n ≥ 1) runs and on-disk `sha256(DESIGN.md) !== H_recorded`,
    Then it exits with code `2` and stderr contains `"DESIGN.md hash mismatch"`. The user must restore `DESIGN.md` or restart from cycle 0.

  # AC-0001-0112-02
  Scenario: Re-freeze after an edit to prose alone
    Given cycle 0 recorded the byte hash and the token hash of `DESIGN.md`,
    When `DESIGN.md` changes and `qfai prototyping refreeze` runs,
    Then it records the new byte hash and keeps the loop at its cycle when the parsed tokens still match the token hash, and otherwise exits `2` and changes nothing. A certificate failing on the changed `DESIGN.md` names `refreeze` and then `certify` as the recovery.
```
