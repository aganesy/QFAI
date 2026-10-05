# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                                                       | Expected                                                                                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0003-0007-02 | AC-0003-0007-02 | `qfai doctor --format text --profile prototyping` on an initialized tree with `paths.specsDir` configured to a non-default path that does not exist, no `src/` at the shipped default `paths.srcDir`, and an unmet prototyping precondition | The "errors blocking the active profile" group holds the prototyping error; the "warnings advisory of drift" group holds the `paths.specsDir` warning and the `paths.srcDir` info |
