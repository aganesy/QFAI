# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                     | Expected                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0114-01 | AC-0001-0114-01 | Root `DESIGN.md` and `<paths.contractsDir>/design/DESIGN.md.lock.yaml#designMdSha256` have the same SHA-256; run `qfai prototyping iterate --cycle 0 --target-url <url>`. | The run records that digest at `prototyping.json#designMd.sha256`; it equals the live `DESIGN.md` bytes and the lock's `designMdSha256`. |
