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
decision as one row there. Every other stage records each decision in its own
evidence file.

Either record carries the four labelled Approach items, under the rules stated
at the top of `.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.

## When to stop and ask

Stop and ask the user if:

- required inputs are missing (e.g., target behavior, API shape, UX intent),
- multiple interpretations are plausible and impact is material,
- a change could be breaking and intent is unclear.
