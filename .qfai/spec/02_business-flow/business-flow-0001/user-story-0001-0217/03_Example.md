# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                   | Expected                                                                                                                        |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0217-02 | AC-0001-0217-02 | The shipped plans; a tree with an extra `triage-everything.yml`; a tree without `fix-intermittent.yml`; and a tree whose `fix-intermittent.yml` drops `implement-stress-harness` while its row keeps it | The shipped plans pass. The other three fail, naming the extra plan, the missing plan and the route whose plan and row disagree |
| EX-0001-0217-04 | AC-0001-0217-02 | A tree whose `resolve-conflicts.yml` drops the `serves` of its `edit` stage while its row keeps `<spec, contract>`                                                                                      | The run fails, naming `resolve-conflicts` as the route whose plan and row disagree                                              |
