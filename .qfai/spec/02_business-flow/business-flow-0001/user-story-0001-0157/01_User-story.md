# US-0001-0157: DESIGN.md sha256 Lock at Phase 0

## User Story

As a QFAI user, I want `/qfai-sdd` Phase 0 in the spec-pack layout, and the 03-contract step on the story tree, to freeze the root `DESIGN.md` sha256 into `<paths.contractsDir>/design/DESIGN.md.lock.yaml`, so that downstream skills can detect drift between the discussion-time design SSOT and any later edits.
