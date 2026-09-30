# US-0003-0007: Grouped doctor output and a skills.integrity downgrade

## User Story

As an operator, I want the `qfai doctor` summary split into an "errors blocking the active profile" group and a "warnings advisory of drift" group, with `skills.integrity` shown at `warning` severity in the second group by default, so that skill drift never blocks the active profile whatever its message says.

## Non-goals

- Changing the logic of the skill integrity check itself.
