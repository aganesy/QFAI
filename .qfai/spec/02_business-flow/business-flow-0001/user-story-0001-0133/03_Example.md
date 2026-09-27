# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                | Expected                                                                                                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0133-01 | AC-0001-0133-01 | Given `prototyping.execution.browserTool: "playwright-cli"` in `qfai.config.yaml`, When `qfai prototyping iterate` reads the config, | Then the value is accepted AND `D-DEPRECATED-PROBE` is emitted (severity: warning during deprecation window). A parallel config carrying `browserTool: "playwright"` is accepted with no warning. |
