# Acceptance Criteria

## Criteria

```gherkin
Feature: Active Design Contract Surface Reduction
  # AC-0001-0158-01
  Scenario: Legacy Design Contracts Removed
    Given the shipped `qfai-sdd` skill tree
    When its templates, references and steps are read
    Then none of them writes `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml` or `brand-design.yaml`
    And the normalization reference lists the removed contracts as not generated

  # AC-0001-0158-02
  Scenario: Active Design Contract Index = {DESIGN.md}
    Given the design inputs the shipped `qfai-sdd` and `qfai-prototyping` skills name
    When the active design contracts are listed
    Then the set is root `DESIGN.md` alone, which `common-design-md` authors and validates, and the prototyping handoff is recorded in `prototyping.json#handoff` rather than under `<paths.contractsDir>/design/`
```
