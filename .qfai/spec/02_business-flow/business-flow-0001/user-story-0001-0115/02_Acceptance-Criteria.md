# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0115-01
# Parent: US-0001-0115
Scenario: Cycle ≥1 hash gate
  Given `prototyping.json#designMdSha256 === H_recorded`,
  When `qfai prototyping iterate --cycle <n>` (n ≥ 1) runs and on-disk `sha256(DESIGN.md) !== H_recorded`,
  Then it exits with code `2` and stderr contains `"DESIGN.md hash mismatch"`. The user must restore `DESIGN.md` or re-run the SDD freeze and restart from cycle 0.
  And On the story tree the SDD freeze is the one at the `/qfai-sdd` 03-contract step.
```
