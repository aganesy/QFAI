# US-0001-0038: Story-tree seeding

## User Story

As an operator, I want `qfai init` to lay out the story tree on a project with no spec-pack layout, writing the `.qfai/spec/` singleton files and contract directories create-only and pointing `paths.specsDir` and `paths.contractsDir` at them, and on a project still on the spec-pack layout to write nothing under `.qfai/spec/` and name the migration skill instead, so that a new project starts on the story tree and an old one is never half converted.

## Non-goals

- Writing a business-flow or user-story instance.
- Migrating a spec-pack layout, which is the migration skill's work.
