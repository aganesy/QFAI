# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                          | Expected                                                                                                                                                                                           |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0129-01 | AC-0001-0129-01 | `prototyping.execution.browserTool: "playwright-cli"` in `qfai.config.yaml`, when the configuration is loaded. | The value is refused with one configuration issue naming `playwright-cli`, and `browserTool` reads `playwright`. A parallel config carrying `browserTool: "playwright"` is accepted with no issue. |
