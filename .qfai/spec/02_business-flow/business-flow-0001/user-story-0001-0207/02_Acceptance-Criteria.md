# Acceptance Criteria

## Criteria

```gherkin
Feature: Run `/qfai-sdd` as a scoped stage
  # AC-0001-0207-02
  Scenario: Invoked by name, /qfai-sdd runs standalone
    Given the operator invokes /qfai-sdd by name
    When SDD completes
    Then the skill stops at SDD
    And a request to go to the end is handed to qfai-run, which plans the whole route

  # AC-0001-0207-04
  Scenario: /qfai-sdd lists the steps the plans run for story authoring
    Given the /qfai-sdd SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-sdd
    And every step a plan gives an sdd stage is one of them

  # AC-0001-0207-06
  Scenario: An SDD-kind stage changes the tree only on the user's approval
    Given an sdd stage
    When the stage has a proposal for the story-tree and contract files it would change
    Then it shows the user the files and the proposal, and changes nothing until the user answers
    And on approval it writes the change and one Change request row naming every protected file it changed, with who approved it, when and the option chosen
```
