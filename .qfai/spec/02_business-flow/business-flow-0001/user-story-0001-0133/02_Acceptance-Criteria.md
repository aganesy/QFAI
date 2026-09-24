# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0133-01
# Parent: US-0001-0133
Scenario: `browserTool` accepts `"playwright"` and `"playwright-cli"`
  Given `prototyping.execution.browserTool` set to `"playwright"` OR `"playwright-cli"` during the deprecation window,
  When `qfai prototyping iterate` reads the config,
  Then both values MUST be accepted; `"playwright-cli"` MUST emit `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset).
  And the documented default in `assets/init/qfai.config.example.yaml` MUST be `"playwright"`.
```
