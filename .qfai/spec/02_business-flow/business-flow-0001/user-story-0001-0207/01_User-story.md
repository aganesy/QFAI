# US-0001-0207: Run `/qfai-sdd` as a scoped stage

## User Story

As an operator, I want `/qfai-sdd` to run only the steps its stage names, to change the story tree only on an answer I gave for that stage, and to end at SDD when I invoke it directly, so that a route stays inside its scope and the expert path keeps working.

## Non-goals

- Running every flow when the request names no target.
- Continuing from a direct call into implementation.
