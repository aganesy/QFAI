# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                    | Expected                                                                                      |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| EX-0001-0127-01 | AC-0001-0127-01 | Given cycles 0 through 8 finish without convergence. When the loop runs cycle 9.                                                                         | Then `shouldStop` returns `max-iterations` and the run terminates at index 9.                 |
| EX-0001-0127-02 | AC-0001-0127-01 | Given the iteration budget is defined by `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9`. When the source and validator wiring are inspected.        | Then both values come from `core/prototyping/iteration.ts`, with no parallel 15-cycle budget. |
| EX-0001-0127-03 | AC-0001-0127-02 | Given an evidence pack records cycle index 10 or a cycle count inconsistent with `MAX_ITERATIONS`. When `QFAI-PROT-005` or `QFAI-PROT-006` validates it. | Then validation emits a non-zero finding.                                                     |
| EX-0001-0127-04 | AC-0001-0127-01 | Given a non-converged loop already records ten iterations through index 9. When `qfai prototyping iterate --cycle 9` runs again.                         | Then it returns exit 65 for the max-iterations terminator instead of a cycle-mismatch error.  |
