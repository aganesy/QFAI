# US-0004-0001: Migration skill shipped and linked

## User Story

As an adopter, I want `qfai init` to install `/qfai-migration-v1-to-v2` and link it into the host skill directories like every shipped skill, on a fresh project and on one still on the spec-pack layout, with the migration's scripts reusing init's integration-directory and managed-block writers rather than copies of them, so that I can start the migration from any host and its link and `.gitignore` writes behave exactly as init's do.

## Non-goals

- The migration's steps, invocation and report, which `.qfai/spec/03_contract/cli/cli-0012-qfai-migration-v1-to-v2.md` owns.
- A `qfai` subcommand for the migration.
