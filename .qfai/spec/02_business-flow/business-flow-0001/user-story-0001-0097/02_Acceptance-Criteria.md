# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping delegation scope
  # AC-0001-0097-01
  Scenario: Each prototyping role has a documented owner
    Given a prototyping run delegates work
    When the skill documents role ownership
    Then evaluator and reviewer role ownership is documented.
    And the skill spells out which roles own implementation, evaluation scoring, and build.
    And capture responsibility is named only for an opt-in `--capture` run; the default reviewer-driven run has no fixed third capture identity.

  # AC-0001-0097-02
  Scenario: Generator and reviewer identities remain distinct
    Given the delegation map assigns generation and review in a prototyping cycle
    When the cycle dispatches those roles
    Then the generator and reviewer are distinct sub-agent identities
    And assigning the same identity to both roles raises a delegation finding
```
