# Acceptance Criteria

## Criteria

```gherkin
Feature: UI-contract terminology in prototyping
  # AC-0001-0134-01
  Scenario: Single-spec public skill surface
    Given the shipped `/qfai-prototyping` skill,
    When the public skill surface is read (SKILL.md + the public references list),
    Then `resolveSurfaceUnion()` MUST NOT appear on it AND SKILL.md language MUST be single-spec.
    And on the story tree the unit SKILL.md names is the UI contract (`UI-NNNN`) rather than the spec.
```
