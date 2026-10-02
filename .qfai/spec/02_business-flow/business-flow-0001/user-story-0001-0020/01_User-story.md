# US-0001-0020: Workspace initialization

## User Story

As an operator, I want `npx qfai init` to create `.qfai/assistant/`, `qfai.config.yaml` at the project root and, where init lays out the story tree, `.qfai/spec/`, without scaffolding `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/` or `report/` under `.qfai/`, so that a new project starts with only what QFAI manages.

## Non-goals

- Other commands such as validate, report and doctor
