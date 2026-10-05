# Acceptance Criteria

## Criteria

```gherkin
Feature: Move the QFAI directories to their singular names
  # AC-0004-0004-01
  Scenario: The plural directories and the contracts directory move, and the config follows
    Given a project on the spec-pack layout whose qfai.config.yaml holds the default paths
    And an assistant directory whose singular destination already holds an entry of the same name
    When step 1 runs
    Then every directory in the rename map is at its new path and the config paths name the new paths
    And the colliding entry is deleted, listed under Operations

  # AC-0004-0004-02
  Scenario: The project's own skill overlay keeps its content under the singular name
    Given a project with a .qfai/assistant/skills.local directory
    When step 1 runs
    Then its content is under .qfai/assistant/skill.local and skills.local is gone

  # AC-0004-0004-03
  Scenario: Step 1 removes the retired traceability keys and runs past the retired-key config issues
    Given a project whose qfai.config.yaml holds validation.traceability.scMustHaveTest, validation.traceability.unknownContractIdSeverity and prototyping.primarySpecId
    When step 1 runs
    Then it does not stop on the config issues those three keys raise
    And both traceability keys are gone from the file, each listed under Operations
    And prototyping.primarySpecId is unchanged
```
