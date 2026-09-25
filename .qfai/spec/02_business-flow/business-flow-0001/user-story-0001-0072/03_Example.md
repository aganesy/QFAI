# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                       | Expected                                                                                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0072-01 | AC-0001-0072-01 | A BF scope includes `AC-0001-0026-01` for legacy-file removal, but no integration or API test exercises it. | ATDD adds an integration test under `<testsDir>/integration/**` with `QFAI:AC-0001-0026-01`; the test runs `qfai init --force` and asserts the legacy file is absent. |
