# US-0001-0035: --upgrade-assistant-tree migration helper

## User Story

As an operator of a project on the legacy `.qfai/assistant/instructions/` layout, I want `qfai init --upgrade-assistant-tree` to copy each file the relocation table names to its destination in the `rule/ skill/ agent/ prompt/` tree and to preserve a destination that carries my edits with a `W-USER-EDIT-PRESERVED` note, so that I can leave the legacy layout with one command and lose no work.

## Non-goals

- A rollback command.
- Front-matter schema validation.
