---
name: prototyping-handoff
owner: qfai-prototyping
purpose: "Publish the accepted prototype, record the handoff, and certify the loop."
requires: []
roles: [orchestrator, product-experience-architect, devops-ci-engineer, product-surface-reviewer]
routing-profile: ui-bearing
---

# prototyping-handoff

Step `H` of the loop. It runs only after `prototyping-loop` ended with the
prototype accepted.

## Reads

- The accepted iteration `.qfai/prototype/iter-<final>/index.html`.
- `.qfai/assistant/skill/qfai-prototyping/references/handoff.md` — inputs,
  outputs and the order the gates run in.
- `.qfai/evidence/prototyping/grilling.md`, for the completion report.

## Writes

- `.qfai/prototype/final/index.html` — a copy, not a symlink, of the latest
  accepted iteration.
- The `handoff` object of `.qfai/evidence/prototyping/prototyping.json`.
- `.qfai/evidence/prototyping/completion-certificate.json`, through `certify`.

## Procedure

1. Copy the latest accepted iteration to `.qfai/prototype/final/index.html`.
2. Add the `handoff` object to `prototyping.json` per the handoff reference.
3. Run `npx qfai validate --profile prototyping --fail-on error`. It writes the
   validate report with `counts.error === 0`.
4. Run `/qfai-verify`. It writes `verify.json` with `status === "PASS"` and
   `scope: "prototyping"`.
5. Run `npx qfai prototyping certify`. Certify requires both gate files to be
   present and passing before it seals the certificate, so the order above is
   load-bearing.

Follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`
for a failing validate or quality gate. A reviewer finding blocks here only
where certify, validate or verify fails.

A loop that stopped at cycle 9 without converging can still run steps 1 to 4
for inspection, but `npx qfai prototyping certify --check` exits non-zero and
the run is not done. Do not seal a certificate against an unconverged
`iter-09`; see `prototyping-recover` § Cycle 9 budget exhaustion.

## Gate

DONE = `completion-certificate.json` exists AND
`npx qfai prototyping certify --check` returns 0 AND `/qfai-verify` returns
PASS.

The loop's outputs and the certificate stay local under
`.qfai/evidence/prototyping/`. `certify --check` and
`npx qfai validate --profile prototyping` run on this checkout; CI does not
run them.

The completion report lists every decision a session adopted, from the
`## Session` rows of `.qfai/evidence/prototyping/grilling.md`, with why each was
taken. It does not wait for an answer.
