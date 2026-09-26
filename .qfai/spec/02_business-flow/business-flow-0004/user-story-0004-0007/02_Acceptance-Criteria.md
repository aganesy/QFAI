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

# AC-0004-0007-02
# Parent: US-0004-0007
Scenario: Step 4 does not guess
  Given a plan that places no flow for one old user story, a flow with no `from`, or an old criterion step 4 cannot convert or assign to one story
  When step 4 runs
  Then a story or criterion stays in its source, a flow with no `from` receives the template `business-flow.md` with the plan title, and each is listed under For a person with its file and the reason
  And step 4 exits 3
```
