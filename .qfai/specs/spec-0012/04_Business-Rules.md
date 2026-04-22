# 04 Business Rules

## BR-0012-0001: Skill-First Interface

- Prototyping is initiated through `/qfai-prototyping [--auto]`.
- `qfai prototyping` is not a supported active command.

## BR-0012-0002: Mandatory UI Evidence

- Every declared screen in `.qfai/contracts/ui/*.yaml` must have:
  - `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
  - `.qfai/evidence/prototyping/html/<screen-id>.html`

## BR-0012-0003: Missing Evidence Is Fail-Closed

- If either the screenshot or HTML snapshot is missing, the screen is treated as incomplete.
- The iteration cannot be accepted until evidence is re-captured.

## BR-0012-0004: L1/L2/L3 Roles

- L1 evaluates implementation fidelity and blocking UI failures.
- L2 evaluates product experience, 3-layer axes, and design-system alignment.
- L3 performs reviewer / verify gate auditing.

## BR-0012-0005: Evaluator Inputs

- L1/L2 evaluation uses screenshots, HTML snapshots, axis definitions, previous score, and design-system checklist.
- Reviewer findings must explicitly name missing mandatory inputs.

## BR-0012-0006: Validate Gate

- `qfai validate --fail-on error` is the machine gate for schema/evidence integrity.
- Validate does not replace human/sub-agent evaluation.

## BR-0012-0007: Verify Gate

- `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings.
- Completion is blocked on `REVISE`.

## BR-0012-0008: Legacy Validation Slice

- The following artifacts may still be validated when present:
  - `executionPlan`
  - `scoringTrace[].screenshotDir`
  - Lighthouse evidence for web legacy full-harness artifacts
  - `designSystemCompliance`
  - calibration overrides
- These checks are validator/reference behavior only and must not be interpreted as a public runtime contract.

## BR-0012-0009: Non-UI Exclusion

- `ui_bearing: false` specs are excluded from prototyping execution.
- Validate must not over-fire UI evidence rules when there is no screen contract.

## BR-0012-0010: Legacy Traceability IDs

- Existing user-story and test-case IDs in the `US-0012-*` and `TC-0012-*` spaces remain reserved.
- New wording may supersede old runtime narratives without renumbering historical coverage IDs.
