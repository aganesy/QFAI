# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                         | Expected                                                                                                                                                                        |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0002-07 | AC-0001-0002-02 | On the story tree, a bugfix whose diff changes `src/orders/export.ts` and one test file finds that a contract rule it relies on is wrong; the drift protocol is applied to it | The bugfix leaves the contract unchanged and returns it to its owner skill with the discrepancy recorded; the protocol still lists the local-overlay and owner-skill exceptions |
