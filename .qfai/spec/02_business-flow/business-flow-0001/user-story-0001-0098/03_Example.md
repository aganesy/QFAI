# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                   | Expected                                                                                                                                                          |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0098-01 | AC-0001-0098-01 | Given a current DCON-008 `prototype-handoff.yaml` with a final artifact, deterministic design-system input, and `imageSources[]` provenance When `/qfai-implement` consumes the handoff | Then it reads `finalArtifact` and `extractedDesignSystem` without requiring an exactly-four-field schema or any `mustPreserve`, `mayAdapt` or `mustNotCopy` field |
