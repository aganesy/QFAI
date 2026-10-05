# Acceptance Criteria

## Criteria

```gherkin
Feature: Refuse a step tree that a route or a stage skill cannot use
  # AC-0001-0210-01
  Scenario: The shipped step tree passes
    Given the assistant tree `qfai init` writes
    When `qfai validate` runs
    Then it reports no step-tree finding

  # AC-0001-0210-02
  Scenario: A step placed or named wrongly is refused
    Given a step tree under `.qfai/assistant/step/`
    When `qfai validate` runs
    Then it reports an error for a `SKILL.md` anywhere under `.qfai/assistant/step/`
    And for a step directory without a `STEP.md`
    And for a `STEP.md` whose `name` differs from its directory name

  # AC-0001-0210-03
  Scenario: A step no owner or list accounts for is refused
    Given a step tree, the installed parent skills and the built-in plans
    When `qfai validate` runs
    Then it reports an error for an `owner` that is neither `common` nor an installed skill
    And for a parent `steps:` entry or a plan step that names no installed step
    And for a step that is not `common-*` and that its owner's `steps:` does not list
    And for a step that no parent lists or requires, no plan uses and no step requires

  # AC-0001-0210-04
  Scenario: A step requires at most one hop
    Given a step's or a parent's `requires`
    When `qfai validate` runs
    Then it reports an error when `requires` is not a list
    And when `requires` names a step that is not `common-*` or is not installed
    And when a `common-*` step's `requires` is not empty

  # AC-0001-0210-05
  Scenario: `plan` refuses a plan whose step is missing
    Given a project missing a step a built-in plan names
    When `npx qfai workflow plan` is asked for that plan
    Then it refuses with the reason `plan-invalid`, naming the step
    And it writes nothing
```
