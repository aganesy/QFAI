# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                          | Expected                                                         |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EX-0003-0012-01 | AC-0003-0012-01 | `qfai doctor --fail-on error` with only warnings                                                                                               | Exit code 0                                                      |
| EX-0003-0012-02 | AC-0003-0012-02 | `qfai doctor --fail-on warning` with a warning                                                                                                 | Exit code 1                                                      |
| EX-0003-0012-03 | AC-0003-0012-03 | `qfai doctor --fail-on warning` on a tree whose summary has one `error` finding and `warning` 0                                                | Exit code 1                                                      |
| EX-0003-0012-04 | AC-0003-0012-04 | `qfai doctor` with no `--fail-on`, the shipped `validation.failOn` default, and one `error` finding; then the same tree with `--fail-on never` | Exit code 1 without the flag; exit code 0 with `--fail-on never` |
