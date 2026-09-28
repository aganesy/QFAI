# US-0001-0115: DESIGN.md hash drift rejection

## User Story

As an AI generator, I want `qfai prototyping iterate --cycle <n>` with n ≥ 1 to fail with exit 2 when the SHA-256 of `DESIGN.md` on disk no longer matches the hash recorded at cycle 0, so that a changed design forces a clean restart from cycle 0.
