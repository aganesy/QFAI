# R03 Architecture Review

## Verdict: PASS

## Findings

- **[warn] No TC entry for WS-7 constraint**: TC-01 through TC-08 in 09_Constraints.md cover WS-1 through WS-6 but contain no explicit technical constraint for WS-7 (surfacePolicy.ts message generation). REQ-0018 specifies the requirement correctly, and OQ-0005 documents the rationale. However, a TC pairing (e.g., "TC-09: surfacePolicy.ts rejection message must be generated from `PROTOTYPING_SUPPORTED_SURFACES` constant; hardcoded surface strings are prohibited") would complete the constraint traceability chain. Not blocking; the requirement is enforceable via AC-007-*.

- **[note] DoD-7 absent from 05_Scope.md** (cross-referenced from R01): The DoD table ends at DoD-6. WS-7's success condition is architecturally low-risk (string constant join), but a formal DoD-7 entry would ensure the condition is verifiable at PR gate time.

## Architecture decision consistency (§5 / Inception Deck)

The flowchart in 02_Inception-Deck.md §5 correctly models the post-rev7 execution path: `resolveCalibrationPack → uiFidelity guard → buildSpecCoverageSummary → buildL2Evidence → runFullHarness → writeEvidenceBundle`. This is consistent with REQ-0001, REQ-0007, and the ordering constraint in TC-04 / OC-02.

## 6-error-class taxonomy

The taxonomy is internally consistent with no overlap and no gap:

| Error Class | Trigger Phase | REQ |
|---|---|---|
| CalibrationResolutionError | pack resolution | REQ-0001, REQ-0014 |
| UiFidelityEvidenceError | uiFidelity guard | REQ-0004/0005/0006 |
| SpecCoverageBuildError | buildSpecCoverageSummary | REQ-0008/0009 |
| L2EvidenceBuildError | buildL2Evidence | REQ-0013/0014 |
| FullHarnessRuntimeError | runFullHarness | REQ-0013/0014 |
| EvidenceWriteError | writeEvidenceBundle | REQ-0013/0014 |

Each phase has exactly one dedicated error class; catch-all removal (REQ-0014) is achievable.

## Pack resolution pattern soundness

Centralising resolution in `execution.ts` is architecturally sound: `runtime.ts` becomes a pure consumer (no I/O, no `CalibrationLoader` import), eliminating dual responsibility. The `calibrationRef` metadata passthrough (`packPath`, `packVersion`, `configPath?`) provides the audit trail without coupling runtime to the loader. TC-03 and REQ-0003 enforce the import prohibition at the module level.

## TC ↔ REQ alignment

| TC-ID | Corresponding REQ/NFR |
|---|---|
| TC-03 | REQ-0003 (runtime.ts zero CalibrationLoader imports) |
| TC-04 | REQ-0007 (uiFidelity guard ordering) |
| TC-05 | REQ-0008, REQ-0009 (concrete artifact refs) |
| TC-06 | REQ-0010, REQ-0012 (real pack comparison; heuristic removal) |
| TC-07 | NFR-0004 (TypeScript strict compliance) |
| TC-08 | OQ-0001 resolution (packHash deferred) |

All present-and-accounted-for TC entries correctly map to their REQ counterparts.

## Rejected options and recurrence prevention

OQ-0005 Option A rejection explicitly states the root cause ("hardcoded string diverging from constant; staleness problem can recur") and the adopted remedy (generate from constant) prevents recurrence. Other rejections (OQ-0001 through OQ-0004) provide rationale without introducing design contradictions.

## Decision

PASS
