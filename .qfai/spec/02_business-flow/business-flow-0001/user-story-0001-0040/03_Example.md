# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                             | Expected                                       |
| --------------- | --------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| EX-0001-0040-01 | AC-0001-0040-01 | A screen contract declares `orders-dashboard`, and screenshot evidence is missing | Validate emits `QFAI-UIE-001`                  |
| EX-0001-0040-02 | AC-0001-0040-02 | A screen contract declares `orders-dashboard`, and HTML evidence is missing       | Validate emits `QFAI-UIE-002`                  |
| EX-0001-0040-03 | AC-0001-0040-03 | No screen contract exists                                                         | `validateUiEvidenceArtifacts` returns no issue |
