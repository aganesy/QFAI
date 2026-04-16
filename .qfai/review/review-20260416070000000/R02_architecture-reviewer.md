# R02 Architecture Reviewer

**Role**: architecture-reviewer
**Target**: spec-0012 v1.7.15-rev7
**Review Pack**: review-20260416070000000

---

## Scope

Architecture-sensitive changes in v1.7.15 rev7:

- WS-1: CalibrationPack upstream resolution (execution.ts ← CalibrationLoader; runtime.ts zero imports)
- WS-2: uiFidelity fail-closed guard (UiFidelityEvidenceError)
- WS-3: specCoverage.evidenceRefs concrete-only restriction; `isConcreteArtifactRef()` helper
- WS-4: Validator real-pack comparison; hardcoded "1.0.0" heuristic removed
- WS-5: New `prototyping/errors.ts` with 6 distinct error classes; narrow catch blocks
- WS-6: scalar calibration fields removed; obsolete field normalize-time error
- WS-7: surfacePolicy rejection message from constant

---

## Architecture Review

### WS-1: CalibrationLoader Upstream (AC-0056..0058, BR-0092, DR-0041)

- AC-0056 (CalibrationPack resolved before runFullHarness) and AC-0057 (FullHarnessRequest includes calibrationPack) correctly capture the structural change: CalibrationLoader is pre-harness in execution.ts, not in runtime.ts.
- BR-0092 is precise: `runPrototypingExecution()` MUST call CalibrationLoader pre-harness; `runtime.ts` MUST NOT import CalibrationLoader.
- DR-0041 (packHash excluded, Option B) aligns with OQ-0001 resolution — no hash field added to FullHarnessRequest.
- Architecture verdict: ✅ Contract matches design intent. No leakage of resolution into runtime.ts.

### WS-2: uiFidelity Fail-Closed Guard (AC-0059..0062, BR-0093)

- Guard order specified: after `buildUiFidelity()`, before `buildSpecCoverageSummary()`, `buildL2Evidence()`, `runFullHarness()`.
- Three guard conditions (status≠completed, missingRequiredEvidence>0, missing screen) each throw `UiFidelityEvidenceError`.
- DR-0042 (error class location = `prototyping/errors.ts`, Option A) aligns with WS-5 co-location.
- Architecture verdict: ✅ Guard sequencing is explicit and correct.

### WS-3: concrete-only evidenceRefs (AC-0063..0065, BR-0094, DR-0043)

- `isConcreteArtifactRef()` helper exported; forbidden patterns enumerated in BR-0094 (directory, self-ref, synthetic, extension-less).
- DR-0043 (configPath optional, Option A) correctly reflects that configPath absence is valid.
- Architecture verdict: ✅ Validation boundary is well-defined.

### WS-4: Real Pack Comparison (AC-0066..0068, BR-0095, DR-0044)

- BR-0095 mandates strict equality for `packVersion` and rejects the "1.0.0" special-case.
- DR-0044 (obsolete field detection = normalize-time, Option A) is consistent with BR-0097.
- Architecture verdict: ✅ Heuristic removal is complete and precise.

### WS-5: Error Taxonomy (AC-0069..0070, BR-0096)

- Exactly 6 classes in `prototyping/errors.ts`: CalibrationResolutionError, UiFidelityEvidenceError, SpecCoverageBuildError, L2EvidenceBuildError, FullHarnessRuntimeError, EvidenceWriteError.
- Each catch block in execution.ts must use only the appropriate class.
- Co-location in single file (DR-0042) prevents error class scatter.
- Architecture verdict: ✅ Taxonomy complete and scoped.

### WS-6: Scalar Config Removal (AC-0071..0073, BR-0097)

- `PrototypingCalibrationConfig` removes: thresholds.accept, thresholds.refine, maxIterations, plateauDelta, plateauLookback.
- Backward compatibility explicitly abandoned (confirmed in 09_delta.md).
- normalize-time error (DR-0044) ensures obsolete fields don't silently pass through.
- Architecture verdict: ✅ Clean break, no compatibility shim required.

### WS-7: surfacePolicy Message (AC-0074..0075, BR-0098, DR-0045)

- Message derived from `PROTOTYPING_SUPPORTED_SURFACES` constant via `.join(", ")`.
- DR-0045 (from constant, Option B) is consistent with BR-0098.
- Architecture verdict: ✅ Self-maintaining rejection message.

---

## Findings

None.

---

## Result

**PASS**

All 7 workstream architectural changes are correctly reflected in spec-0012's BR/AC/DR layers. Structural invariants (CalibrationLoader location, guard ordering, error taxonomy co-location, pack comparison strictness, config field removal) are explicitly captured. No architecture drift from the discussion pack.
