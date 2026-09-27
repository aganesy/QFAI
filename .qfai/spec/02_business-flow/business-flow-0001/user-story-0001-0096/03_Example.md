# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                  | Expected                                                                                                                                                                                                       |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0096-01 | AC-0001-0096-01 | Two items that both write the same shared fixture/mock file, or that mutate the same fixture instance, when delivery-planner evaluates | Parallel dispatch is denied (the concurrent write violates independence); the mere existence of a shared read-only fixture module, which neither item writes and each consumes as-is, is not a deny on its own |
