# 05 Scope

## In Scope

| File / Directory | Workstream(s) | Change Type |
|---|---|---|
| `packages/qfai/src/core/prototyping/execution.ts` | WS-1, WS-2, WS-3, WS-5 | Modify |
| `packages/qfai/src/core/harness/runtime.ts` | WS-1 | Modify (remove CalibrationLoader import; update FullHarnessRequest) |
| `packages/qfai/src/core/calibration/loader.ts` | WS-1 | Modify (ensure consistent with runtime import removal) |
| `packages/qfai/src/core/prototyping/specCoverage.ts` | WS-3 | Modify (remove directory ref injection; enforce concrete refs) |
| `packages/qfai/src/core/prototyping/uiFidelityBuilder.ts` | WS-2 | Modify (document completed-only contract; status vocabulary) |
| `packages/qfai/src/core/validators/prototypingEvidence.ts` | WS-3, WS-4 | Modify (add isConcreteArtifactRef; add calibration metadata comparison) |
| `packages/qfai/src/core/config.ts` | WS-6 | Modify (remove scalar calibration fields; add obsolete field error) |
| `packages/qfai/src/core/prototyping/surfacePolicy.ts` | WS-7 | Modify (generate rejection message from PROTOTYPING_SUPPORTED_SURFACES) |
| `packages/qfai/src/core/prototyping/errors.ts` | WS-5 | **New file** (6 distinct error classes) |
| `packages/qfai/assets/init/root/qfai.config.yaml` | WS-6 | Modify (remove scalar fields; packPath-only) |
| `packages/qfai/README.md` | WS-6 | Modify (align config example and description with packPath-only) |
| `packages/qfai/tests/core/prototypingExecution.test.ts` | WS-1, WS-2, WS-5 | Update |
| `packages/qfai/tests/core/harnessRuntime.test.ts` (or equivalent) | WS-1 | Update |
| `packages/qfai/tests/core/specCoverage.test.ts` (or equivalent) | WS-3 | Update |
| `packages/qfai/tests/core/prototypingValidator.test.ts` | WS-3, WS-4 | Update |
| `packages/qfai/tests/core/uiFidelityBuilder.test.ts` (or equivalent) | WS-2 | Update |
| `packages/qfai/tests/core/config.test.ts` | WS-6 | Update |
| CLI and integration test fixtures containing config with scalar fields | WS-6 | Update |

## Out of Scope

| Item | Reason |
|---|---|
| `repo root .qfai/**` | Explicitly excluded (design doc §4-2) |
| Migration guide / backward compat tooling | 後方互換は完全に捨てる (design doc §0) |
| v1.8 new features | Different release scope |
| Non-UI prototyping re-introduction | Removed in previous cycles |
| `standard` / `low-cost` mode re-introduction | Removed in rev6 |
| `packHash` in `calibrationRef` | Deferred by design (OQ-0001 resolved: defer) |
| Discussion runtime redesign | Out of package scope |

## Definition of Done (DoD)

All 6 DoD conditions from design doc §5 must be satisfied:

| DoD-ID | Condition | Workstream |
|---|---|---|
| DoD-1 | `runPrototypingExecution()` resolves CalibrationPack; `runFullHarness()` receives CalibrationPack object; `runtime.ts` has 0 CalibrationLoader imports | WS-1 |
| DoD-2 | `uiFidelity.status !== "completed"`, `missingRequiredEvidence.length > 0`, or missing required screen → execution fails before `runFullHarness()` | WS-2 |
| DoD-3 | `specCoverage.evidenceRefs` has 0 directory/self/synthetic refs; validator rejects all non-concrete refs | WS-3 |
| DoD-4 | Validator compares `packPath`, `packVersion`, `configPath` (if present) against actual pack; mismatch is error | WS-4 |
| DoD-5 | 6 distinct error classes; 0 catch blocks misclassify non-calibration failures as `CalibrationResolutionError` | WS-5 |
| DoD-6 | Scalar calibration fields absent from config schema, shipped template, and README; obsolete field input causes error | WS-6 |
| DoD-7 | `surfacePolicy.ts` rejection message generated from `PROTOTYPING_SUPPORTED_SURFACES` constant; 0 hardcoded stale surface names (e.g., `cli`) in the message | WS-7 |
