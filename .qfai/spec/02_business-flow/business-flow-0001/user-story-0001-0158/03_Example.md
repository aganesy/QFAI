# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                            | Expected                                                                                                                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0158-01 | AC-0001-0158-01 | Given a fresh `/qfai-sdd` run on a UI-bearing pack When `_policies/05_Contracts.md` is inspected | Then none of `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml` appear as active rows; `09_delta.md` may retain history annotations |
| EX-0001-0158-02 | AC-0001-0158-02 | Given the post-decomposition contract index When the active design-contract entries are listed   | Then the set is exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}`                                                                                                   |
