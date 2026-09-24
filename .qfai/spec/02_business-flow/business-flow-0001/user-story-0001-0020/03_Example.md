# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                     | Expected                                                                                                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0020-01 | AC-0001-0020-01 | `qfai init` in an empty directory                                         | `.qfai/assistant/`, `.qfai/spec/` and the project-root `qfai.config.yaml` are created. None of the old `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/` or `report/` directories is created under `.qfai/`. |
| EX-0001-0020-02 | AC-0001-0020-01 | Given the consolidated rule BR-0003-0005 When layer coverage is evaluated | Then at least one example exists for BR-0003-0005                                                                                                                                                                        |
| EX-0001-0020-03 | AC-0001-0020-01 | Given the consolidated rule BR-0003-0007 When layer coverage is evaluated | Then at least one example exists for BR-0003-0007                                                                                                                                                                        |
