---
name: implement-regression-fix
owner: qfai-implement
purpose: "Fix the production code behind a regression that an existing, correct test catches, and confirm the fix by that test turning GREEN again."
requires:
  - common-steering-refresh
  - common-gate-run
roles:
  - frontend-engineer
  - backend-engineer
routing-profile: default
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
4. The fix and the re-run are reported in the stage report.

The route's code review judges the fix. A UI-affecting fix, as
`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md` defines it,
adds the product-surface-reviewer to that review. The full suite and the
project gates run once, in the verify stage.

The example stays annotated by the same test. No `Change request:` row is
appended and no evidence entry is removed. A contradiction or obstacle found
here stops the work under Article IX of
`.qfai/assistant/rule/constitution.md`.

Inside a workflow run, the stage result carries the `regressionFix` receipt:
`testId` names that test, `rerunRef` its GREEN re-run, `reviewRef` its
independent review.

## Gate

The step is done when the same test is GREEN again on the fixed tree.
