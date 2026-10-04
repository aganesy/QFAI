# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                         | Expected                                                         |
| --------------- | --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EX-0001-0013-01 | AC-0001-0013-01 | A discussion pack holding its nine files                                                      | Readiness passes on file presence                                |
| EX-0001-0013-02 | AC-0001-0013-01 | The pack of EX-0001-0013-01 with `09_Constraints.md` deleted                                  | Readiness fails with `QFAI-DPACK-002` naming `09_Constraints.md` |
| EX-0001-0013-03 | AC-0001-0013-01 | The pack of EX-0001-0013-01 with the `## Inception Deck` section removed from `01_Context.md` | Readiness fails with `QFAI-DPACK-003` naming `01_Context.md`     |
