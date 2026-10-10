# US-0003-0006: playwright primary probe

## User Story

As an operator of a prototyping-profile project, I want `qfai doctor --profile prototyping` to probe `node_modules/.bin/playwright` as the primary launcher with `npx --no-install playwright --version` as the fallback, so that a fresh `qfai init` followed by `npm i -D playwright` prints no `[error]` line.

## Non-goals

- Installing playwright automatically.
- Running a prototyping iteration.
