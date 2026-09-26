# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                     | Expected                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0114-01 | AC-0001-0114-01 | Root `DESIGN.md` and `<paths.contractsDir>/design/DESIGN.md.lock.yaml#designMdSha256` have the same SHA-256; run `qfai prototyping iterate --cycle 0 --target-url <url>`. | The run records that digest at `prototyping.json#designMd.sha256`; it equals the live `DESIGN.md` bytes and the lock's `designMdSha256`. |
| EX-0001-0114-02 | AC-0001-0114-01 | Given the lock holds `abc123` and root `DESIGN.md` hashes to `def456`. Run `qfai prototyping iterate --cycle 0 --target-url <url>`.                                       | Then it exits 2 naming `lock=abc123` and `current=def456` and the design lock refreeze, and no `prototyping.json` is written.            |
