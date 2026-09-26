# Acceptance Criteria

## Criteria

```gherkin
Feature: Own-CI supply-chain hardening with an accountable pin owner

# AC-0002-0014-01
# Parent: US-0002-0014
Scenario: Least privilege measured by reachability, not by declaration
  Given a job-reachable permission block counts a workflow-level block the job inherits
  When the hygiene lane counts jobs across the own workflows tree with no reachable block
  Then the count is zero, down from eight of twelve
  And the aggregate verdict job declares an empty permission map, accepted as explicit rather than missing
  And the publishing job's identity-token write is accepted as a justified elevation

# AC-0002-0014-02
# Parent: US-0002-0014
Scenario: The reachability rule is falsifiable, not just satisfiable
  Given a workflow whose job inherits a workflow-level permission block
  When both the job-level block and the workflow-level block are removed
  Then the hygiene lane exits 1 and names the workflow and the job
  And restoring either one of the two blocks makes the lane exit 0 again

# AC-0002-0014-03
# Parent: US-0002-0014
Scenario: The checkout token never reaches the workspace, and full history stays an exception
  Given eleven checkout steps exist across the own workflows tree and none sets the flag today
  When the hygiene lane counts checkout steps that do not set persist-credentials to false
  Then the count is zero
  And the two jobs that legitimately need full history request it on the job, not as a workflow default
  And removing the flag from any single checkout step makes the lane exit 1

# AC-0002-0014-04
# Parent: US-0002-0014
Scenario: Pins are asserted by form, and a floating reference is rejected
  Given twenty-one action references exist across the own workflows tree and none is pinned today
  When the hygiene lane asserts that every reference resolves to a forty-hex commit SHA
  Then the count of floating references is zero
  And planting a floating major-version reference makes the lane exit 1 naming that reference
  And a conventional readable version trailer beside a pin does not fail any guard in this tree

# AC-0002-0014-05
# Parent: US-0002-0014
Scenario: Pinning without an owner is an unsatisfied requirement, not a partial one
  Given no automated action-bump configuration exists in the repository
  And a repository-root bump configuration requires explicit user approval before it can be added
  When the pins land
  Then a durable repository artifact — this spec, or the bump configuration itself — names who bumps them
  And a bump owner stated only in a pull-request description does not satisfy the criterion, because no gate can read it
```
