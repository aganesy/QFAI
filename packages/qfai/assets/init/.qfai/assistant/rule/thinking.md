---
id: thinking
category: universal
update_frequency: rare
---

# Thinking (Evidence-first, ambiguity elimination)

## Principles

- Prefer **repo evidence** over assumptions (file paths, configs, tests, commands).
- If something cannot be verified, write `TBD` and raise an Open Question (what evidence is missing).
- Minimize ambiguity: define terms, scope, and measurable acceptance criteria.

## What the stage records

The stage that owns `<paths.specsDir>/decisions.md`, `qfai-sdd`, records each
decision as one row there. A `decisions.md` row is a short decision record: what
was decided and why, in the form stated at the top of
`.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.

Every stage writes each agent decision it takes, a choice no specification,
contract, rule or convention settles, as an Agent decisions row of the run's
deliberation record, as `.qfai/assistant/rule/references/deliberation-record.md` says. Neither its stage report nor the final
report lists it.

## When to stop and ask

Stop and ask the user if:

- required inputs are missing (e.g., target behavior, API shape, UX intent),
- multiple interpretations are plausible and impact is material,
- a change could be breaking and intent is unclear.
