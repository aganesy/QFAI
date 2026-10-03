# Acceptance Criteria

## Criteria

```gherkin
Feature: A stage skill picked up by free text hands over
  # AC-0001-0195-01
  Scenario: A stage skill the host picked for free text edits nothing
    Given workflow mode `active`
    And a stage skill that was not invoked by name
    When the skill starts
    Then it edits nothing and passes the request to `qfai-run` in the same turn
    And the user sees at most one line before `qfai-run` takes the request
    And under mode `off` or `shadow` no entry check runs, and the skill behaves as when invoked by name

  # AC-0001-0195-03
  Scenario: A stage invoked by name runs on its own
    Given a stage skill invoked by name
    When it runs
    Then it runs standalone and ends at that stage, starting no other stage
    And a request to take the work to the end becomes a whole run

  # AC-0001-0195-04
  Scenario: Each stage-skill description opens with its trigger condition
    Given the `description:` of every skill that owns a step a built-in plan names
    When it is read
    Then it opens with when to use the skill: invoked by name, or when a route's plan names its step
    And it does not walk through the skill's steps
    And it stays within 1024 characters and holds no `<` or `>`

  # AC-0001-0195-05
  Scenario: A stage skill lists its steps and holds none of their procedure
    Given every skill that owns a step a built-in plan names
    When its `SKILL.md` is read
    Then its frontmatter `steps:` lists, in the order they run, every step it owns, and any other entry is a `common-*` step
    And its frontmatter carries no `routing-profile:`, and its `roles:` is `orchestrator` plus the union of the `roles:` of the steps it lists
    And its body names each step with the condition that skips it, and has the agent read only the current step's `STEP.md`
    And no step's procedure is written in the body

  # AC-0001-0195-06
  Scenario: No stage skill blocks model invocation
    Given every skill that owns a step a built-in plan names
    When its `SKILL.md` frontmatter is read
    Then it carries no `disable-model-invocation` key
    And a skill that owns no such step is outside this criterion

  # AC-0001-0195-07
  Scenario: A stage skill invoked by name runs its steps in order and is reviewed once
    Given a stage skill invoked by name
    When it runs
    Then it runs its listed steps one at a time, in order, skipping only a step whose skip condition holds
    And it reads each step's `STEP.md` only when that step starts
    And after its last step it runs one review, whose reviewers are the union of the reviewers of the steps it ran
    And no review runs between two of its steps
```
