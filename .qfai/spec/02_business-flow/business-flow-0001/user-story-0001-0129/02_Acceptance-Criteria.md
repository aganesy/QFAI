# Acceptance Criteria

## Criteria

```gherkin
Feature: Browser tool setting
  # AC-0001-0129-01
  Scenario: `browserTool` accepts `"playwright"`
    Given `prototyping.execution.browserTool` set to `"playwright"`,
    When the configuration is loaded,
    Then the value MUST be accepted with no configuration issue.
    And the default in the shipped `qfai.config.yaml` MUST be `"playwright"`.
```
