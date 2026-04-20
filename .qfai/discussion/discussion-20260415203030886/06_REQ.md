# 06 Requirements

## Functional Requirements

| REQ-ID   | Title                                                               | Description                                                                                                                                                                         | Source             | Priority | Status |
|----------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|----------|--------|
| REQ-0001 | execution.ts resolves CalibrationPack before runFullHarness         | `runPrototypingExecution()` must call `CalibrationLoader` (or equivalent) in its own pre-harness phase and obtain a resolved `CalibrationPack` object before invoking `runFullHarness()`. | SRC-0001 WS-1      | must     | draft  |
| REQ-0002 | FullHarnessRequest includes calibrationPack object                  | `FullHarnessRequest` must include `calibrationPack: CalibrationPack` (resolved object) and `calibrationRef: { packPath: string; packVersion: string; configPath?: string }`. Scalar threshold parameters must be absent from the type.| SRC-0001 WS-1      | must     | draft  |
| REQ-0003 | runtime.ts does not import CalibrationLoader                        | `packages/qfai/src/core/harness/runtime.ts` must have zero imports of `CalibrationLoader` or any calibration pack resolution utility. The runtime must read calibration data from `request.calibrationPack.pack.measurement` only. | SRC-0001 WS-1      | must     | draft  |
| REQ-0004 | uiFidelity.status !== "completed" causes execution failure          | If `buildUiFidelity()` returns a result where `status !== "completed"`, `execution.ts` must throw `UiFidelityEvidenceError` immediately, before any subsequent phase. | SRC-0001 WS-2      | must     | draft  |
| REQ-0005 | missingRequiredEvidence.length > 0 causes execution failure         | If `uiFidelity.missingRequiredEvidence.length > 0`, `execution.ts` must throw `UiFidelityEvidenceError` immediately, naming the missing evidence type(s) in the error message. | SRC-0001 WS-2      | must     | draft  |
| REQ-0006 | Missing required screens in screenSummaries causes execution failure | If any screen required by `screenContractInputs` is absent from `uiFidelity.screenSummaries`, `execution.ts` must throw `UiFidelityEvidenceError` naming the missing screen(s). | SRC-0001 WS-2      | must     | draft  |
| REQ-0007 | runFullHarness not called when uiFidelity incomplete                | The uiFidelity guard (REQ-0004, REQ-0005, REQ-0006) must be evaluated after `buildUiFidelity()` and before `buildSpecCoverageSummary()`, `buildL2Evidence()`, and `runFullHarness()`. | SRC-0001 WS-2      | must     | draft  |
| REQ-0008 | specCoverage.evidenceRefs accepts only concrete artifact refs       | `specCoverage.evidenceRefs` must contain only: (a) spec anchor refs (e.g., `40_screen_contracts.md#screen-<id>`), (b) render summary refs, (c) screenshot refs, (d) browser QA artifact refs. No directory paths, self-refs, synthetic tokens, or extension-less paths. | SRC-0001 WS-3      | must     | draft  |
| REQ-0009 | prototypingEvidence.ts rejects directory paths, self-refs, synthetic tokens | `prototypingEvidence.ts` must export `isConcreteArtifactRef(ref: string): boolean` and use it to validate `specCoverage.evidenceRefs` and `runtimeGate.evidenceRefs`. Directory paths, pack root paths, `.qfai/evidence/prototyping.json#/...` self-refs, `specs:` prefix tokens, and extension-less paths without anchors must all return `false`. | SRC-0001 WS-3      | must     | draft  |
| REQ-0010 | Validator resolves calibrationRef.packPath and compares metadata    | `prototypingEvidence.ts` validator must resolve `evidence.fullHarness.calibrationRef.packPath`, read the actual pack, and compare `packPath` (normalized), `packVersion` (strict equality), and `configPath` (strict equality if present in summary). | SRC-0001 WS-4      | must     | draft  |
| REQ-0011 | Calibration metadata mismatch is validator error (not warning)      | Any mismatch found in REQ-0010 comparison must be added to `issues` as an error via `issues.push(error(...))`. The validator must not add a warning and pass. | SRC-0001 WS-4      | must     | draft  |
| REQ-0012 | Hardcoded "1.0.0" heuristic removed from validator                 | Any logic in `prototypingEvidence.ts` that checks `packVersion === "1.0.0"` or similar version heuristics as a special case must be removed and replaced with the real-pack comparison from REQ-0010. | SRC-0001 WS-4      | must     | draft  |
| REQ-0013 | 6 distinct error classes in prototyping/errors.ts                  | A new file `packages/qfai/src/core/prototyping/errors.ts` must export exactly: `CalibrationResolutionError`, `UiFidelityEvidenceError`, `SpecCoverageBuildError`, `L2EvidenceBuildError`, `FullHarnessRuntimeError`, `EvidenceWriteError`. Each must extend `Error`. | SRC-0001 WS-5      | must     | draft  |
| REQ-0014 | Catch-all CalibrationResolutionError for non-calibration failures removed | `execution.ts` must not have a single wide `try/catch` that maps all errors to `CalibrationResolutionError` (or to a message containing "Failed to load calibration pack"). Each execution phase must have its own narrow catch block using the appropriate error class. | SRC-0001 WS-5      | must     | draft  |
| REQ-0015 | Scalar calibration config fields removed from schema               | `PrototypingCalibrationConfig` in `config.ts` must not contain `thresholds.accept`, `thresholds.refine`, `maxIterations`, `plateauDelta`, or `plateauLookback`. Default config values for these fields must also be removed. | SRC-0001 WS-6      | must     | draft  |
| REQ-0016 | Obsolete scalar calibration fields in config cause error           | If a user's config input contains any of `thresholds.accept`, `thresholds.refine`, `maxIterations`, `plateauDelta`, or `plateauLookback`, the config normalization step must throw an error (not silently ignore). | SRC-0001 WS-6      | must     | draft  |
| REQ-0017 | Shipped config template uses packPath-only                         | `packages/qfai/assets/init/root/qfai.config.yaml` must contain only `prototyping.calibration.packPath` under the calibration section. No scalar calibration fields may appear in the shipped template. `packages/qfai/README.md` config examples must match. | SRC-0001 WS-6      | must     | draft  |
| REQ-0018 | surfacePolicy.ts rejection message matches PROTOTYPING_SUPPORTED_SURFACES | The error message thrown by `assertSupportedPrototypingSurface()` in `surfacePolicy.ts` must be generated from the `PROTOTYPING_SUPPORTED_SURFACES` constant (e.g., by joining its members). The message must not hardcode `cli` or any other stale surface string. | SRC-0001 WS-7      | must     | draft  |

