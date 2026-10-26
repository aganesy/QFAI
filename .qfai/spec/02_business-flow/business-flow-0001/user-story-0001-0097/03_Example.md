# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                        | Expected                                                                                                                                                                                                                                          |
| --------------- | --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0097-01 | AC-0001-0097-01 | The prototyping delegation map, when the skill dispatches a cycle                            | It names the session agent as the owner of implementation and build and `product-surface-reviewer` as the owner of review scoring; no fixed capture identity is required, and an invalid assignment is reported before the reviewer is dispatched |
| EX-0001-0097-02 | AC-0001-0097-02 | A delegation map that assigns review scoring to the session agent, when the cycle dispatches | The assignment is reported before either role runs; the session agent generates and `product-surface-reviewer`, briefed without the session's conversation, scores                                                                                |
