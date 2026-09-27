---
name: atdd-test-fix
owner: qfai-atdd
purpose: "Repair a defective E2E, integration or API test so it checks the same obligation correctly."
requires: [common-grilling-record, common-evidence-record, common-gate-run]
roles:
  - acceptance-test-engineer
  - devops-ci-engineer
  - qa-gatekeeper
  - completion-reviewer
  - implementation-reviewer
routing-profile: runtime-heavy
---

# atdd-test-fix

Repairs one acceptance-layer test that is itself wrong: its expectation, its
fixture or its selector, not the product behaviour it checks.

## When it runs

A diagnosis found a defective test and the first ID of its `matchedIds` is a
BF or an AC, as `.qfai/assistant/rule/test-layers.md` maps BF to E2E and AC to
integration or API. An EX-layer test is `/qfai-implement`'s.

## Reads

- The diagnosis and the test it names. Inside a workflow run, the work order's
  `target` names the flow and the diagnosis names the test.
- The BF or AC the test annotates, and its owning contracts, under
  `paths.specsDir`.

## Writes

- The fixed test.
- The re-run, the proof and the grilling block in
  `.qfai/evidence/atdd-BF-NNNN.md` for the bound flow.

## Procedure

1. Record the preflight for this invocation as `common-grilling-record` says.
   The session's subject is the fix; record `confidence high` when nothing is
   uncertain.
2. Fix the test. It annotates the same IDs as before. Its file or test title
   may change. No story, contract or `decisions.md` file changes.
3. The edit changes the proof subject. Retake the RED or falsifiability proof
   as `.qfai/assistant/skill/qfai-atdd/references/red-provenance.md` requires
   for a changed test, and rerun every consumer of a changed shared fixture as
   `.qfai/assistant/skill/qfai-atdd/references/shared-test-artifacts.md`
   requires.
4. Re-run the fixed test with the Test command `common-gate-run` names, and
   record the command and result.

A fix after which the expectation would check a different ID is not a test
fix. Return `needs_repair`, listing that finding in `debts` with `qfai-sdd` as
its `resolvingOwner`. No accepted test fix is returned for it.

## Result

Inside a run, the stage result's `testFix` names the IDs the test annotates
before and after the fix (`citedBefore`, `citedAfter`), the independent review
(`reviewRef`) and the re-run (`rerunRef`).

## Review

The qa-gatekeeper checks the retaken proof. The completion reviewer checks
that the fixed test still discharges the same obligation at its layer.
The author of the fix cannot certify it.

## Gate

PASS only when the fixed test annotates the IDs it annotated before, its proof
is current, the reviewers passed the current revision, and
`npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
error owned by this flow.
