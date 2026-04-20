# 10 Policy

## Review Semantics Policy

The following vocabulary and mapping rules are mandatory for prototyping review artifacts:

- `reviewerSignoff.status` MUST use: `approved`, `rejected`, `abandoned`
- `reviewerLogs[].verdict` MUST use: `approve`, `revise`, `reject`, `abandon`
- Verdict-to-signoff mapping:
  - harness accepts quality gate → `approve` / `approved`
  - explicit reviewer rejection → `reject` / `rejected`
  - plateau detected, iteration limit reached, or runtime failure → `abandon` / `abandoned`
- `isCompleted: true` alone MUST NOT produce `approved`

## Surface Rejection Policy

- Any call to prototyping CLI, execution, or validator with a surface not in `PROTOTYPING_SUPPORTED_SURFACES` MUST result in an error.
- The error message MUST name the rejected surface and state that only UI-bearing surfaces are supported.
- Fail-closed is mandatory; fail-open is a policy violation.

## Mode Rejection Policy

- Any call to prototyping CLI, execution, or validator with `mode !== "full-harness"` MUST result in an error.
- The error message MUST state: "packages/qfai v1.7.15 supports full-harness mode only."

## Calibration Policy

- `runFullHarness()` MUST resolve calibration from the pack at `calibrationRef.packPath`.
- Scalar threshold parameters in `runFullHarness()` call signature are prohibited.
- Pack resolution failure MUST throw immediately with a path-inclusive error message.
- Runtime summary's `calibrationRef.packPath` MUST match the path used by the validator.

## EvidenceRef Policy

- `runtimeGate.evidenceRefs` entries MUST be concrete artifact refs (render summary, screenshot, Browser QA phase/finding ref).
- `specCoverage.evidenceRefs` entries MUST be `40_screen_contracts.md#<screen-id>` spec refs or concrete observation artifact refs.
- Self-references (pointing to `prototyping.json#/runtimeGate`) are prohibited.
- Synthetic strings (e.g., `specs: ...` free text) are prohibited.

## Testing Policy

- All new test files must use vitest.
- Regression tests for WS-6 must include a fixture where `screenId` and `uiContractId` differ.
- No test may assert `approved` for a plateau or maxIterations termination case.
- No test may use `cli` surface or `standard`/`low-cost` mode as a happy-path input.
