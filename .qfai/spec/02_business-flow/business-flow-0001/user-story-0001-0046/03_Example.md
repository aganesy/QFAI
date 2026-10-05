# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                           | Expected                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| EX-0001-0046-02 | AC-0001-0046-02 | A validate run on a freshly-upgraded project where `qfai init --upgrade-assistant-tree` emitted `W-USER-EDIT-PRESERVED` notes, when `qfai validate` runs immediately afterwards | Validate exits 0; `counts.info >= 1`; the report has an "Informational" section listing the preserved files |
