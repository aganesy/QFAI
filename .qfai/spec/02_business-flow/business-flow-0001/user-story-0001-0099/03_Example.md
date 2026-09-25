# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                                 | Expected                                                                                                                        |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0099-01 | AC-0001-0099-01 | Given `extractedDesignSystem` points to `<paths.contractsDir>/design/design-system.yaml` whose tables match root `DESIGN.md` byte-for-byte after parse normalization When `/qfai-implement` consumes the token tables | Then the consumed tables equal the parsed root `DESIGN.md` tables; any drift is surfaced through the design contract validators |
