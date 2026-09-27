# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Reviewer Gate

# AC-0001-0073-02
# Parent: US-0001-0073
Scenario: Required acceptance-test gates and handoff
  Given an ATDD run scoped to a business flow
  When the run reaches completion review
  Then preflight, test design, observable RED or falsifiability, scoped validation, and independent review have recorded evidence
  And a missing required gate or unresolved coverage gap prevents a PASS handoff.

# AC-0001-0073-03
# Parent: US-0001-0073
Scenario: Evidence File Completeness
  Given ATDD completion
  When the evidence file is checked
  Then it contains all required sections: Objective, Inputs, Decisions, Work performed, Commands, Volume estimate, Coverage checklist, Work Orders, Execution logs, Gaps, Final status.

# AC-0001-0073-04
# Parent: US-0001-0073
Scenario: Reviewer Independence
  Given the ATDD workflow
  When the Reviewer gate runs
  Then the Reviewer is a different agent than the test implementers and returns only PASS or REVISE.
  And it returns REVISE naming an in-scope BF that lacks an E2E test.

# AC-0001-0073-05
# Parent: US-0001-0073
Scenario: Scoped Completion Gate Runs Per Business Flow
  Given a project on the story tree
  When `/qfai-atdd` reaches its completion gate
  Then it runs `qfai validate --profile atdd --fail-on error --flow BF-NNNN` for the flow the invocation owns, and it runs no `--spec` validation.

# AC-0001-0073-06
# Parent: US-0001-0073
Scenario: Undeclared ATDD annotation is an error
  Given a test annotation names a BF, AC, or EX ID absent from the story tree
  When `qfai validate` scans the configured test files
  Then it reports an error naming the undeclared ID and the file
  And an annotation naming a defined ID raises no undeclared-reference finding.
```
