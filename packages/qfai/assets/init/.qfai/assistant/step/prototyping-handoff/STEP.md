---
name: prototyping-handoff
owner: qfai-prototyping
purpose: "Publish the prototype the user confirmed and record the handoff for implementation."
requires: []
roles: [orchestrator, product-experience-architect, devops-ci-engineer]
routing-profile: default
---

# prototyping-handoff

Runs only after the user confirmed the prototype in `prototyping-loop`.

## Reads

- The confirmed iteration `.qfai/prototype/iter-<final>/index.html`.
- Its latest `review.json`, for any blocking finding still open.
- `.qfai/assistant/skill/qfai-prototyping/references/handoff.md` — the handoff
  fields.
- `.qfai/prototype/grilling.md`, for the completion report.
- `.qfai/prototype/progress.md`, for `iterationKind` and any `runScope`.
- In a scoped run, the `final/index.html` and `final/handoff.json` an earlier
  run confirmed, which the merge keeps outside the scope.

## Writes

- `.qfai/prototype/final/index.html` — a copy, not a symlink, of the confirmed
  iteration, or in a scoped run its in-scope parts merged in, except in a
  `restyle` loop.
- `.qfai/prototype/final/handoff.json`, a CLI-HANDOFF record.

## Procedure

1. Copy the confirmed iteration to `.qfai/prototype/final/index.html`.
   In a `restyle` loop, copy nothing: the iteration is the live app. In a
   scoped run, replace only the in-scope parts and keep the rest, as the
   handoff reference's Scoped handoff says.
2. Write `.qfai/prototype/final/handoff.json` per the handoff reference.
3. Write the completion report.

## Gate

The step passes when both files exist,
or, in a `restyle` loop, when `handoff.json` exists. Only `npx qfai validate --profile
saas-package` checks the handoff record; nothing certifies the prototype.

The completion report names:

- every blocking finding, layout anti-pattern and `DESIGN.md` violation the
  latest review still lists;
- every decision a session adopted, from the `## Session` rows of
  `.qfai/prototype/grilling.md`, with why each was taken;
- in a scoped run, the scope the user confirmed.

It does not wait for an answer.
