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
Scenario: Low-risk research is auto-approved
  Given a research conclusion flagged as low-risk
  When the HITL gate evaluates the risk level
  Then the gate auto-approves the conclusion without blocking

# AC-0001-0190-03
# Parent: US-0001-0190
Scenario: --yolo does not bypass a security-critical gate
  Given a security-critical HITL gate
  When the developer runs with the --yolo flag
  Then the gate still triggers
  And --yolo is ignored for that gate
```
