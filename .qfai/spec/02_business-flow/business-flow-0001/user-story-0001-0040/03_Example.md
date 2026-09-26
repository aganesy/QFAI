# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                  | Expected                                            |
| --------------- | --------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| EX-0001-0040-01 | AC-0001-0040-01 | Given a screen contract declares `orders-dashboard` And screenshot evidence is missing | Then validate emits `QFAI-UIE-001`                  |
| EX-0001-0040-02 | AC-0001-0040-02 | Given a screen contract declares `orders-dashboard` And HTML evidence is missing       | Then validate emits `QFAI-UIE-002`                  |
| EX-0001-0040-03 | AC-0001-0040-03 | Given no screen contract exists                                                        | Then `validateUiEvidenceArtifacts` returns no issue |
