# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                            | Expected                                                                                                                                                 |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0070-01 | AC-0001-0070-01 | A BF scope includes `AC-0001-0033-01` for the managed ignore block, but no integration or API test exercises it. | ATDD adds an integration test under `<testsDir>/integration/**` with `QFAI:AC-0001-0033-01`; the test runs `qfai init` and asserts the block is present. |
