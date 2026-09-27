# Acceptance Criteria

## Criteria

```gherkin
Feature: Design-system token mirror
  # AC-0001-0117-01
  Scenario: design-system as DESIGN.md Mirror
    Given `<paths.contractsDir>/design/design-system.yaml` is generated post-loop,
    When its token tables are compared to root `DESIGN.md`,
    Then color / typography / radius / shadow are byte-equivalent. Drift raises `QFAI-DCON-032`.
```
