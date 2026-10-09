# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                                                              | Expected                                                                                           |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| EX-0001-0072-01 | AC-0001-0072-01 | An AC `AC-NNNN-NNNN-NN` whose obligations make an error case meaningful but which has only a normal-path test case, and a flow `BF-NNNN` with normal and error test cases, when `test-design-analyst` and `qa-gatekeeper` read the annotated tests | The AC is returned `REVISE` naming the missing error case and its owner, and the BF is not flagged |
