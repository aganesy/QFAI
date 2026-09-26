# Acceptance Criteria

## Criteria

```gherkin
Feature: Verify as the final stage of a run

# AC-0001-0215-01
# Parent: US-0001-0215
Scenario: The stage result names this run's verify.json and its independent review
  Given an orchestrated verify work order
  When the verify stage returns
  Then its artifact references name the verify.json this stage wrote
  And the qa-gatekeeper verdict is a review result from a reviewer independent of the authors
  And its own gate results are reported as information, never as the gate decision

# AC-0001-0215-02
# Parent: US-0001-0215
Scenario: A report from elsewhere is never offered as this run's
  Given a verify.json written by another run, scoped to another flow, or kept in a shared location
  When the verify stage returns
  Then that file is not named as this stage's report

# AC-0001-0215-03
# Parent: US-0001-0215
Scenario: Validation that did not run is reported unrun
  Given a verify stage in which a required gate did not run
  When the stage returns
  Then its outcome and its test observation are reported apart
  And the gate that did not run is unrun, never a pass

# AC-0001-0215-04
# Parent: US-0001-0215
Scenario: verify.json keeps its fields and values
  Given the verify stage of a run
  When it writes verify.json
  Then the file carries no field it did not carry before
  And its status and scope take only the values they took before
  And no stage outcome or test observation value is written into it

# AC-0001-0215-05
# Parent: US-0001-0215
Scenario: Verify sends each finding to its owner
  Given the final gates report findings verify did not cause
  When the verify stage returns
  Then a story or contract gap, an acceptance-test defect and an implementation defect are listed as needs_repair findings, with qfai-sdd, qfai-atdd and qfai-implement as their resolving owners
  And a missing environment returns the stage blocked, with the blocker stage-blocked and the operator as the one who clears it
  And verify edits no artifact another owner holds

# AC-0001-0215-06
# Parent: US-0001-0215
Scenario: The verify stage follows the stage-skill handover
  Given workflow mode active
  When /qfai-verify is selected with no work order and not by name
  Then it edits nothing and passes the request to qfai-run
  And a worker handed a work order checks the run, stage and work-order IDs and does only that work
  And SKILL.md cites references/orchestrated-mode.md with one line

# AC-0001-0215-07
# Parent: US-0001-0215
Scenario: The Operations table lists what the plan vocabulary assigns to qfai-verify
  Given the qfai-verify reference references/orchestrated-mode.md
  When its Operations table is read
  Then it lists exactly the operation the plan vocabulary assigns to qfai-verify
```
