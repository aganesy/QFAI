# Acceptance Criteria

## Criteria

```gherkin
Feature: 4-layer asset-tree seeding
  # AC-0001-0034-01
  Scenario: Init seeds the assistant-tree layers
    Given a clean new project directory
    When `qfai init` runs
    Then `.qfai/assistant/{rule,skill,agent,prompt}/` are created from the shipped assets
    And none of `constitution/`, `manifest/`, `catalog/`, `process/` and `steering/` is created
```
