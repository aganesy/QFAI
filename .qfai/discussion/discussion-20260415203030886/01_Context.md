# 01 Context

## UI-bearing Classification

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces: (none)
- classification_rationale: The subject matter is `packages/qfai` internal library code — TypeScript runtime (`execution.ts`, `runtime.ts`), validators (`prototypingEvidence.ts`), config schema (`config.ts`), and error taxonomy (`errors.ts`). No user-facing UI screens exist. The WS-7 change updates a CLI error message string, but this is a library API surface change (correcting a string constant), not a terminal UX design task. No screen contracts, wireframes, or visual design artifacts are involved.

## Metadata

| Key               | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Discussion ID     | discussion-20260415203030886                                                 |
| Date              | 2026-04-15                                                                   |
| Owner             | agent                                                                        |
| Source            | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev7.md               |
| Upstream discussion | discussion-20260415161758193 (rev6 — provides baseline; do not duplicate)  |

## Goal and Completion Criteria

- **Goal**: Close all 6 contract gaps identified in the v1.7.15-07 audit within a single PR, producing a strict, fail-closed, auditable `packages/qfai` prototyping subsystem.
- **Measurable completion criteria** (7 DoD conditions):
  1. `runPrototypingExecution()` resolves CalibrationPack before calling `runFullHarness()`; `runtime.ts` does not import `CalibrationLoader`.
  2. `uiFidelity.status !== "completed"`, `missingRequiredEvidence.length > 0`, or missing required screen → execution fails before `runFullHarness()`.
  3. `specCoverage.evidenceRefs` contains only concrete artifact refs; directory paths, self-refs, synthetic tokens, and extension-less paths are rejected by validator.
  4. Validator compares `calibrationRef.packPath`, `packVersion`, and `configPath` (if present) against the actual pack; mismatch is error (not warning).
  5. 6 distinct error classes in `prototyping/errors.ts`; catch-all calibration error removed.
  6. Scalar calibration fields (`thresholds.accept`, `thresholds.refine`, `maxIterations`, `plateauDelta`, `plateauLookback`) removed from config schema; obsolete field input causes error.
  7. `surfacePolicy.ts` rejection message lists only `web/mobile/desktop/mixed` (from `PROTOTYPING_SUPPORTED_SURFACES` constant).

## Stakeholders

- **Primary**: QFAI package maintainers; implementors working on the v1.7.15 PR
- **Secondary**: QFAI downstream users (informed via updated shipped config template and README)

## Background

- **Audit context**: The v1.7.15-07 audit (source: `qfai_v1_7_15_07_packages_qfai_audit_report.md`) identified 6 contract gaps that were not addressed by rev6. Rev7 is a new, independent audit cycle addressing those residual findings.
- **Technical context**: Rev6 established the full-harness-only, UI-only, backward-compat-abandoned baseline. Rev7 tightens the API boundary further: pack resolution moves entirely out of `runtime.ts`, uiFidelity becomes a hard gate, error taxonomy is formalized, and config surface is narrowed to `packPath`-only.
- **Historical context**: Design evolved through rev1→rev7. Rev6 closed mode/surface contradiction issues. Rev7 closes calibration API strictness, fidelity fail-closed, traceability, validator integrity, diagnostics, and config surface issues.
- **Key principle (from design doc §0)**: 後方互換は完全に捨てる。Backward compatibility is explicitly and completely abandoned.

## Inputs

- Existing repository facts: `packages/qfai/src/core/prototyping/`, `packages/qfai/src/core/harness/runtime.ts`, `packages/qfai/src/core/validators/prototypingEvidence.ts`, `packages/qfai/src/core/config.ts`, `packages/qfai/src/core/calibration/loader.ts`, `packages/qfai/src/core/prototyping/surfacePolicy.ts`
- External references: Design document rev7 (SRC-0001), v1.7.15-07 audit report (SRC-0002), canonical unified requirements spec (SRC-0003), upstream rev6 discussion (SRC-0004)
- Assumptions: Backward compatibility is explicitly abandoned. No migration tooling required. Single PR delivery. `packHash` inclusion is deferred (OQ-0001).

## Key Issues

- **Issue 1 (WS-3)**: `specCoverage.evidenceRefs` is not restricted to concrete artifact refs — directory paths can be included, making the traceability ledger unauditable.
- **Issue 2 (WS-4)**: Validator resolves the calibration pack but does not compare `packPath`, `packVersion`, or `configPath` in the summary metadata against the actual pack, allowing summary forgery to go undetected.
- **Issue 3 (WS-1)**: `runFullHarness()` API is still path-driven; runtime internally resolves the pack, creating dual responsibility and an ambiguous request contract.
- **Issue 4 (WS-2)**: `uiFidelity.status = "insufficient-evidence"` does not stop execution; `runFullHarness()` is still called on incomplete UI evidence.
- **Issue 5 (WS-5)**: A wide `try/catch` in `execution.ts` maps all failures to `Failed to load calibration pack`, misclassifying `UiFidelityEvidenceError`, `EvidenceWriteError`, etc.
- **Issue 6 (WS-6)**: `config.ts` schema, shipped config template, and README still expose scalar calibration fields (`thresholds.accept/refine`, `maxIterations`, `plateauDelta`, `plateauLookback`) that contradict the pack SSOT model.
- **Issue 7 (WS-7, minor)**: `surfacePolicy.ts` rejection message includes stale `cli` surface string instead of reading from `PROTOTYPING_SUPPORTED_SURFACES` constant.
