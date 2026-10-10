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
    And a request from the user in the session that names the change and its effect is that answer: the stage lists the files in its announcement and asks no second question
    And on approval it writes the change and one Change request row naming every protected file it changed, with who approved it, when and the option chosen

  # AC-0001-0207-07
  Scenario: An approved specification change records pending test annotations separately
    Given a proposed specification change whose test annotation is not yet added
    When the stage checks specification-change authority and test-deferral authority
    Then it may record the intermediate state only when both authorities cover it
    And it records the specification change separately from an exact AC-ID Test exception row at DONE
    And DONE means the exception decision is established, not that the test is complete
    And the exception Approach records the reason, untested scope, owner, next decision date and condition for adding the annotation
    And the date is for manual review and creates no automatic warning or expiry
    And the existing QFAI-STORY-009 info finding names the exempted AC and decision without claiming test coverage
    And an AC exception does not exempt descendant EX obligations
    And a no-spec-change request or uncovered authority creates an Unadjudicated OQ at TODO before dependent AC, EX or BR edits
    And that OQ names the affected IDs, expected versus actual behavior, implementation-change evidence, owner and required permission
    And those dependent edits stop while independent authorized work may continue
    And the stage never rewrites an EX or prose as an approved specification change without that authority
```
