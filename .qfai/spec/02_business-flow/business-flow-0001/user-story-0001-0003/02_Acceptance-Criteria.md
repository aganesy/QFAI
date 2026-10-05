# Acceptance Criteria

## Criteria

```gherkin
Feature: Skill orchestration design contract
  # AC-0001-0003-01
  Scenario: The skill dependencies form a DAG
    Given the skill dependencies
    When the dependency graph is read
    Then the order configure -.-> discussion(optional) → sdd → prototyping(optional) → implement → verify is defined
    And no dependency is circular

  # AC-0001-0003-02
  Scenario: The skill order holds within every built-in plan
    Given the skill order and the built-in route plans
    When each plan's stages are read against the order
    Then within each plan the stages of `qfai-discussion`, `qfai-sdd`, `qfai-prototyping` and `qfai-verify` run in that order
    And the plan places each `qfai-implement`, `qfai-maintain` and `qfai-triage` stage
    And `qfai-run` sits above the order, and no plan names it
```
