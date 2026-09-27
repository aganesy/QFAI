# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                            | Expected                                                                                                                                                                                                          |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0157-01 | AC-0001-0157-01 | A visual-prototyping flow whose root `DESIGN.md` hashes to `abc123...`, when Stage 4 of `/qfai-sdd` freezes it on the story tree | `<paths.contractsDir>/design/DESIGN.md.lock.yaml` holds `designMdSha256: abc123...` and a `frozenAt` timestamp; with root `DESIGN.md` absent, the design-contract readiness gate reports `QFAI-DCON-030` at error |
