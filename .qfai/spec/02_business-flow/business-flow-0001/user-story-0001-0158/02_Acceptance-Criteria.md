# Acceptance Criteria

## Criteria

```gherkin
Feature: Active Design Contract Surface Reduction

# AC-0001-0158-01
# Parent: US-0001-0158
Scenario: Legacy Design Contracts Removed
  Given the shipped `qfai-sdd` skill tree
  When its templates, references and steps are read
  Then none of them writes `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml` or `brand-design.yaml`
  And the normalization reference lists the removed contracts as not generated

# AC-0001-0158-02
# Parent: US-0001-0158
Scenario: Active Design Contract Index = {design-system, prototype-handoff, DESIGN.md, DESIGN.md.lock.yaml, mirror validator}
  Given the design contracts the shipped `qfai-sdd` and `qfai-prototyping` skills write under `<paths.contractsDir>/design/`
  When the active design contracts are listed
  Then the set is exactly root `DESIGN.md`, `DESIGN.md.lock.yaml`, `design-system.yaml`, `prototype-handoff.yaml` and the design-system mirror validator
```
