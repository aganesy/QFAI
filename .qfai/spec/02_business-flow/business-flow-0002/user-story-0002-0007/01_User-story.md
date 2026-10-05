# US-0002-0007: Shipped workflow ownership contract

## User Story

As an adopter, I want QFAI to write only the workflow files it ships into my workflows directory, from the list of shipped names, never overwriting a file that exists and never removing one, so that the files I created or edited are structurally protected.

## Non-goals

- The verb of a refresh command that overwrites unconditionally, which is deferred
- Detecting drift in installed files
- Deciding ownership by a prefix glob
- Updating an already installed workflow, since `qfai init` copies root assets create-only even with `--force`
