# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                     | Expected                                                      |
| --------------- | --------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| EX-0001-0013-01 | AC-0001-0013-01 | discussion-pack with 15 files                             | readiness pass on file presence                               |
| EX-0001-0013-02 | AC-0001-0013-01 | The pack of EX-0001-0013-01 with `13_Deferred.md` deleted | Readiness fails with `QFAI-DPACK-002` naming `13_Deferred.md` |
