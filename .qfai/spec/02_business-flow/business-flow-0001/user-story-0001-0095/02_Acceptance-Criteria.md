# Acceptance Criteria

## Criteria

```gherkin
Feature: Simplified Handoff Schema
  # AC-0001-0095-01
  Scenario: Read implementation inputs from the prototyping handoff
    Given the shipped `/qfai-prototyping` handoff reference and the rule `/qfai-implement` reads a UI definition by
    When the handoff record they describe is read
    Then it is `.qfai/prototype/final/handoff.json`, a CLI-HANDOFF record whose per-skill extension fields are `finalArtifact`, `procurement` and `implementationNotes`
    And `/qfai-implement` reads it there and takes design tokens from root `DESIGN.md`
    And it does not require an exactly-four-field schema or the retired `mustPreserve`, `mayAdapt` and `mustNotCopy` fields
```
