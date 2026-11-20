# US-0001-0022: Forced update

## User Story

As an operator, I want `qfai init --force` to overwrite the skill files under `skill/` with the shipped release while leaving `skill.local/` untouched, so that I can update the shipped skills without losing my own.

## Non-goals

- Overwriting `skill.local/`
