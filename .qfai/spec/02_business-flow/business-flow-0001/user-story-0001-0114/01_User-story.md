# US-0001-0114: Cycle-zero design hash recording

## User Story

As an AI generator, I want `qfai prototyping iterate --cycle 0` to record `sha256(DESIGN.md)` into `prototyping.json#designMd.sha256`, so that every later cycle and `certify` can tell whether `DESIGN.md` changed during the loop.
