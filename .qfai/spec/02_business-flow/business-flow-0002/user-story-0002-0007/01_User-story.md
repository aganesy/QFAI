# US-0002-0007: Shipped workflow ownership contract

## User Story

As an adopter, I want QFAI to own only the `qfai-`-prefixed files it ships into my workflows directory, as a documented and tested contract whose write set comes from the list of shipped names and whose prune set comes from the list of formerly shipped names, with provenance read before any overwrite or prune, so that the files I created and the ones I declined are structurally protected.

## Non-goals

- The verb of a refresh command that overwrites unconditionally, which is deferred
- Detecting drift in installed files, which `qfai doctor` owns
- Deciding ownership by a prefix glob
- Updating an already installed workflow, since `qfai init` copies root assets create-only even with `--force`; this story defines ownership only
