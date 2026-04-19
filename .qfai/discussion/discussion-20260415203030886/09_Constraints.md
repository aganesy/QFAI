# 09 Constraints

## Technical Constraints

| TC-ID | Constraint | Source | Impact |
|---|---|---|---|
| TC-01 | Only `packages/qfai/**` is in scope. `repo root .qfai/**`, mono-repo root scripts, and other packages must not be modified. | SRC-0001 §4-2 | Implementation must not touch any file outside `packages/qfai/`. |
| TC-02 | Backward compatibility is completely abandoned. No fallback semantics, partial compatibility, or migration paths are required. | SRC-0001 §0; 後方互換は完全に捨てる | Any breaking change to public API types, config schema, or shipped template is acceptable. |
| TC-03 | `runtime.ts` must not import `CalibrationLoader`. Pack resolution is execution.ts's responsibility. | SRC-0001 WS-1 | Any lint rule or architecture test that checks imports must be satisfied. |
| TC-04 | The uiFidelity guard (WS-2) must be placed **after** `buildUiFidelity()` and **before** `buildSpecCoverageSummary()`, `buildL2Evidence()`, and `runFullHarness()`. | SRC-0001 WS-2 | Ordering constraint on execution.ts control flow. |
| TC-05 | `specCoverage.evidenceRefs` entries must pass `isConcreteArtifactRef()`. The validator must enforce this for both `specCoverage.evidenceRefs` and `runtimeGate.evidenceRefs`. | SRC-0001 WS-3 | `isConcreteArtifactRef()` must cover all forbidden ref patterns: directory, self-ref, synthetic token, extension-less. |
| TC-06 | Validator calibration metadata check must use real pack resolution (read and parse actual pack file). No version heuristics (e.g., hardcoded `"1.0.0"` special-case) permitted. | SRC-0001 WS-4 | Validator incurs I/O cost on every validation run; must complete within NFR-0003 budget. |
| TC-07 | TypeScript `strict: true` must be satisfied across all new and modified files. `@ts-ignore`, `@ts-nocheck`, and bare `as` type assertions are prohibited. | QFAI repo convention; NFR-0004 | All type signatures must be explicit and correct. |
| TC-08 | `packHash` field inclusion in `calibrationRef` is deferred. The current implementation must not require `packHash` for validation to pass. | SRC-0001 WS-4; OQ-0001 resolved | `FullHarnessRequest.calibrationRef` and validator logic must not reference `packHash`. |

## Operational Constraints

| OC-ID | Constraint | Source | Impact |
|---|---|---|---|
| TC-09 | `surfacePolicy.ts` rejection message must be generated from the `PROTOTYPING_SUPPORTED_SURFACES` constant, not from a hardcoded string literal. | SRC-0001 WS-7; REQ-0018; OQ-0005 resolved | Prevents stale message recurrence when the constant changes in a future cycle. |

## Operational Constraints

| OC-ID | Constraint | Source | Impact |
|---|---|---|---|
| OC-01 | All 7 workstreams (WS-1 through WS-7) must be delivered in a single PR. No partial-workstream PRs permitted. | SRC-0001 §0 | Implementation plan must ensure all DoD conditions are satisfiable within one PR. |
| OC-02 | Recommended implementation order: **WS-6 → WS-1 → WS-5 → WS-2 → WS-3 → WS-4 → WS-7 → tests/docs**. WS-6 first because it establishes the packPath-only contract that subsequent workstreams depend on. WS-5 (errors.ts) before WS-2/WS-3/WS-4 so error classes are available when catch blocks are added. | SRC-0001 §6; OC-01 | Implementors must follow this order to avoid import-before-definition errors. |
