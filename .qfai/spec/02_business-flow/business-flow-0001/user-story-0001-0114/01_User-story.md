# US-0001-0114: Cycle-zero design lock recording

## User Story

As an AI generator, I want `qfai prototyping iterate --cycle 0` to record the SHA-256 of `DESIGN.md` at `prototyping.json#designMd.sha256` and check that it matches `<paths.contractsDir>/design/DESIGN.md.lock.yaml#designMdSha256`, so that every later cycle runs against the locked design.
