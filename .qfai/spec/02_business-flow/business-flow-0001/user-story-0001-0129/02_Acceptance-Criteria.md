# Acceptance Criteria

## Criteria

```gherkin
Feature: Browser tool migration window
  # AC-0001-0129-01
  Scenario: `browserTool` accepts `"playwright"` and `"playwright-cli"`
    Given `prototyping.execution.browserTool` set to `"playwright"` OR `"playwright-cli"` during the deprecation window,
    When the configuration is loaded,
    Then both values MUST be accepted; `"playwright-cli"` MUST emit `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset).
    And the documented default in `assets/init/qfai.config.example.yaml` MUST be `"playwright"`.
```
