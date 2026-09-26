# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                       | Expected                                                                                                                                                                                                               |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0096-01 | AC-0001-0096-01 | Given two items that both write the same shared fixture/mock file, or that mutate the same fixture instance When delivery-planner evaluates | Then parallel dispatch is denied (the concurrent write violates independence) And the mere existence of a shared read-only fixture module, which neither item writes and each consumes as-is, is not a deny on its own |
