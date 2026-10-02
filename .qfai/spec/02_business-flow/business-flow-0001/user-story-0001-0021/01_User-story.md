# US-0001-0021: Idempotent initialization

## User Story

As an operator, I want a repeated `qfai init` to skip the files that already exist and add only the new ones, so that running init again never overwrites my work.

## Non-goals

- Merging or updating existing files automatically
