# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                          | Expected                                                                                                                                                                                                                        |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0157-01 | AC-0001-0157-01 | Given root `DESIGN.md` exists and its sha256 is `abc123...` When `/qfai-sdd` Phase 0 completes | Then `<paths.contractsDir>/design/DESIGN.md.lock.yaml` exists with `sha256: abc123...` and a `lockedAt` ISO 8601 timestamp; absence of `DESIGN.md` triggers an error-severity finding from the design contract validator family |
