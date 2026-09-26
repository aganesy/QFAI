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

- The evidence it read (files, commands).
- The decision, and the grounds for it in that evidence.
- The residual risk.
- The rollback path.

## When to stop and ask

Stop and ask the user if:

- required inputs are missing (e.g., target behavior, API shape, UX intent),
- multiple interpretations are plausible and impact is material,
- a change could be breaking and intent is unclear.
