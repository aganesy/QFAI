---
name: prototyping-recover
owner: qfai-prototyping
purpose: "Start a new prototype lineage when the user asks for a design the current lineage does not implement."
requires: []
roles: [orchestrator, product-experience-architect, devops-ci-engineer, completion-reviewer]
routing-profile: default
---

# prototyping-recover

Runs on demand, when the user's answer in `prototyping-loop` asks for a design
the current lineage does not implement, or when the user edits root `DESIGN.md`
and wants the loop to start again from it. Return to `prototyping-loop`
afterwards.

## Reads

- The user's answer, recorded in `.qfai/prototype/grilling.md`.
- The iterations under `.qfai/prototype/`.

## Writes

- `.qfai/prototype/iter-00/` and upward, for the new lineage.
- `.qfai/prototype/progress.md`, with the line that starts the new lineage.

## Procedure

1. **Ask before starting over.** A new lineage overwrites `iter-00/` and
   replaces every later iteration and its reviews. Name what it replaces, and
   offer to copy the current iterations aside first.
2. **A declined restart ends the run and deletes nothing.** Report the rejected
   prototype and the direction the user gave, leave `.qfai/prototype/` as it
   stands, and stop. Their answer is still recorded under `## Session`.
3. On approval, remove the old iterations, then return to `prototyping-loop` at
   iteration `00`, carrying the user's answer as the pivot.

Under a no-question mode the restart cannot be approved: write it to
`## Escalated` in `.qfai/prototype/grilling.md` and stop.

## Gate

The step passes when the user approved the restart and the old iterations are
gone, or ends the run when the restart was declined.
