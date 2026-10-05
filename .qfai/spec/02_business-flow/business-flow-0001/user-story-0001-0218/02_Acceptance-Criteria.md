# Acceptance Criteria

## Criteria

```gherkin
Feature: Refuse a route catalog a session cannot use
  # AC-0001-0218-01
  Scenario: A plan names only installed steps, in stages of one kind
    Given a plan
    When the core loads it
    Then every step is an installed step and each stage's kind is the kind its steps give

  # AC-0001-0218-02
  Scenario: Only the listed steps are marked pass-through
    Given a plan that marks a step pass-through
    When the core loads it
    Then it is refused unless the step is on the pass-through list

  # AC-0001-0218-03
  Scenario: Every route ends one of the three allowed ways
    Given the shipped catalog
    When it is loaded
    Then every change route ends with the verify block, every other route with `triage-close`, and `draft-release-notes` with its release-notes stage
    And a plan that ends any other way is refused

  # AC-0001-0218-04
  Scenario: Decision, release and branch points name steps of the plan
    Given a plan that declares points
    When the core loads it
    Then each point names a step the plan runs once
    And each branch destination is a catalog route or the decision table

  # AC-0001-0218-05
  Scenario: A plan holds no predicate, no modifier and only known modes
    Given a plan with a `when` key, an unknown mode or a modifier
    When `plan` loads it
    Then it is refused

  # AC-0001-0218-06
  Scenario: A triage stage carries no review
    Given a plan whose stage carries `review`
    When `plan` loads it
    Then `spec` or `code` on a stage that is not a triage stage is admitted
    And any other value, or any `review` on a triage stage, is refused

  # AC-0001-0218-07
  Scenario: A stage is listed after the stages it depends on
    Given a plan whose stage names in `after` a stage listed after it
    When `plan` loads it
    Then the plan is refused, naming both stages
```
