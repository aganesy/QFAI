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
  Scenario: An SDD-kind stage puts a critical change of the tree to the user
    Given an sdd stage
    When the stage has a proposal that changes what existing story-tree or contract files state
    Then it shows the user the files and the proposal, and changes nothing that depends on it until the user answers
    And a request from the user in the session that names the change and its effect is that answer: the stage lists the files in its announcement and asks no second question
    And it writes the change and names the files, who decided it, when and the option chosen in its stage report

  # AC-0001-0207-07
  Scenario: A specification change records a pending test annotation as a test exception
    Given a proposed specification change whose test annotation is not yet added
    When the stage checks whether the user approved deferring the annotation
    Then it may record the intermediate state only when the user approved that deferral
    And it records the deferral as an exact AC-ID Test exception row
    And the row records the exception decision, not that the test is complete
    And the exception Approach records the reason, untested scope, owner, next decision date and condition for adding the annotation
    And the date is for manual review and creates no automatic warning or expiry
    And the existing QFAI-STORY-009 info finding names the exempted AC and decision without claiming test coverage
    And an AC exception does not exempt descendant EX obligations
    And a no-spec-change request or an unapproved deferral creates an Unadjudicated OQ row before dependent AC, EX or BR edits
    And that OQ names the affected IDs, expected versus actual behavior, implementation-change evidence, owner and required permission
    And those dependent edits stop while independent work may continue
    And the stage never rewrites an EX or prose as a specification change the user did not decide
```
