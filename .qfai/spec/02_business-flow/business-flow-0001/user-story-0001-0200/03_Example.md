# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                       | Expected                                                                                        |
| --------------- | --------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EX-0001-0200-01 | AC-0001-0200-01 | A start input whose `harness.host` is `copilot`                                             | Refused `fail-closed` with cause `unsupported-capability` naming the host, and no run directory |
| EX-0001-0200-02 | AC-0001-0200-02 | A project with no eval record and READMEs that claim no host, on a host whose report passes | `start` creates the run in mode `active`                                                        |
| EX-0001-0200-03 | AC-0001-0200-02 | The first stage that needs a real delegation returns `delegation.status: unavailable`       | The run moves to `blocked` with cause `unsupported-capability`, naming `delegateSubAgent`       |
