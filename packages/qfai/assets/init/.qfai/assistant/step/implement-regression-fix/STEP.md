---
name: implement-regression-fix
owner: qfai-implement
purpose: "Fix the production code behind a regression that an existing, correct test catches, and confirm the fix by that test turning GREEN again."
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
  - product-surface-reviewer
routing-profile: implementation-heavy
---

# implement-regression-fix

A correct test that annotates an example of the bound flow fails because
production code changed. This step repairs the production code and nothing
else.

## Reads

- The diagnosis: its reproduction record and the test it names.
- The test's example, and the owning contracts from the configured
  `paths.contractsDir`.
- The commands of `common-gate-run`.

## Procedure

1. Run the failing test and record its failure.
2. Fix the production code. The fix changes production code only. No test,
   story or contract file changes.
3. Re-run the same test. The same test turning GREEN again confirms the fix.
   Then run the relevant suite of
   `.qfai/assistant/skill/qfai-implement/references/relevant-test-suite.md`.
4. The fix and the re-run are recorded in
   `.qfai/evidence/implement-BF-NNNN.md` for the bound flow, after the entries
   already there, with `common-evidence-record`.

The stage review after the last step judges the fix. A UI-affecting fix, as
`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md` defines it,
adds the product-surface-reviewer to that review.

The example stays annotated by the same test. No `Change request:` row is
appended and no evidence entry is removed. A contradiction or obstacle found
here opens an on-detection session under Article IX of
`.qfai/assistant/rule/constitution.md`, recorded with `common-grilling-record`.

Inside a workflow run, the stage result carries the `regressionFix` receipt:
`testId` names that test, `rerunRef` its GREEN re-run, `reviewRef` its
independent review.

## Gate

The step is done when the same test is GREEN again on the fixed tree and the
relevant suite passes. The fix is accepted when the stage review passes it.
