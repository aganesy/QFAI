# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                           | Expected                                                                                                                                                              |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0003-0003-01 | AC-0003-0003-01 | Given `qfai.config.yaml` sets `paths.testsDir: custom/tests` and that directory is absent When `qfai doctor --format json` runs | Then the `paths.testsDir` check has severity `warning`, names `custom/tests` in `details.path`, and tells the operator to configure the path or create the directory. |
