---
name: implement-test-fix
owner: qfai-implement
purpose: "Repair a defective test whose annotation names an example, so that it checks what the example states and nothing else."
requires:
  - common-steering-refresh
  - common-gate-run
  - common-grilling-record
  - common-evidence-record
roles:
  - frontend-engineer
  - backend-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - completion-reviewer
routing-profile: runtime-heavy
---

# implement-test-fix

A diagnosis found a test defective. This step repairs it at the example layer.

## Passes when

Read first: the diagnosis that found the test defective, and the first ID of
its `matchedIds`. This step repairs the test when that ID is an EX. When it is
a BF or an AC, this layer holds no defect: the step passes, naming that ID, and
`atdd-test-fix` repairs the test, as `.qfai/assistant/rule/test-layers.md` maps
those layers. A pass while the first matched ID is an EX is refused.

## Reads

- The diagnosis: its reproduction record and the test it names.
- The example the test annotates, and its acceptance criterion.
- `.qfai/assistant/skill/qfai-implement/references/oracle-strength.md`, for
  what a sound assertion is.
- The commands of `common-gate-run`.

## Procedure

1. Record the IDs the test annotates before the fix.
2. Fix the test. The fixed test annotates the same IDs as before. Its file or
   test title may change. No story, contract or `decisions.md` file changes.
3. Re-run the fixed test and record the result.
4. The re-run is recorded in `.qfai/evidence/implement-BF-NNNN.md` for the
   bound flow, by `common-evidence-record`.

The stage review after the last step judges the fix.

A fix after which the expectation would check a different ID returns
`needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
`resolvingOwner`. No accepted test fix is returned for it.

A contradiction found here opens an on-detection session under Article IX of
`.qfai/assistant/rule/constitution.md`, recorded with `common-grilling-record`.

Inside a workflow run, the result's `testFix` names the IDs the test annotates
before and after the fix (`citedBefore`, `citedAfter`), with an independent
review (`reviewRef`) and a re-run (`rerunRef`).

## Gate

The step is done when the fixed test annotates the same IDs and its re-run is
recorded. The fix is accepted when the stage review passes it.
