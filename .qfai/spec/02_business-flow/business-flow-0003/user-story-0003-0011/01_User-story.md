# US-0003-0011: shipped workflow drift detection (detection half)

## User Story

As an adopter, I want `qfai doctor` to compare the shipped workflows installed under `.github/workflows/` with the copies in the installed package and report any difference as an advisory `workflows.integrity` finding that names the stale file and the manual repair of replacing it with the packaged copy, so that I notice a fixed template has not reached my repository even though `qfai init --force` never refreshes those create-only files.

## Non-goals

- Overwriting, refreshing or pruning shipped workflows.
- Naming a refresh command, CLI verb or flag in the advisory.
- Creating, writing or defining the schema of the shipped-workflow ownership contract and its provenance record; this story reads the record but does not own it.
- Adding a finding to `qfai validate`.
- Changing the exit code.
