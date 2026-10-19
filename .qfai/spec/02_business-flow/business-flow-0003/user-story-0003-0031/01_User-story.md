# US-0003-0031: Shipped assistant file checks

## User Story

As an adopter, I want `qfai doctor` to report each shipped assistant file in my project whose text differs from the copy in the package, so that after an upgrade I can see whether the installed assistant files match the installed qfai.

## Non-goals

- Overwriting, refreshing or removing an assistant file.
- Writing a record of which release wrote an installed file; doctor only reads the version file `qfai init` writes.
- Comparing a file the package does not ship, such as a rule overlay or anything under `skill.local/`.
