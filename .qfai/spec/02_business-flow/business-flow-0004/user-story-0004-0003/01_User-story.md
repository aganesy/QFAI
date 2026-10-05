# US-0004-0003: Run any migration step without risk to the project

## User Story

As an adopter on the spec-pack layout, I want every step script to refuse a bad start before it writes, show me what it will do, and change nothing when I run it again after it finished, so that I can preview and repeat a migration without damaging the project.

## Non-goals

- Requiring a clean working tree.
- A progress file recording which steps ran.
- A `qfai` subcommand.
