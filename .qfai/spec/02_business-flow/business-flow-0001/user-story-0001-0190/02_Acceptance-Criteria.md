# Acceptance Criteria

## Criteria

```gherkin
Feature: Human-in-the-Loop Review Gates

# AC-0001-0190-01
# Parent: US-0001-0190
Scenario: High-risk research triggers human review
  Given a research conclusion flagged as high-risk
  When the HITL gate evaluates the risk level
  Then the gate blocks application until human review
  And the developer sees diff + citations for review

# AC-0001-0190-02
# Parent: US-0001-0190
Scenario: Developer approves research at HITL gate
  Given a HITL gate blocking a research conclusion
  When the developer reviews and approves
  Then the research result is applied to code
  And the approval is logged

# AC-0001-0190-03
# Parent: US-0001-0190
Scenario: Developer rejects research at HITL gate
  Given a HITL gate blocking a research conclusion
  When the developer reviews and rejects
  Then the research result is NOT applied
  And the rejection reason is logged
```
