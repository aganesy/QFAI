# evidence

## Purpose

Evidence files record what was actually executed and observed.
`packages/qfai` v1.7.15 treats prototyping as `full-harness` only and UI-only.

## Prototyping artifacts

Canonical files:

- `.qfai/evidence/prototyping.md`
- `.qfai/evidence/prototyping.json`
- `.qfai/evidence/render.json`
- `.qfai/evidence/browser-qa.json`
- `.qfai/evidence/fullHarness.exit.json`
- `.qfai/evidence/fullHarness.handoff.json`
- `.qfai/evidence/fullHarness.fakeUiDetection.json`

## Execution contract

Supported prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
`cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.

## Obligation matrix

| surface / mode         | specs    | runtimeGate | uiFidelity | render evidence | browser QA | fullHarness |
| ---------------------- | -------- | ----------- | ---------- | --------------- | ---------- | ----------- |
| web / full-harness     | required | required    | required   | required        | required   | required    |
| mobile / full-harness  | required | required    | required   | required        | required   | required    |
| desktop / full-harness | required | required    | required   | required        | required   | required    |
| mixed / full-harness   | required | required    | required   | required        | required   | required    |

`low-cost` and `standard` are unsupported in `packages/qfai` v1.7.15.

## Truthfulness rules

- `mode.effective` must be `full-harness`.
- `uiFidelity.mode` must be `interactive`.
- Canonical screen contracts in `discussion-*/uiux/40_screen_contracts.md` are mandatory.
- Browser QA is mandatory per screen.
- Calibration is resolved from `fullHarness.calibrationRef.packPath`; scalar caller overrides are invalid.
- `runtimeGate.evidenceRefs` must contain concrete render/browser QA/spec refs only.
- `specCoverage` refs must use concrete declared refs plus concrete observed refs. Self-reference and synthetic strings are invalid.
- `mockPaths` is a negative-only ledger. Allowed values are `fail|finding` only.

## fullHarness semantics

Required fields:

- `enabled = true`
- `runId`
- `calibrationRef.configPath`
- `calibrationRef.packPath`
- `calibrationRef.packVersion`
- `iterationCount`
- `bestIteration`
- `status`
- `reviewerSignoff`
- `reviewerLogs`
- `iterations`
- `scoringTrace`
- `limitations`

Review semantics:

- `finalDecision = accepted` -> `reviewerSignoff.status = approved`
- `finalDecision = rejected` -> `reviewerSignoff.status = rejected`
- `finalDecision = abandoned` -> `reviewerSignoff.status = abandoned`
- `reviewerLogs[last].verdict` must align with the final decision and termination semantics.

## Prohibited patterns

- `low-cost` or `standard` prototyping metadata
- `cli` prototyping execution
- self-reference such as `prototyping.json#/runtimeGate`
- synthetic refs such as `specs: ...`
- synthetic `mockPaths.status="pass"`
- hardcoded calibration pack version
