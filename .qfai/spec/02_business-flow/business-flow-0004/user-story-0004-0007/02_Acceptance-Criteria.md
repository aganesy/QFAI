# Acceptance Criteria

## Criteria

```gherkin
Feature: Build the flows and stories from the plan

# AC-0004-0007-01
# Parent: US-0004-0007
Scenario: The plan becomes flows and stories with new IDs, and the ID map records them
  Given a project on the spec-pack layout and a plan that places every story and rule
  When step 4 runs
  Then every story, criterion and example is in its story directory under its new ID
  And each flow has its business-flow.md and user-stories.md, and business-flows.md lists every flow
  And id-map.json maps every old ID to its new one
  And every work-log entry names flows and decision rows in place of the old spec IDs

# AC-0004-0007-02
# Parent: US-0004-0007
Scenario: Step 4 does not guess a flow
  Given a plan that places no flow for one old user story
  When step 4 runs
  Then that story stays in its spec pack and is listed under For a person with its file and the reason
  And step 4 exits 3
```
