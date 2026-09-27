# Acceptance Criteria

## Criteria

```gherkin
Feature: UI-contract terminology in prototyping
  # AC-0001-0138-01
  Scenario: Single-spec public skill surface (OQ-0108 Option A)
    Given the v1.9.1 ship,
    When the public skill surface is read (SKILL.md + the public references list),
    Then `resolveSurfaceUnion()` MUST NOT appear on the public skill surface (kept internal-only for the cycle ≥ 1 drift gate) AND SKILL.md language MUST be single-spec.
    And the doc-vs-impl drift identified across SKILL.md / certify / iterate MUST resolve to zero remaining multi-spec public surface mentions at HEAD.
    And on the story tree the unit SKILL.md names is the UI contract (`UI-NNNN`) rather than the spec.
```
