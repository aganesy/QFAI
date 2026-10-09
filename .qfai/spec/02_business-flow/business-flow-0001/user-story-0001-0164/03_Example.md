# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                      | Expected                                                                                                                                       |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0164-01 | AC-0001-0164-02 | The `devils-advocate` entry under `optional_modes` of the built-in `review-profiles.yml`                   | `kind: advisory`, a description saying it does not block completion by default, `alternative_required: true` and `bare_negation_invalid: true` |
| EX-0001-0164-02 | AC-0001-0164-01 | `devils-advocate` objects with only “I disagree” and no concrete alternative, and the objection is checked | The bare negation is invalid: it is not accepted as a finding until it carries a concrete alternative                                          |
