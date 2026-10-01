# US-0001-0022: Forced update

## User Story

As an operator, I want `qfai init --force` to overwrite the skill files under `skills/` (`skill/` with the `rule/ skill/ agent/ prompt/` assistant tree) with the shipped release while leaving `skills.local/` (`skill.local/`) untouched, so that I can update the shipped skills without losing my own.

## Non-goals

- Overwriting `skills.local/` (`skill.local/` with the `rule/ skill/ agent/ prompt/` assistant tree)
