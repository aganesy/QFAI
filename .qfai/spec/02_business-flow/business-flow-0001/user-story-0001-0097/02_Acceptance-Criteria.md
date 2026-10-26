# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping delegation scope
  # AC-0001-0097-01
  Scenario: Each prototyping role has a documented owner
    Given a prototyping cycle delegates work
    When the skill documents role ownership
    Then the delegation map names the session agent as the owner of implementation and build and `product-surface-reviewer` as the owner of evaluation scoring
    And the delegation map has no fixed capture identity.

  # AC-0001-0097-02
  Scenario: The session generates and an independent reviewer scores
    Given the delegation map assigns generation and review in a prototyping cycle
    When the cycle dispatches the review
    Then the session agent generates and `product-surface-reviewer` scores from a fresh, black-box brief
    And a map that gives review scoring to the session agent, or generation to the reviewer, raises a delegation finding
```
