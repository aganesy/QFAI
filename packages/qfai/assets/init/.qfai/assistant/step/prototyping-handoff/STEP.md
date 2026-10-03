---
name: prototyping-handoff
owner: qfai-prototyping
purpose: "Publish the prototype the user confirmed and record the handoff for implementation."
requires: []
roles:
  [
    orchestrator,
    product-experience-architect,
    devops-ci-engineer,
    completion-reviewer,
    product-surface-reviewer,
  ]
routing-profile: ui-bearing
---

# prototyping-handoff

Runs only after the user confirmed the prototype in `prototyping-loop`.

## Reads

- The confirmed iteration `.qfai/prototype/iter-<final>/index.html`.
- Its latest `review.json`, for any blocking finding still open.
- `.qfai/assistant/skill/qfai-prototyping/references/handoff.md` — the handoff
  fields.
- `.qfai/prototype/grilling.md`, for the completion report.

## Writes

- `.qfai/prototype/final/index.html` — a copy, not a symlink, of the confirmed
  iteration.
- `.qfai/prototype/final/handoff.json`, a CLI-HANDOFF record.

## Procedure

1. Copy the confirmed iteration to `.qfai/prototype/final/index.html`.
2. Write `.qfai/prototype/final/handoff.json` per the handoff reference.
3. Write the completion report.

## Gate

The step passes when both files exist. Only `npx qfai validate --profile
saas-package` checks the handoff record; nothing certifies the prototype.

The completion report names:

- every blocking finding, layout anti-pattern and `DESIGN.md` violation the
  latest review still lists;
- every decision a session adopted, from the `## Session` rows of
  `.qfai/prototype/grilling.md`, with why each was taken.

It does not wait for an answer.
