# Acceptance Criteria

## Criteria

```gherkin
Feature: Browser tool
  # AC-0001-0129-01
  Scenario: `browserTool` accepts `"playwright"`
    Given `prototyping.execution.browserTool` set to `"playwright"`,
    When the configuration is loaded,
    Then the value MUST be accepted with no finding.
    And the documented default in `assets/init/qfai.config.example.yaml` MUST be `"playwright"`.
```
