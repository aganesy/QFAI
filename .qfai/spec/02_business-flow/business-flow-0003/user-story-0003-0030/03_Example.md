# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                           | Expected                                                                                           |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| EX-0003-0030-01 | AC-0003-0030-01 | An example test with the proof line ``// Mutation: src/total.ts `a + b` -> `a - b` fails "adds"``, once while `src/total.ts` contains `a + b`, once after it no longer does, and once after the file is deleted | `ok` the first time; a warning naming the test file and the proof's line the second and third time |
| EX-0003-0030-02 | AC-0003-0030-01 | A project whose example tests carry no proof line                                                                                                                                                               | `qfai doctor` reports no `tests.mutationProofs` check                                              |
