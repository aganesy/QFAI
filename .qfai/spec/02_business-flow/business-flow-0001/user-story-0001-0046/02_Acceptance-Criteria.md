# Acceptance Criteria

## Criteria

```gherkin
Feature: Unseeded assistant layer is informational
  # AC-0001-0046-02
  Scenario: Unseeded assistant layer is informational
    Given a project whose `.qfai/assistant/` tree lacks one of its canonical layer directories
    When `qfai validate` runs
    Then the validator reports `QFAI-ASSISTANT-002` for that layer at `info` severity (not warning or error), counts it in `counts.info`, lists it in the validate report, and the run fails no gate on account of it
```