## Requirement Dependency Map

| REQ-ID   | Depends On           | Notes                                                              |
|----------|----------------------|--------------------------------------------------------------------|
| REQ-0001 | —                    | Independent; requires CalibrationLoader (existing)                 |
| REQ-0002 | REQ-0001             | FullHarnessRequest shape depends on resolved pack contract         |
| REQ-0003 | REQ-0001, REQ-0002   | runtime.ts import removal follows new request contract             |
| REQ-0004 | REQ-0001             | Guard is placed after pack resolution in execution.ts              |
| REQ-0005 | REQ-0004             | Additional condition on same guard block                           |
| REQ-0006 | REQ-0004             | Additional condition on same guard block                           |
| REQ-0007 | REQ-0004, REQ-0005, REQ-0006 | Ordering requirement: guard before harness phases          |
| REQ-0008 | —                    | Independent; specCoverage.ts change                                |
| REQ-0009 | REQ-0008             | Validator enforcement of same concrete-ref rule                    |
| REQ-0010 | REQ-0001             | Validator needs calibrationRef from execution-resolved metadata    |
| REQ-0011 | REQ-0010             | Severity classification of mismatch result                         |
| REQ-0012 | REQ-0010             | Heuristic removal follows real-pack comparison                     |
| REQ-0013 | —                    | New file; no code dependencies                                     |
| REQ-0014 | REQ-0013             | Narrow catch blocks use the new error classes                      |
| REQ-0015 | —                    | Independent; config.ts schema change                               |
| REQ-0016 | REQ-0015             | Normalize-time error for removed fields                            |
| REQ-0017 | REQ-0015, REQ-0016   | Shipped template must be consistent with schema                    |
| REQ-0018 | —                    | Independent; surfacePolicy.ts string change                        |

## Traceability: REQ → US

| REQ-ID   | User Story |
|----------|-----------|
| REQ-0001 | US-001    |
| REQ-0002 | US-001    |
| REQ-0003 | US-001    |
| REQ-0004 | US-002    |
| REQ-0005 | US-002    |
| REQ-0006 | US-002    |
| REQ-0007 | US-002    |
| REQ-0008 | US-003    |
| REQ-0009 | US-003    |
| REQ-0010 | US-004    |
| REQ-0011 | US-004    |
| REQ-0012 | US-004    |
| REQ-0013 | US-005    |
| REQ-0014 | US-005    |
| REQ-0015 | US-006    |
| REQ-0016 | US-006    |
| REQ-0017 | US-006    |
| REQ-0018 | US-007    |
