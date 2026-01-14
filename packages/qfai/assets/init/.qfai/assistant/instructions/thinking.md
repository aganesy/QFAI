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

## Working method
1. Restate the goal and constraints (brief).
2. Enumerate unknowns and assumptions.
3. Identify the evidence to check (files/commands).
4. Decide with a rationale grounded in evidence.
5. Record residual risk and the rollback path.

## When to stop and ask
Stop and ask the user if:
- required inputs are missing (e.g., target behavior, API shape, UX intent),
- multiple interpretations are plausible and impact is material,
- a change could be breaking and intent is unclear.
