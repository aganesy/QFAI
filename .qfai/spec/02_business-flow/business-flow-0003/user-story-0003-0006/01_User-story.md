# US-0003-0006: playwright primary probe

## User Story

As an operator of a prototyping-profile project, I want `qfai doctor --profile prototyping` to probe `node_modules/.bin/playwright` first, fall back to `npx --no-install playwright --version`, and validate the target URL locally, so that I can verify my setup before the prototyping preflight checks reachability.

## Non-goals

- Installing playwright automatically.
- Running a prototyping iteration.
