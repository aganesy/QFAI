# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0100-01
# Parent: US-0001-0100
Scenario: AC-0001-0100-01
  Given a prototyping run delegates work
  When the skill documents role ownership
  Then Evaluator/reviewer role ownership is documented.
  And The skill spells out which roles own implementation, evaluation scoring, and build.
  And Capture responsibility is named only for an opt-in `--capture` run; the default reviewer-driven run has no fixed third capture identity.

Scenario: Generator and reviewer identities remain distinct
  Given the delegation map assigns generation and review in a prototyping cycle
  When the cycle dispatches those roles
  Then the generator and reviewer are distinct sub-agent identities
  And assigning the same identity to both roles raises a delegation finding
```
