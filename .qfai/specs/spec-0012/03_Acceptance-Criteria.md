# 03 Acceptance Criteria

## Active Acceptance Criteria

### AC-0012-0084

- `qfai-prototyping` SKILL.md contains a Delegation Scope Table.
- The table includes `UI implementation`, `Screenshot capture`, `Evaluation L1-L2`, and `Build`.
- Invalid or undefined roles are surfaced as findings instead of silently ignored.

### AC-0012-0085

- The skill documents an iteration gate.
- A single-pass "converged" narrative is rejected.
- Reviewer guidance requires rerun when mandatory evidence is missing.

### AC-0012-0086

- The skill documents Step 0 execution planning.
- Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
- Step 0 is positioned before the first capture/evaluation cycle.

### AC-0012-0087

- Screenshot capture guidance exists as a shared asset/reference.
- The asset is not described as a public CLI surface.
- Failure behavior is fail-closed and does not generate fake PNG evidence.

### AC-0012-0088

- The skill or references document the ordered iteration cycle:
  - Capture Mandatory Evidence
  - Launch L1 and L2 Evaluators
  - Aggregate Findings
  - Fix and Re-capture
  - Re-evaluate

### AC-0012-0089

- The evaluator input protocol names `screenshots`, `HTML snapshots`, `axisDefs`, `previousScore`, and `designSystemChecklist`.
- Missing mandatory inputs are called out as findings or rerun triggers.

### AC-0012-0090

- The visual checklist names Color, Typography, Spacing, Border radius, Shadow, and Do's & Don'ts.
- The checklist is used as review guidance, not as a hidden runtime algorithm.

### AC-0012-0091

- When legacy `full-harness` evidence artifacts are being validated on `web`, Lighthouse evidence can still be required.
- This requirement is documented as validator/reference behavior, not as a public mode contract.

### AC-0012-0092

- If `uiux/12_design_system.md` exists, design-system compliance may be evaluated.
- If the file does not exist, design-system scoring is skipped without erroring solely for the missing score artifact.

### AC-0012-0093

- Calibration override behavior is documented for existing validator/reference helpers.
- The documentation does not reintroduce mode selection as a public user-facing contract.

## Completion Gate

- `/qfai-prototyping` completion requires `qfai validate --fail-on error` pass.
- Declared screen evidence must include both screenshot and HTML snapshot.
- `/qfai-verify` must leave a review artifact with `PASS` or `REVISE`.

## Superseded Contract Notes

- Active docs must not present `qfai prototyping` as a valid command.
- Active docs must not present `low-cost`, `standard`, or `full-harness` as the current public mode surface.
- Legacy validator slices may still refer to `full-harness` inside artifact semantics, provided they are clearly scoped as compatibility/reference behavior.
