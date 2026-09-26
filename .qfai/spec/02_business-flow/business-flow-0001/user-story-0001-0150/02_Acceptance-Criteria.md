# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0150-01
# Parent: US-0001-0150
Scenario: `taskFidelity` keyword documentation + error text (REQ-0162)
  Given the `QFAI-CRIT-009` validator and `references/evidence-requirements.md`,
  When `taskFidelity` evidence is missing a required keyword,
  Then `QFAI-CRIT-009` error text MUST name every required keyword (`cta_visibility`, `four_state_check`, plus any others surfaced by the current implementation) and the expected document section.
  And `references/evidence-requirements.md` MUST enumerate the keywords with example markdown structure.

# AC-0001-0150-02
# Parent: US-0001-0150
Scenario: `iterate --capture` emits `taskFidelity` template skeleton (REQ-0162)
  Given `qfai prototyping iterate --capture`,
  When the evidence template skeleton is emitted,
  Then the skeleton MUST include every required `taskFidelity` keyword as a placeholder so the keyword set cannot be silently forgotten.
```
