# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                        | Expected                                                                                                                                                  |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0023-01 | AC-0001-0023-01 | `qfai init --dry-run`                                                                                                                        | The files it would create are listed, and no file is created                                                                                              |
| EX-0001-0023-02 | AC-0001-0023-01 | `qfai init --force --dry-run --verbose` over an initialized project where one rule master was edited and one assistant rule file was deleted | The edited file is listed as `changed`, the deleted file as `new`, an unchanged file is listed under `skipped` and not as written, and no file is written |
