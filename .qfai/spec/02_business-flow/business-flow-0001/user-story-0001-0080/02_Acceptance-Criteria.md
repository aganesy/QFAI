# Acceptance Criteria

## Criteria

```gherkin
Feature: Exploration Brief Authoring
  # AC-0001-0080-01
  Scenario: SDD writes the exploration inputs into DESIGN.md
    Given a deliberation record for a UI-bearing flow that settles its exploration inputs
    When `/qfai-sdd` writes root `DESIGN.md`
    Then its `# Brand Philosophy` body records the product intent, must-keep interactions, brand signals, and differentiation targets as explicit exploration constraints
    And it does not select a winning visual direction or finalize a design system
```
