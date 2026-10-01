# US-0001-0034: 4-layer asset-tree seeding

## User Story

As an operator, I want `qfai init` to seed a new project with the `.qfai/assistant/` layers `rule/`, `skill/` (each skill with its own `references/`), `agent/` and `prompt/`, so that one command lays out the whole assistant tree.

## Non-goals

- Enforcing the layout in `qfai validate`.
- Reviewer-Gate drift findings.
