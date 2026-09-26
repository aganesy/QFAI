# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                               | Expected                                                                                                                                       |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0170-01 | AC-0001-0170-02 | The `devils-advocate` entry under `optional_modes` of the built-in `review-profiles.yml`                            | `kind: advisory`, a description saying it does not block completion by default, `alternative_required: true` and `bare_negation_invalid: true` |
| EX-0001-0170-02 | AC-0001-0170-01 | Given `devils-advocate` returns FAIL with only “I disagree” and no concrete alternative When the verdict is checked | Then the bare-negation FAIL is rejected and re-judgment requests a concrete alternative                                                        |
