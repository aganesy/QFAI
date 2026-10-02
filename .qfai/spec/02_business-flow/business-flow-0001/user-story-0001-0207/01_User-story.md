# US-0001-0207: Run `/qfai-sdd` as a stage of a run

## User Story

As an operator, I want `/qfai-sdd` to do exactly the work order it is handed for exactly the target that work order names, to change the story tree only on an answer I gave for that stage, and to end at SDD when I invoke it directly, so that a run stays inside its scope and the expert path keeps working as it does today.

## Non-goals

- Running every flow when a work order names no target
- Continuing from a direct call into implementation
- The check the workflow core makes when it accepts the stage's result
