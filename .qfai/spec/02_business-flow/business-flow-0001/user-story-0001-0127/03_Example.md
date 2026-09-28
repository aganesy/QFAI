# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                              | Expected                                                                                 |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| EX-0001-0127-01 | AC-0001-0127-01 | Cycles 0 through 8 finish without convergence, when the loop runs cycle 9.                                                                         | `shouldStop` returns `max-iterations` and the run terminates at index 9.                 |
| EX-0001-0127-02 | AC-0001-0127-01 | The iteration budget is defined by `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9`, when the source and validator wiring are inspected.        | Both values come from `core/prototyping/iteration.ts`, with no parallel 15-cycle budget. |
| EX-0001-0127-03 | AC-0001-0127-02 | An evidence pack records cycle index 10 or a cycle count inconsistent with `MAX_ITERATIONS`, when `QFAI-PROT-005` or `QFAI-PROT-006` validates it. | Validation emits a non-zero finding.                                                     |
| EX-0001-0127-04 | AC-0001-0127-01 | A non-converged loop already records ten iterations through index 9, when `qfai prototyping iterate --cycle 9` runs again.                         | It returns exit 65 for the max-iterations terminator instead of a cycle-mismatch error.  |
