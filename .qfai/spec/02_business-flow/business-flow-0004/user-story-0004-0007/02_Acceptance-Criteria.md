# Acceptance Criteria

## Criteria

```gherkin
Feature: Build the flows and stories from the plan
  # AC-0004-0007-01
  Scenario: The plan becomes flows and stories with new IDs, and the ID map records them
    Given a project on the spec-pack layout and a plan that places every story and rule
    When step 4 runs
    Then every story, criterion and example is in its story directory under its new ID
    And each story file holds its story sentence and each criteria file its Gherkin, in the shape of the `qfai-sdd` templates
    And each flow has its business-flow.md and user-stories.md, and business-flows.md lists every flow
    And each business-flow.md is in the shape of the `qfai-sdd` template: its old section's prose as its purpose, or the template's placeholder where there is none, its diagram, and one placeholder alternate or exception path
    And id-map.json maps every old ID to its new one
    And every flow is listed under For a person, so that a person writes its alternate and exception paths, and step 4 exits 3

  # AC-0004-0007-02
  Scenario: Step 4 does not guess
    Given a plan that places no flow for one old user story, a flow with no `from`, an old criterion step 4 cannot convert or assign to one story, an old story block that is not one "As a …, I want …, so that …" sentence, or a placed story left with no criterion
    When step 4 runs
    Then a story or criterion stays in its source, a flow with no `from` receives the template `business-flow.md` with the plan title, and each is listed under For a person with its file and the reason
    And a story block that is not one such sentence is written as it stands, and a story left with no criterion gets no `02_Acceptance-Criteria.md`
    And step 4 exits 3

  # AC-0004-0007-03
  Scenario: Criteria and examples take their closed shapes, and what those shapes cannot hold goes to a person
    Given a placed criterion holding a Background, a second Scenario, a Scenario Outline or a Scenario named only by its ID, or a placed example whose Input or Expected opens with a Gherkin step keyword
    When step 4 runs
    Then each criterion holds its first named Scenario, or a placeholder Scenario where it has none
    And an Input or Expected holding one step is written without its leading Given, When, Then or And, and one holding more steps is written as it stands
    And each item not written, each placeholder and each cell written as it stands is listed under For a person, and step 4 exits 3
```
