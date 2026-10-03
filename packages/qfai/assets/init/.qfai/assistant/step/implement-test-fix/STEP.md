---
name: implement-test-fix
owner: qfai-implement
purpose: "Repair a defective test, at whatever layer, so that it checks what its business flow, criterion or example states and nothing else."
requires:
  - common-steering-refresh
  - common-gate-run
  - common-grilling-record
roles:
  - frontend-engineer
  - backend-engineer
  - acceptance-test-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - completion-reviewer
routing-profile: runtime-heavy
---

# implement-test-fix

A diagnosis found a test defective. This step repairs it, whatever layer the
first ID of the diagnosis's `matchedIds` names:
`.qfai/assistant/rule/test-layers.md` maps a BF to an E2E test, an AC to an
integration or API test, and an EX to every other layer.

## Passes when

Read first: the diagnosis, and the test it names. The step passes when the
diagnosis names no defective test. The pass names the diagnosis it read. A
pass while the diagnosis names a defective test is refused.

## Reads

- The diagnosis: its reproduction record and the test it names.
- The BF, AC or EX the test annotates, and its owning contracts.
- `.qfai/assistant/skill/qfai-implement/references/oracle-strength.md`, for
  what a sound assertion is.
- The commands of `common-gate-run`.

## Procedure

1. Record the IDs the test annotates before the fix.
2. Fix the test. The fixed test annotates the same IDs as before. Its file or
   test title may change. No story, contract or `decisions.md` file changes.
3. Re-run the fixed test and record the result.
4. The re-run is reported in the stage report.

The stage review after the last step judges the fix.

A fix after which the expectation would check a different ID is not made.
The session stops and names `/qfai-sdd` as the owner of the change.

A contradiction found here opens an on-detection session under Article IX of
`.qfai/assistant/rule/constitution.md`, recorded with `common-grilling-record`.

Inside a workflow run, the result's `testFix` names the IDs the test annotates
before and after the fix (`citedBefore`, `citedAfter`), with an independent
review (`reviewRef`) and a re-run (`rerunRef`).

## Gate

The step is done when the fixed test annotates the same IDs and its re-run is
recorded. The fix is accepted when the stage review passes it.
