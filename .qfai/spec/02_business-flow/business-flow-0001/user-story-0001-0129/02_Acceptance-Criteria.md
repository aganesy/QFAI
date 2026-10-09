# Acceptance Criteria

## Criteria

```gherkin
Feature: Browser tool setting
  # AC-0001-0129-01
  Scenario: `browserTool` accepts `"playwright"` and refuses `"playwright-cli"`
    Given `prototyping.execution.browserTool` set to `"playwright"` OR `"playwright-cli"`,
    When the configuration is loaded,
    Then `"playwright"` MUST be accepted with no configuration issue; `"playwright-cli"` MUST be refused with one configuration issue naming it, and `browserTool` keeps the `"playwright"` default.
    And the default in the shipped `qfai.config.yaml` MUST be `"playwright"`.
```
