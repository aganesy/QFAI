# US-0001-0002: Drift protocol

## User Story

As a maintainer, I want the principle that protects the upstream SSOT and the procedure on drift detection (stop, change request, approval, owner skill rerun, resume) defined, with each change request recorded, once the user approves it, as a `Change request:` row that the branch making the change appends to `decisions.md` and that authorizes the change on that branch alone, so that no upstream file changes without an approved change request.

## Non-goals

- Automating drift detection
