# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                               | Expected                                                      |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| EX-0001-0064-01 | AC-0001-0064-01 | No validation output exists, when `qfai report` runs without `--run-validate`                       | It exits 2, and its message says the input file was not found |
| EX-0001-0064-02 | AC-0001-0064-01 | A project that still has the 1.x spec-pack layout `.qfai/specs/spec-NNNN/`, when `qfai report` runs | It exits 2, and no report is written                          |
