# 06 Test Cases

## TC-0012-0001: All Specs in Coverage Matrix

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0001
- Verify every spec has a row in the Coverage Matrix.

## TC-0012-0002: 4-Source Diff Detection

- EX-Ref: EX-0012-0002
- AC-Refs: AC-0012-0002
- Verify changed specs detected from branch, local, mtime, and delta.md sources.

## TC-0012-0003: Default Mode Is Standard

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0003
- Verify standard mode is used when no explicit mode is specified.

## TC-0012-0004: Full-Harness Requires Opt-In

- EX-Ref: EX-0012-0004
- AC-Refs: AC-0012-0004
- Verify full-harness is not activated without explicit user opt-in.

## TC-0012-0005: API Gate Zero 404

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0005
- Verify API endpoint checks produce zero 404 results.

## TC-0012-0006: Placeholder Page REVISE

- EX-Ref: EX-0012-0005
- AC-Refs: AC-0012-0006
- Verify placeholder-only pages are marked REVISE.

## TC-0012-0007: Non-UI Skips UI Obligations

- EX-Ref: EX-0012-0003
- AC-Refs: AC-0012-0007
- Verify non-ui surfaces skip UI route checks and visual fidelity gates.

## TC-0012-0008: Evidence Dual Artifacts

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0008
- Verify both markdown and JSON evidence exist with uiFidelity for L2.

## TC-0012-0009: Full-Harness Loop Convergence

- EX-Ref: EX-0012-0004
- AC-Refs: AC-0012-0009
- Verify loop terminates at convergence or max iterations with termination reason.

## TC-0012-0010: Coverage Placeholder for EX-0012-0006

- EX-Ref: EX-0012-0006
- AC-Refs: AC-0012-0001
- Verify that migrated example EX-0012-0006 is covered by at least one test case.

## TC-0012-0011: Coverage Placeholder for EX-0012-0007

- EX-Ref: EX-0012-0007
- AC-Refs: AC-0012-0001
- Verify that migrated example EX-0012-0007 is covered by at least one test case.

## TC-0012-0012: Coverage Placeholder for EX-0012-0008

- EX-Ref: EX-0012-0008
- AC-Refs: AC-0012-0001
- Verify that migrated example EX-0012-0008 is covered by at least one test case.

## TC-0012-0013: Coverage Placeholder for EX-0012-0009

- EX-Ref: EX-0012-0009
- AC-Refs: AC-0012-0001
- Verify that migrated example EX-0012-0009 is covered by at least one test case.

## TC-0012-0014: No CLI Command References in Active Documents

- EX-Ref: EX-0012-0011, EX-0012-0012
- AC-Refs: AC-0012-0010
- Scan all active documents (specs, policies, README, SKILL.md, CHANGELOG) for the string `qfai prototyping` used as a CLI invocation. Verify zero matches. Superseded-labelled content is exempt.

## TC-0012-0015: Skill Contract SSOT Verification

- EX-Ref: EX-0012-0010
- AC-Refs: AC-0012-0011
- Verify the SKILL.md contract declares `/qfai-prototyping` as the sole invocation method and contains no CLI command fallback or alternative entry point.

## TC-0012-0016: Static-First Mode-Aware Contract

- EX-Ref: EX-0012-0013
- AC-Refs: AC-0012-0012
- Verify the SKILL.md contract declares static-first (standard) as default, documents all three modes with obligations, and does not delegate mode definitions to external policies.

## TC-0012-0017: Mode Resolution Precedence Chain

- EX-Ref: EX-0012-0014
- AC-Refs: AC-0012-0013
- Type: normal

| Step | Action                                                        | Expected                                                     |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | Set prototyping.yaml recommended_mode=low-cost                | Config ready                                                 |
| 2    | Call resolvePrototypingMode() with no user override           | effectiveMode="low-cost", source="discussion-recommendation" |
| 3    | Call resolvePrototypingMode() with user override=full-harness | effectiveMode="full-harness", source="explicit-request"      |

## TC-0012-0018: Existence-Based Precedence Error

- EX-Ref: EX-0012-0015
- AC-Refs: AC-0012-0014
- Type: error

| Step | Action                                                      | Expected                                      |
| ---- | ----------------------------------------------------------- | --------------------------------------------- |
| 1    | Create prototyping.yaml with `prototyping: "not-an-object"` | File created                                  |
| 2    | Call parseDiscussionModeRecommendationWithWarnings()        | Error emitted for non-object namespaced block |
| 3    | Verify no legacy fallback occurred                          | Legacy path not invoked                       |

## TC-0012-0019: Recommendation Artifact Status Values

- EX-Ref: EX-0012-0014
- AC-Refs: AC-0012-0015
- Type: normal

| Step | Action                                           | Expected                                 |
| ---- | ------------------------------------------------ | ---------------------------------------- |
| 1    | Create valid prototyping.yaml in discussion-pack | File created                             |
| 2    | Call resolveLatestRecommendationArtifact()       | status="valid", recommendation populated |
| 3    | Remove prototyping.yaml                          | File removed                             |
| 4    | Call resolveLatestRecommendationArtifact()       | status="missing"                         |

## TC-0012-0020: Obligation Matrix Derivation

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0016, AC-0012-0017
- Type: normal

| Step | Action                                                   | Expected                                                                  |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Call derivePrototypingObligations("web", "standard")     | requireRuntimeGate=true, requireUiFidelity=true, requireFullHarness=false |
| 2    | Call derivePrototypingObligations("non-ui", "standard")  | requireUiFidelity=false, requireRenderBundle=false                        |
| 3    | Call derivePrototypingObligations("web", "full-harness") | requireFullHarness=true                                                   |

## TC-0012-0021: Calibration Config Defaults

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0018
- Type: boundary

| Step | Action                                 | Expected                                                                       |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Load config with no prototyping stanza | Config loaded                                                                  |
| 2    | Check prototyping.calibration          | accept=0.8, refine=0.5, maxIterations=15, plateauDelta=0.02, plateauLookback=3 |

## TC-0012-0022: Calibration Config Custom Values

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action                                                         | Expected                   |
| ---- | -------------------------------------------------------------- | -------------------------- |
| 1    | Load config with prototyping.calibration.thresholds.accept=0.9 | Config loaded              |
| 2    | Check prototyping.calibration.thresholds.accept                | 0.9 (custom value applied) |
| 3    | Check prototyping.calibration.thresholds.refine                | 0.5 (default kept)         |

## TC-0012-0023: Report Prototyping Section Present

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0019
- Type: normal

| Step | Action                                                 | Expected                                                                                  |
| ---- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1    | Create valid prototyping evidence and prototyping.yaml | Evidence and config ready                                                                 |
| 2    | Run createReportData()                                 | Report data generated                                                                     |
| 3    | Check prototyping section in report                    | Section present with mode, obligations, evidence, harness, render, browserQa, calibration |

## TC-0012-0024: Recommendation Artifact Status Transitions

- EX-Ref: EX-0012-0017
- AC-Refs: AC-0012-0015
- Type: normal

| Step | Action                                           | Expected                                 |
| ---- | ------------------------------------------------ | ---------------------------------------- |
| 1    | Create valid prototyping.yaml in discussion-pack | File ready                               |
| 2    | Call resolveLatestRecommendationArtifact()       | status="valid", recommendation populated |
| 3    | Delete prototyping.yaml                          | File removed                             |
| 4    | Call resolveLatestRecommendationArtifact()       | status="missing"                         |
| 5    | Remove entire discussion-pack                    | Pack removed                             |
| 6    | Call resolveLatestRecommendationArtifact()       | status="no-pack"                         |

## TC-0012-0025: Calibration Config Normalization

- EX-Ref: EX-0012-0018
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action                                 | Expected                                 |
| ---- | -------------------------------------- | ---------------------------------------- |
| 1    | Load config with no prototyping stanza | Config loaded                            |
| 2    | Check calibration defaults             | accept=0.8, refine=0.5, maxIterations=15 |
| 3    | Load config with accept=0.9            | Config loaded                            |
| 4    | Check accept value                     | 0.9 (custom)                             |
| 5    | Load config with accept=2.0 (invalid)  | Config loaded                            |
| 6    | Check accept value                     | 0.8 (default, invalid replaced)          |

## TC-0012-0026: fullHarness Termination Reason

- EX-Ref: EX-0012-0019
- AC-Refs: AC-0012-0019
- Type: normal

| Step | Action                                              | Expected         |
| ---- | --------------------------------------------------- | ---------------- |
| 1    | Run full-harness loop that converges at iteration 3 | Loop completes   |
| 2    | Check terminationReason                             | "converged"      |
| 3    | Run full-harness loop that hits maxIterations (15)  | Loop completes   |
| 4    | Check terminationReason                             | "max-iterations" |

## TC-0012-0027: Mode Provenance Fields

- EX-Ref: EX-0012-0020
- AC-Refs: AC-0012-0013
- Type: normal

| Step | Action                                                 | Expected                               |
| ---- | ------------------------------------------------------ | -------------------------------------- |
| 1    | Resolve mode with namespaced discussion recommendation | Resolution complete                    |
| 2    | Check sourceSchema                                     | "namespaced"                           |
| 3    | Resolve mode with no inputs                            | Resolution complete                    |
| 4    | Check source                                           | "system-default", effective="standard" |

## TC-0012-0028: Calibration Config Field Defaults

- EX-Ref: EX-0012-0021
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action                                 | Expected                      |
| ---- | -------------------------------------- | ----------------------------- |
| 1    | Load config with no prototyping stanza | Config loaded                 |
| 2    | Check all calibration fields           | All match documented defaults |

## TC-0012-0029: Surface Inference Priority

- EX-Ref: EX-0012-0022
- AC-Refs: AC-0012-0016
- Type: normal

| Step | Action                                           | Expected                 |
| ---- | ------------------------------------------------ | ------------------------ |
| 1    | Set prototyping.yaml surface="web"               | Config ready             |
| 2    | Call inferSurfaceFromRecommendationAndEvidence() | Returns "web" (explicit) |
| 3    | Remove surface field, provide uiRoutes evidence  | Config updated           |
| 4    | Call inference again                             | Returns "web" (inferred) |

## TC-0012-0030: L1/L2 Panel Scoring Real Evidence (v1.7.15)

- EX-Ref: EX-0012-0041
- AC-Refs: AC-0012-0026-01
- Type: normal

| Step | Action                                                              | Expected                                   |
| ---- | ------------------------------------------------------------------- | ------------------------------------------ |
| 1    | Provide valid render coverage, browserQa, screen contracts, specCov | Inputs ready                               |
| 2    | Call scoreL1(inputs)                                                | L1.total > 0, axes populated from evidence |
| 3    | Call scoreL2(inputs)                                                | L2.total > 0, axes populated from evidence |

## TC-0012-0031: L1/L2 Panel Scoring Missing Evidence Error (v1.7.15)

- EX-Ref: EX-0012-0041
- AC-Refs: AC-0012-0026-01
- Type: error

| Step | Action                              | Expected                |
| ---- | ----------------------------------- | ----------------------- |
| 1    | Omit render coverage from L1 inputs | Inputs incomplete       |
| 2    | Call scoreL1(inputs)                | MeasurementError thrown |

## TC-0012-0032: weightedTotal = min(L1, L2) (v1.7.15)

- EX-Ref: EX-0012-0042
- AC-Refs: AC-0012-0026-03
- Type: normal

| Step | Action                            | Expected       |
| ---- | --------------------------------- | -------------- |
| 1    | Set L1.total=0.85, L2.total=0.70  | Values ready   |
| 2    | Call computeWeightedTotal(l1, l2) | Returns 0.70   |
| 3    | Set L1.total=0.60, L2.total=0.90  | Values updated |
| 4    | Call computeWeightedTotal(l1, l2) | Returns 0.60   |

## TC-0012-0033: Converged Blocked at Iteration 1 (v1.7.15)

- EX-Ref: EX-0012-0043
- AC-Refs: AC-0012-0026-02
- Type: boundary

| Step | Action                                                          | Expected                 |
| ---- | --------------------------------------------------------------- | ------------------------ |
| 1    | Run full-harness; iteration 1 yields weightedTotal=0.95 (>0.80) | Iteration 1 complete     |
| 2    | Check terminationReason                                         | null (still in-progress) |
| 3    | Run iteration 2; weightedTotal=0.90 with plateau met            | Iteration 2 complete     |
| 4    | Check terminationReason                                         | "converged"              |

## TC-0012-0034: Plateau and max-iterations Boundary (v1.7.15)

- EX-Ref: EX-0012-0044
- AC-Refs: AC-0012-0026-02
- Type: boundary

| Step | Action                                                            | Expected               |
| ---- | ----------------------------------------------------------------- | ---------------------- |
| 1    | Run until iterationCount=5, score delta < plateauDelta for 3 iter | Plateau detected       |
| 2    | Check terminationReason                                           | "plateau"              |
| 3    | Run separate case until iterationCount === maxIterations (15)     | Max iterations reached |
| 4    | Check terminationReason                                           | "max-iterations"       |

## TC-0012-0035: reviewerLogs Append-Only Integrity (v1.7.15)

- EX-Ref: EX-0012-0045
- AC-Refs: AC-0012-0026-02
- Type: normal

| Step | Action                           | Expected                                      |
| ---- | -------------------------------- | --------------------------------------------- |
| 1    | Complete iteration 1             | reviewerLogs.length === 1                     |
| 2    | Complete iteration 2             | reviewerLogs.length === 2, first entry intact |
| 3    | Verify reviewerLogs[0] unchanged | Matches iteration 1 log exactly               |

## TC-0012-0036: Reviewer Placeholder Rejection (v1.7.15)

- EX-Ref: EX-0012-0046
- AC-Refs: AC-0012-0027-01
- Type: error

| Step | Action                       | Expected                            |
| ---- | ---------------------------- | ----------------------------------- |
| 1    | Set reviewerId = "qfai"      | Input ready                         |
| 2    | Start full-harness execution | Runtime error: placeholder reviewer |
| 3    | Set reviewerId = ""          | Input ready                         |
| 4    | Start full-harness execution | Runtime error: reviewer required    |
| 5    | Set reviewerId = "alice"     | Input ready                         |
| 6    | Start full-harness execution | Execution proceeds (no error)       |

## TC-0012-0037: commitSha Missing Error (v1.7.15)

- EX-Ref: EX-0012-0047
- AC-Refs: AC-0012-0027-02
- Type: error

| Step | Action                         | Expected                          |
| ---- | ------------------------------ | --------------------------------- |
| 1    | Mock git SHA retrieval to fail | Mock active                       |
| 2    | Start full-harness execution   | Runtime error: commitSha required |

## TC-0012-0038: Calibration Pack Missing Error (v1.7.15)

- EX-Ref: EX-0012-0050
- AC-Refs: AC-0012-0027-03
- Type: error

| Step | Action                                | Expected                                  |
| ---- | ------------------------------------- | ----------------------------------------- |
| 1    | Remove calibration pack file          | File absent                               |
| 2    | Start full-harness; CalibrationLoader | Runtime error: calibration pack not found |

## TC-0012-0039: Missing Evidence Fail-Fast (v1.7.15)

- EX-Ref: EX-0012-0053
- AC-Refs: AC-0012-0027-04
- Type: error

| Step | Action                         | Expected                                  |
| ---- | ------------------------------ | ----------------------------------------- |
| 1    | Omit render evidence           | Input incomplete                          |
| 2    | Start measurement phase        | Runtime error: render evidence missing    |
| 3    | Restore render, omit browserQa | Input incomplete                          |
| 4    | Start measurement phase        | Runtime error: browserQa evidence missing |

## TC-0012-0040: specCoverage Zero-Seeded Rejection (v1.7.15)

- EX-Ref: EX-0012-0048
- AC-Refs: AC-0012-0028-01
- Type: boundary

| Step | Action                                      | Expected                     |
| ---- | ------------------------------------------- | ---------------------------- |
| 1    | Provide declared=5, observed=3 for uiRoutes | Input ready                  |
| 2    | Call buildSpecCoverageSummary()             | ratio=0.6 (real diff)        |
| 3    | Provide declared=0, observed=0 for all axes | Input ready                  |
| 4    | Call buildSpecCoverageSummary()             | Rejected: zero-seeded output |

## TC-0012-0041: uiFidelity Synthetic mockPaths Rejection (v1.7.15)

- EX-Ref: EX-0012-0049
- AC-Refs: AC-0012-0028-02
- Type: error

| Step | Action                                                  | Expected                               |
| ---- | ------------------------------------------------------- | -------------------------------------- |
| 1    | Build uiFidelity with no browserQa findings             | Build complete                         |
| 2    | Check mockPaths                                         | Empty (no auto-generated pass entries) |
| 3    | Attempt to inject mockPaths.status="pass" synthetically | Rejected                               |

## TC-0012-0042: extractDomLabelsWithJsdom Replaces Empty Implementation (v1.7.15)

- EX-Ref: EX-0012-0054
- AC-Refs: AC-0012-0028-03
- Type: normal

| Step | Action                                            | Expected                      |
| ---- | ------------------------------------------------- | ----------------------------- |
| 1    | Provide HTML with visible text labels             | Input ready                   |
| 2    | Call extractDomLabelsWithJsdom() in uiObservation | Returns non-empty label array |
| 3    | Search for extractHtmlLabelsFromString in source  | Not found (removed)           |

## TC-0012-0043: Docs Claim-to-Runtime Mapping (v1.7.15)

- EX-Ref: EX-0012-0052
- AC-Refs: AC-0012-0029-01
- Type: normal

| Step | Action                                                        | Expected                          |
| ---- | ------------------------------------------------------------- | --------------------------------- |
| 1    | Extract constraint claims from SKILL.md                       | Claims enumerated                 |
| 2    | For each claim, find matching validator rule or runtime error | 1:1 correspondence for all claims |

## TC-0012-0044: packVersion from Pack Metadata (v1.7.15)

- EX-Ref: EX-0012-0051
- AC-Refs: AC-0012-0029-02
- Type: normal

| Step | Action                                            | Expected                |
| ---- | ------------------------------------------------- | ----------------------- |
| 1    | Create calibration pack with metadata version 2.1 | Pack ready              |
| 2    | Load via CalibrationLoader                        | packVersion === "2.1.0" |

## TC-0012-0045: packVersion Hardcode Rejected (v1.7.15)

- EX-Ref: EX-0012-0051
- AC-Refs: AC-0012-0029-02
- Type: edge

| Step | Action                                          | Expected                     |
| ---- | ----------------------------------------------- | ---------------------------- |
| 1    | Search source for packVersion: "1.0.0" hardcode | Not found (hardcode removed) |

## TC-0012-0046: request.l1/l2 Type Removed (v1.7.15 rev2)

- EX-Ref: EX-0012-0055
- AC-Refs: AC-0012-0030-01
- Type: normal

| Step | Action                                     | Expected                 |
| ---- | ------------------------------------------ | ------------------------ |
| 1    | Inspect FullHarnessRequest type definition | l1 and l2 fields absent  |
| 2    | Attempt type assertion with l1/l2          | TypeScript compile error |

## TC-0012-0047: panelInputs Missing Throws (v1.7.15 rev2)

- EX-Ref: EX-0012-0056
- AC-Refs: AC-0012-0030-02
- Type: error

| Step | Action                                  | Expected                             |
| ---- | --------------------------------------- | ------------------------------------ |
| 1    | Call runFullHarness without panelInputs | Error thrown: "panelInputs required" |

## TC-0012-0048: Scoring Pipeline Sequence (v1.7.15 rev2)

- EX-Ref: EX-0012-0057
- AC-Refs: AC-0012-0030-03
- Type: normal

| Step | Action                                  | Expected                                  |
| ---- | --------------------------------------- | ----------------------------------------- |
| 1    | Run full-harness with valid panelInputs | validatePanelInputs called first          |
| 2    | Verify scoring sequence                 | scorePanelsFromInputs → determineDecision |
| 3    | Check no external pre-scored bypass     | Only internal scoring path exists         |

## TC-0012-0049: l2Evidence Builders Happy Path (v1.7.15 rev2)

- EX-Ref: EX-0012-0057
- AC-Refs: AC-0012-0031-01, AC-0012-0031-02
- Type: normal

| Step | Action                                                | Expected                                                |
| ---- | ----------------------------------------------------- | ------------------------------------------------------- |
| 1    | Provide discussion pack with 3-layer eval files       | Files readable                                          |
| 2    | Call buildDiscussionAxisInputs(root)                  | Returns axis counts from real artifacts                 |
| 3    | Call buildScreenContractInputs(uiFidelity, contracts) | Returns totalContracts, coveredContracts, fidelityScore |
| 4    | Call buildTrendAlignmentInputs(research)              | Returns trendSourcesChecked > 0                         |

## TC-0012-0050: l2Evidence Missing Artifact Throws (v1.7.15 rev2)

- EX-Ref: EX-0012-0058
- AC-Refs: AC-0012-0031-02
- Type: error

| Step | Action                                                        | Expected                              |
| ---- | ------------------------------------------------------------- | ------------------------------------- |
| 1    | Call buildDiscussionAxisInputs with missing eval files        | Error thrown: artifact insufficiency  |
| 2    | Call buildTrendAlignmentInputs with 0 sources                 | Error thrown: trendSourcesChecked===0 |
| 3    | Call buildScreenContractInputs with contracts>0 but covered=0 | Error: evidence failure               |

## TC-0012-0051: execution.ts L2 Dummy Removal (v1.7.15 rev2)

- EX-Ref: EX-0012-0057
- AC-Refs: AC-0012-0031-03
- Type: boundary

| Step | Action                                                 | Expected     |
| ---- | ------------------------------------------------------ | ------------ |
| 1    | Grep execution.ts for aggregateScore:0                 | Zero matches |
| 2    | Grep execution.ts for fidelityScore:0, evidenceRefs:[] | Zero matches |
| 3    | Grep execution.ts for translationConsistency:0         | Zero matches |

## TC-0012-0052: CalibrationLoader Missing Pack (v1.7.15 rev2)

- EX-Ref: EX-0012-0059
- AC-Refs: AC-0012-0032-01
- Type: error

| Step | Action                                  | Expected                  |
| ---- | --------------------------------------- | ------------------------- |
| 1    | Configure packPath to non-existent file | CalibrationLoader throws  |
| 2    | Verify no DEFAULT_PACK fallback         | Error, not default values |

## TC-0012-0053: CalibrationLoader Schema Violations (v1.7.15 rev2)

- EX-Ref: EX-0012-0059
- AC-Refs: AC-0012-0032-02
- Type: error

| Step | Action                              | Expected                           |
| ---- | ----------------------------------- | ---------------------------------- |
| 1    | Pack YAML missing version field     | Throw: "version required"          |
| 2    | Pack YAML missing thresholds.accept | Throw: "accept threshold required" |
| 3    | Pack YAML missing maxIterations     | Throw: "maxIterations required"    |
| 4    | Pack YAML missing plateauDelta      | Throw: "plateauDelta required"     |
| 5    | Pack YAML missing plateauLookback   | Throw: "plateauLookback required"  |

## TC-0012-0054: Config Fallback Weakened (v1.7.15 rev2)

- EX-Ref: EX-0012-0059
- AC-Refs: AC-0012-0032-03
- Type: boundary

| Step | Action                                    | Expected                                 |
| ---- | ----------------------------------------- | ---------------------------------------- |
| 1    | Config provides thresholds/maxIterations  | Ignored (only packPath used from config) |
| 2    | Pack has different thresholds than config | Pack values used, config values ignored  |

## TC-0012-0055: Premature Termination Guard (v1.7.15 rev2)

- EX-Ref: EX-0012-0060
- AC-Refs: AC-0012-0033-01
- Type: normal

| Step | Action                                                 | Expected                                          |
| ---- | ------------------------------------------------------ | ------------------------------------------------- |
| 1    | iterationCount=1, plateauLookback=3                    | status="in-progress", terminationReason=undefined |
| 2    | iterationCount=2, plateauLookback=3                    | status="in-progress", terminationReason=undefined |
| 3    | iterationCount=3, plateau conditions met, below accept | terminationReason="plateau"                       |

## TC-0012-0056: Validator Premature Termination Reject (v1.7.15 rev2)

- EX-Ref: EX-0012-0060
- AC-Refs: AC-0012-0033-02
- Type: error

| Step | Action                                                                   | Expected                |
| ---- | ------------------------------------------------------------------------ | ----------------------- |
| 1    | Evidence: terminationReason=plateau, iterationCount=1, plateauLookback=3 | Validator error emitted |
| 2    | Evidence: terminationReason=converged, iterationCount=1                  | Validator error emitted |

## TC-0012-0057: specCoverage Missing Spec Error (v1.7.15 rev2)

- EX-Ref: EX-0012-0061
- AC-Refs: AC-0012-0034-01
- Type: error

| Step | Action                                                             | Expected                               |
| ---- | ------------------------------------------------------------------ | -------------------------------------- |
| 1    | specNames=["spec-0001","spec-0002"], perSpecMap only has spec-0001 | Error: "spec-0002 missing in coverage" |

## TC-0012-0058: specCoverage Silent Empty Rejected (v1.7.15 rev2)

- EX-Ref: EX-0012-0061
- AC-Refs: AC-0012-0034-02
- Type: error

| Step | Action                                                     | Expected                        |
| ---- | ---------------------------------------------------------- | ------------------------------- |
| 1    | loadDeclaredSpecArtifacts returns {} despite readable dirs | Error thrown (not silent empty) |

## TC-0012-0059: DB Coverage Binary Policy (v1.7.15 rev2)

- EX-Ref: EX-0012-0061
- AC-Refs: AC-0012-0034-03
- Type: error

| Step | Action                                | Expected             |
| ---- | ------------------------------------- | -------------------- |
| 1    | declared DB objects = 3, observed = 0 | full-harness failure |

## TC-0012-0060: ScreenObservation Array Output (v1.7.15 rev2)

- EX-Ref: EX-0012-0062
- AC-Refs: AC-0012-0035-01
- Type: normal

| Step | Action                                                                                               | Expected                    |
| ---- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| 1    | Browser QA has results for "/" and "/about"                                                          | screens array has 2 entries |
| 2    | Each entry has route, htmlCaptureRef, domLabelsFound, elementsPlaced, actionsWired, mockPathFindings | All fields populated        |

## TC-0012-0061: actionsWired Unknown (v1.7.15 rev2)

- EX-Ref: EX-0012-0063
- AC-Refs: AC-0012-0035-03
- Type: boundary

| Step | Action                                | Expected                         |
| ---- | ------------------------------------- | -------------------------------- |
| 1    | Screen without browser QA interaction | actionsWired = "unknown" (not 0) |

## TC-0012-0062: uiFidelity Auto-Pass Absent (v1.7.15 rev2)

- EX-Ref: EX-0012-0064
- AC-Refs: AC-0012-0035-05
- Type: error

| Step | Action                                   | Expected                        |
| ---- | ---------------------------------------- | ------------------------------- |
| 1    | Build uiFidelity with expected mockPaths | No status="pass" auto-generated |
| 2    | Grep for synthetic pass generation code  | Not found in codebase           |

## TC-0012-0063: History Array Length Mismatch (v1.7.15 rev2)

- EX-Ref: EX-0012-0065
- AC-Refs: AC-0012-0036-02
- Type: error

| Step | Action                                   | Expected               |
| ---- | ---------------------------------------- | ---------------------- |
| 1    | iterations=[it1,it2], scoringTrace=[st1] | Error: length mismatch |
| 2    | iterations=[it1], reviewerLogs=[rl1,rl2] | Error: length mismatch |

## TC-0012-0064: bundleWriter Schema v2 Output (v1.7.15 rev2)

- EX-Ref: EX-0012-0065
- AC-Refs: AC-0012-0036-03
- Type: normal

| Step | Action                                               | Expected                     |
| ---- | ---------------------------------------------------- | ---------------------------- |
| 1    | Run bundleWriter with full-harness results           | Output uses schema v2 format |
| 2    | Check iteration entries have 8-category evidenceRefs | All 8 categories present     |
| 3    | Check no v1 schema output path exists                | Only v2 path in code         |

## TC-0012-0065: Normal Fixture Rev2 Clean (v1.7.15 rev2)

- EX-Ref: EX-0012-0066
- AC-Refs: AC-0012-0037-01
- Type: boundary

| Step | Action                                     | Expected     |
| ---- | ------------------------------------------ | ------------ |
| 1    | Grep normal fixtures for l1/l2 direct pass | Zero matches |
| 2    | Grep for packVersion:"1.0.0"               | Zero matches |
| 3    | Grep for single-iteration converged        | Zero matches |
| 4    | Grep for actionsWired=0 as normal path     | Zero matches |

## TC-0012-0066: Error Fixture Rev2 Coverage (v1.7.15 rev2)

- EX-Ref: EX-0012-0066
- AC-Refs: AC-0012-0037-02
- Type: normal

| Step | Action                                                   | Expected |
| ---- | -------------------------------------------------------- | -------- |
| 1    | Check error fixtures include missing pack                | Present  |
| 2    | Check error fixtures include missing reviewer            | Present  |
| 3    | Check error fixtures include missing discussion evidence | Present  |
| 4    | Check error fixtures include insufficient UI observation | Present  |
| 5    | Check error fixtures include per-spec coverage failure   | Present  |

## TC-0012-0067: FullHarnessIteration Required Fields (v1.7.15 rev2)

- EX-Ref: EX-0012-0067
- AC-Refs: AC-0012-0030-03
- Type: normal

| Step | Action                                                                                 | Expected     |
| ---- | -------------------------------------------------------------------------------------- | ------------ |
| 1    | Create FullHarnessIteration with all required fields                                   | Object valid |
| 2    | Verify l1, l2, weightedTotal, commitSha, reviewerId, limitations, evidenceRefs present | All non-null |

## TC-0012-0068: FullHarnessIteration Missing Field (v1.7.15 rev2)

- EX-Ref: EX-0012-0067
- AC-Refs: AC-0012-0030-03
- Type: error

| Step | Action                                        | Expected                                   |
| ---- | --------------------------------------------- | ------------------------------------------ |
| 1    | Create FullHarnessIteration missing commitSha | TypeScript compile error or runtime reject |

## TC-0012-0069: validatePanelInputs 10-Check Gate (v1.7.15 rev2)

- EX-Ref: EX-0012-0068
- AC-Refs: AC-0012-0030-02
- Type: error

| Step | Action                                                             | Expected |
| ---- | ------------------------------------------------------------------ | -------- |
| 1    | Call with renderEvidence.totalScreens === 0                        | throw    |
| 2    | Call with browserQa.executed === false                             | throw    |
| 3    | Call with discussionAxes.evidenceRefs.length === 0                 | throw    |
| 4    | Call with screenContract.totalContracts > 0 && fidelityScore === 0 | throw    |

## TC-0012-0070: panelScore Double Defense (v1.7.15 rev2)

- EX-Ref: EX-0012-0069
- AC-Refs: AC-0012-0030-03
- Type: error

| Step | Action                                               | Expected                       |
| ---- | ---------------------------------------------------- | ------------------------------ |
| 1    | aggregateScore = 1.5                                 | Error: out of 0-1 range        |
| 2    | trendSourcesChecked = 0                              | Error: trend sources required  |
| 3    | screenContract.totalContracts > 0, fidelityScore = 0 | Error: fidelity score required |

## TC-0012-0071: Canonical Surface Name Accepted (v1.7.14)

- EX-Ref: EX-0012-0070
- AC-Refs: AC-0012-0020
- Type: normal

| Step | Action                                           | Expected                            |
| ---- | ------------------------------------------------ | ----------------------------------- |
| 1    | Set prototyping configuration with surface "web" | Surface value parsed without error  |
| 2    | Run execution validation against the surface     | Validation passes; surface accepted |

## TC-0012-0072: Non-Canonical Surface Name Rejected (v1.7.14)

- EX-Ref: EX-0012-0070
- AC-Refs: AC-0012-0020
- Type: error

| Step | Action                                              | Expected                                                    |
| ---- | --------------------------------------------------- | ----------------------------------------------------------- |
| 1    | Set prototyping configuration with surface "web-ui" | Surface value parsed                                        |
| 2    | Run execution validation against the surface        | Error rejected with message indicating canonical name "web" |

## TC-0012-0073: Contradictory Classification Hard Error (v1.7.14)

- EX-Ref: EX-0012-0071
- AC-Refs: AC-0012-0021
- Type: error

| Step | Action                                                              | Expected                                                   |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Create discussion-pack with ui_bearing=true, primary_surface=non-ui | Pack loaded                                                |
| 2    | Run execution.ts against the pack                                   | Hard error thrown immediately; no fallback or continuation |

## TC-0012-0074: Valid Classification Passes Execution (v1.7.14)

- EX-Ref: EX-0012-0071
- AC-Refs: AC-0012-0021
- Type: normal

| Step | Action                                                           | Expected                                    |
| ---- | ---------------------------------------------------------------- | ------------------------------------------- |
| 1    | Create discussion-pack with ui_bearing=true, primary_surface=web | Pack loaded                                 |
| 2    | Run execution.ts against the pack                                | Classification accepted; execution proceeds |

## TC-0012-0075: Non-UI Pack Rejected by Execution (v1.7.14)

- EX-Ref: EX-0012-0071
- AC-Refs: AC-0012-0022
- Type: error

| Step | Action                                                               | Expected                                                                    |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Create discussion-pack with ui_bearing=false, primary_surface=non-ui | Pack loaded                                                                 |
| 2    | Run execution.ts against the pack                                    | Rejected with "Non-UI classification is not a prototyping execution target" |

## TC-0012-0076: UI-Bearing Pack Accepted by Execution (v1.7.14)

- EX-Ref: EX-0012-0071
- AC-Refs: AC-0012-0022
- Type: normal

| Step | Action                                                           | Expected                                               |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Create discussion-pack with ui_bearing=true, primary_surface=web | Pack loaded                                            |
| 2    | Run execution.ts against the pack                                | Pack accepted; prototyping execution proceeds normally |

## TC-0012-0077: Legacy Top-Level Key Hard Error (v1.7.14)

- EX-Ref: EX-0012-0072
- AC-Refs: AC-0012-0023
- Type: error

| Step | Action                                                      | Expected                                                            |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Create prototyping.yaml with recommended_mode at root level | YAML parsed                                                         |
| 2    | Run mode resolution                                         | Hard error returned (not warning, not fallback to namespaced block) |

## TC-0012-0078: Namespaced Key Accepted by Mode Resolution (v1.7.14)

- EX-Ref: EX-0012-0072
- AC-Refs: AC-0012-0023
- Type: normal

| Step | Action                                                                | Expected                                         |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------ |
| 1    | Create prototyping.yaml with recommended_mode inside namespaced block | YAML parsed                                      |
| 2    | Run mode resolution                                                   | Mode resolved successfully from namespaced block |

## TC-0012-0079: Semantic Mismatch Returns Null With Warning (v1.7.14)

- EX-Ref: EX-0012-0072
- AC-Refs: AC-0012-0024
- Type: error

| Step | Action                                                                                              | Expected                                        |
| ---- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | Create prototyping.yaml with recommended_mode="full-harness", allowed_modes=["low-cost","standard"] | YAML parsed                                     |
| 2    | Call extractRecommendation()                                                                        | Returns null; semantic mismatch warning emitted |

## TC-0012-0080: Consistent Mode Recommendation Accepted (v1.7.14)

- EX-Ref: EX-0012-0072
- AC-Refs: AC-0012-0024
- Type: normal

| Step | Action                                                                                          | Expected                               |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1    | Create prototyping.yaml with recommended_mode="standard", allowed_modes=["low-cost","standard"] | YAML parsed                            |
| 2    | Call extractRecommendation()                                                                    | Returns "standard"; no warning emitted |

## TC-0012-0081: CLI Surface Obligations Exclude Browser (v1.7.14)

- EX-Ref: EX-0012-0073
- AC-Refs: AC-0012-0025
- Type: normal

| Step | Action                                                     | Expected                                                |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------- |
| 1    | Create discussion-pack with surface="cli", mode="standard" | Pack loaded                                             |
| 2    | Call derivePrototypingObligations()                        | requireRenderBundle=false, requireBrowserQaBundle=false |

## TC-0012-0082: CLI Surface Requires Runtime Gate (v1.7.14)

- EX-Ref: EX-0012-0073
- AC-Refs: AC-0012-0025
- Type: boundary

| Step | Action                                                     | Expected                                                    |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| 1    | Create discussion-pack with surface="cli", mode="standard" | Pack loaded                                                 |
| 2    | Call derivePrototypingObligations()                        | requireRuntimeGate=true despite browser bundles being false |

## TC-0012-0083: Full-Harness Iteration Converged Termination (v1.7.14)

- EX-Ref: EX-0012-0074
- AC-Refs: AC-0012-0027
- Type: normal

| Step | Action                                                                                     | Expected                                                            |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1    | Configure calibration: accept=0.75, maxIterations=15, plateauDelta=0.02, plateauLookback=3 | Config loaded                                                       |
| 2    | Run full-harness iteration loop; scores improve to 0.80 by iteration 6                     | Loop executes Evaluate→Identify→Fix→Re-evaluate per iteration       |
| 3    | Check termination                                                                          | terminationReason="converged", iterationCount=6 (≥MIN_ITERATIONS=5) |

## TC-0012-0084: Full-Harness Plateau Termination (v1.7.14)

- EX-Ref: EX-0012-0074
- AC-Refs: AC-0012-0027
- Type: boundary

| Step | Action                                                                   | Expected                                                            |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1    | Configure calibration: accept=0.90, plateauDelta=0.02, plateauLookback=3 | Config loaded                                                       |
| 2    | Run iteration loop; scores plateau at 0.72 for 3 consecutive iterations  | Plateau detected                                                    |
| 3    | Check termination                                                        | terminationReason="plateau", score delta < 0.02 for lookback window |

## TC-0012-0085: Independent Evaluator Panel Minimum Score (v1.7.14)

- EX-Ref: EX-0012-0075
- AC-Refs: AC-0012-0028
- Type: normal

| Step | Action                                                                                        | Expected                                                                        |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | Launch L1 (product-surface-reviewer) and L2 (product-experience-architect) in background mode | Evaluators started without improvement history                                  |
| 2    | L1 returns score 0.65, L2 returns score 0.72                                                  | Both scores recorded                                                            |
| 3    | Calculate weightedTotal                                                                       | weightedTotal = min(0.65, 0.72) = 0.65; decision=pivot (below refine threshold) |

## TC-0012-0086: Score Scope Separation Violation Blocked (v1.7.14)

- EX-Ref: EX-0012-0076
- AC-Refs: AC-0012-0029
- Type: error

| Step | Action                                                                  | Expected                                                                                  |
| ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Attempt to copy discussion 3-layer scores into prototyping scoringTrace | Operation attempted                                                                       |
| 2    | Validate scoringTrace source                                            | Rejected: discussion scores measure design direction quality, not implementation fidelity |

## TC-0012-0087: Existence Gate Caps Score at 0.3 (v1.7.14)

- EX-Ref: EX-0012-0077
- AC-Refs: AC-0012-0030
- Type: boundary

| Step | Action                                                            | Expected                                                                |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Evaluate axis where element does not exist (existence_gate fails) | existence_gate=false                                                    |
| 2    | Attempt to assign quality_criteria score of 0.5                   | Score capped at 0.3 maximum; score cannot exceed existence_gate ceiling |

## TC-0012-0088: Asset Acquisition Emoji Forbidden (v1.7.14)

- EX-Ref: EX-0012-0078
- AC-Refs: AC-0012-0031
- Type: error

| Step | Action                                                                   | Expected                                                                                    |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 1    | Generate full-harness output with emoji U+1F600 as decorative UI element | Output generated                                                                            |
| 2    | Run asset validation                                                     | Error: emoji characters (U+1F000–U+1FAFF) forbidden as UI decoration in full-harness output |

## TC-0012-0089: Reviewer Gate Six Verification Checks (v1.7.14)

- EX-Ref: EX-0012-0079
- AC-Refs: AC-0012-0032
- Type: normal

| Step | Action                                                                                      | Expected                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Submit full-harness evidence with iterationCount=3, matching scoringTrace, improving scores | Evidence submitted                                                                                                                |
| 2    | Run reviewer gate verification                                                              | All 6 checks pass: count>1, trace matches, improvement shown, termination consistent, evaluators launched, limitations documented |

## TC-0012-0090: Validator PROT-290 Single-Iteration Convergence Warning (v1.7.14)

- EX-Ref: EX-0012-0080
- AC-Refs: AC-0012-0033
- Type: boundary

| Step | Action                                                               | Expected                                                                   |
| ---- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | Create evidence with iterationCount=1, terminationReason="converged" | Evidence loaded                                                            |
| 2    | Run prototypingEvidence validator                                    | QFAI-PROT-290 warning: single-iteration convergence is normally unexpected |

## TC-0012-0091: Maximum Delta Cap Exceeded Re-evaluation (v1.7.14)

- EX-Ref: EX-0012-0081
- AC-Refs: AC-0012-0027
- Type: boundary

| Step | Action                                                                                    | Expected                                                                     |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Record iteration with axis score delta of 0.25 (exceeds maxDeltaPerAxisPerIteration=0.15) | Delta recorded                                                               |
| 2    | Validate delta cap                                                                        | Re-evaluation required: delta 0.25 exceeds 0.15 cap; justification mandatory |

## TC-0012-0092: derivePrototypingObligations Rejects cli + full-harness (v1.7.15 rev4)

- EX-Ref: EX-0012-0082
- AC-Refs: AC-0012-0038-01
- Type: error
- Verify `derivePrototypingObligations()` throws exception when called with `surface: cli` + `mode: full-harness`

## TC-0012-0093: runFullHarness Rejects Non-Visual Surface (v1.7.15 rev4)

- EX-Ref: EX-0012-0082
- AC-Refs: AC-0012-0038-02
- Type: error
- Verify `runFullHarness()` rejects execution when surface is not UI-bearing

## TC-0012-0094: CLI Rejects cli + full-harness (v1.7.15 rev4)

- EX-Ref: EX-0012-0082
- AC-Refs: AC-0012-0038-03
- Type: error
- Verify CLI exits with error when `surface: cli` + `mode: full-harness` is specified

## TC-0012-0095: Validator Rejects cli + full-harness in prototyping.yaml (v1.7.15 rev4)

- EX-Ref: EX-0012-0082
- AC-Refs: AC-0012-0038-04
- Type: error
- Verify validator rejects `prototyping.yaml` with `surface: cli` + `allowed_modes: [full-harness]`

## TC-0012-0096: web + full-harness Accepted (v1.7.15 rev4)

- EX-Ref: EX-0012-0083
- AC-Refs: AC-0012-0038-05
- Type: normal
- Verify `surface: web` + `mode: full-harness` is accepted by all 4 layers

## TC-0012-0097: mixed + full-harness Accepted (v1.7.15 rev4)

- EX-Ref: EX-0012-0083
- AC-Refs: AC-0012-0038-05
- Type: boundary
- Verify `surface: mixed` + `mode: full-harness` is accepted (mixed includes UI)

## TC-0012-0098: Screen Contract Target Generation (v1.7.15 rev4)

- EX-Ref: EX-0012-0084
- AC-Refs: AC-0012-0039-02, AC-0012-0039-05
- Type: normal
- Verify Browser QA generates targets from screen contracts with matching count

## TC-0012-0099: "/primary" Hardcode Absent (v1.7.15 rev4)

- EX-Ref: EX-0012-0084
- AC-Refs: AC-0012-0039-01
- Type: normal
- Scan source code and verify zero occurrences of `"/primary"` as Browser QA target

## TC-0012-0100: screenContracts.ts Parser Returns Screen List (v1.7.15 rev4)

- EX-Ref: EX-0012-0084
- AC-Refs: AC-0012-0039-03
- Type: normal
- Verify `screenContracts.ts` parses `40_screen_contracts.md` and returns correct screen list

## TC-0012-0101: Per-Screen Evidence Records (v1.7.15 rev4)

- EX-Ref: EX-0012-0084
- AC-Refs: AC-0012-0039-06
- Type: normal
- Verify each screen has an individual evidence record

## TC-0012-0102: Missing Screen Contract Error (v1.7.15 rev4)

- EX-Ref: EX-0012-0085
- AC-Refs: AC-0012-0039-02
- Type: error
- Verify clear error when `40_screen_contracts.md` does not exist

## TC-0012-0103: browserQa evidenceRefs Populated (v1.7.15 rev4)

- EX-Ref: EX-0012-0087
- AC-Refs: AC-0012-0040-03
- Type: normal
- Verify `iterations[].evidenceRefs.browserQa` is populated with phase refs and finding refs

## TC-0012-0104: Empty browserQa Hard Fail (v1.7.15 rev4)

- EX-Ref: EX-0012-0086
- AC-Refs: AC-0012-0040-04
- Type: error
- Verify hard fail when `iterations[].evidenceRefs.browserQa` is empty

## TC-0012-0105: Phase and Finding Refs in Summary (v1.7.15 rev4)

- EX-Ref: EX-0012-0087
- AC-Refs: AC-0012-0040-01, AC-0012-0040-02
- Type: normal
- Verify summary includes both phase references and finding references

## TC-0012-0106: specCoverage Canonical Path Comparison (v1.7.15 rev4)

- EX-Ref: EX-0012-0088
- AC-Refs: AC-0012-0041-01
- Type: normal
- Verify specCoverage uses canonical path for route comparison

## TC-0012-0107: Trailing Slash Normalization (v1.7.15 rev4)

- EX-Ref: EX-0012-0088
- AC-Refs: AC-0012-0041-01
- Type: boundary
- Verify `/dashboard` and `/dashboard/` are treated as the same canonical path

## TC-0012-0108: URL Rejected as Route (v1.7.15 rev4)

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0041-02
- Type: error
- Verify URL with protocol/host/query is rejected as route

## TC-0012-0109: Missing Observation Report (v1.7.15 rev4)

- EX-Ref: EX-0012-0090
- AC-Refs: AC-0012-0041-04
- Type: normal
- Verify unobserved routes are reported as `missing_observation` with specific route names

## TC-0012-0110: Canonical Route Shared Logic (v1.7.15 rev4)

- EX-Ref: EX-0012-0088
- AC-Refs: AC-0012-0041-03
- Type: normal
- Verify WS-2 and WS-4 share the same canonical route derivation logic

## TC-0012-0111: L2 Structured Parse Used (v1.7.15 rev4)

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0042-02
- Type: normal
- Verify structured parse is used when all canonical artifacts are present

## TC-0012-0112: L2 Heuristic Fallback Only When Needed (v1.7.15 rev4)

- EX-Ref: EX-0012-0092
- AC-Refs: AC-0012-0042-03
- Type: boundary
- Verify heuristic fallback only activates when structured source is absent, with warning log

## TC-0012-0113: Canonical Artifacts Required (v1.7.15 rev4)

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0042-01
- Type: error
- Verify error when required canonical artifacts (20-23, 04_Sources, 40_screen_contracts) are missing

## TC-0012-0114: Stale Remediation Removed (v1.7.15 rev4)

- EX-Ref: EX-0012-0093
- AC-Refs: AC-0012-0043-01
- Type: normal
- Verify `prototypingEvidence.ts` contains no stale remediation semantics

## TC-0012-0115: skip→reject Conversion (v1.7.15 rev4)

- EX-Ref: EX-0012-0093
- AC-Refs: AC-0012-0043-02
- Type: normal
- Verify all test `skip` flags are converted to `reject`

## TC-0012-0116: URL-as-route to Canonical Route (v1.7.15 rev4)

- EX-Ref: EX-0012-0094
- AC-Refs: AC-0012-0043-03
- Type: normal
- Verify test expectations use canonical routes instead of URLs

## TC-0012-0117: "/primary" Absent from Tests (v1.7.15 rev4)

- EX-Ref: EX-0012-0094
- AC-Refs: AC-0012-0043-04
- Type: normal
- Verify zero `"/primary"` references in test files

## TC-0012-0118: README Reality Sync (v1.7.15 rev4)

- EX-Ref: EX-0012-0093, EX-0012-0096
- AC-Refs: AC-0012-0043-05
- Type: normal
- Verify README reflects current runtime behavior

## TC-0012-0119: SKILL.md and evidence README Reality Sync (v1.7.15 rev4)

- EX-Ref: EX-0012-0093
- AC-Refs: AC-0012-0043-06
- Type: normal
- Verify SKILL.md and evidence/README.md reflect current implementation

## TC-0012-0120: Parameterized Route Pattern Match (v1.7.15 rev4)

- EX-Ref: EX-0012-0095
- AC-Refs: AC-0012-0041-01
- Type: boundary
- Verify `/orders/:id` pattern matches observation `/orders/123`

## TC-0012-0121: Non-UI Surface Rejects standard mode (v1.7.15 rev5)

- EX-Ref: EX-0012-0097
- AC-Refs: AC-0012-0044-01
- Type: normal
- surface=cli, mode=standard → execution.ts rejects immediately; no prototyping proceeds

## TC-0012-0122: Non-UI Surface Rejection Reason Code Consistent (v1.7.15 rev5)

- EX-Ref: EX-0012-0097
- AC-Refs: AC-0012-0044-02
- Type: normal
- surface=cli, mode=low-cost → reason code is `unsupported_non_ui_prototyping_surface` in all rejection layers

## TC-0012-0123: UI-bearing Surface Accepted (All Modes) (v1.7.15 rev5)

- EX-Ref: EX-0012-0097
- AC-Refs: AC-0012-0044-03
- Type: boundary
- surface=web, mode=standard → accepted; surface=mobile-web, mode=full-harness → accepted

## TC-0012-0124: runFullHarness Missing Surface Throws (v1.7.15 rev5)

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0048-01
- Type: error
- runFullHarness() with no surface → immediate throw before any measurement

## TC-0012-0125: runFullHarness Missing Adapter Throws (v1.7.15 rev5)

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0048-02, AC-0012-0048-03
- Type: error
- Missing render adapter or browserQa adapter → throw; partial adapter set not accepted

## TC-0012-0126: runFullHarness Empty ScreenContracts Throws (v1.7.15 rev5)

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0048-04
- Type: boundary
- screenContracts=[] or screenContracts=undefined → throw

## TC-0012-0127: Adapter Error Propagated (v1.7.15 rev5)

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0048-06
- Type: error
- render adapter throws → error propagated; no catch-and-continue; no partial result returned

## TC-0012-0128: Unobserved Route Excluded from Ledger (v1.7.15 rev5)

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0045-01
- Type: normal
- 3 declared routes, 1 never rendered → RuntimeObservation.ui contains only 2 entries

## TC-0012-0129: runtimeGate api db Fields Absent (v1.7.15 rev5)

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0045-02
- Type: normal
- RuntimeObservation type has no api/db fields; accessing them is a TypeScript compile error

## TC-0012-0130: specCoverage Set Comparison (v1.7.15 rev5)

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0045-04
- Type: normal
- declared=["/", "/orders", "/profile"], observed.ui=[ObservedUiRoute{route:"/"}, ObservedUiRoute{route:"/orders"}] → coverage=2/3

## TC-0012-0131: Per-Screen Browser QA Executions (v1.7.15 rev5)

- EX-Ref: EX-0012-0099
- AC-Refs: AC-0012-0046-01
- Type: normal
- 3 screen contracts → 3 separate browserQaPerScreen.ts executions with distinct evidenceRefs

## TC-0012-0132: Generic Phase Ref Reuse Validator Hard Fail (v1.7.15 rev5)

- EX-Ref: EX-0012-0099
- AC-Refs: AC-0012-0046-03
- Type: error
- screen uses generic phaseLevelRef → prototypingEvidence.ts emits hard error (not warning)

## TC-0012-0133: Screen Without Refs Marked Unobserved (v1.7.15 rev5)

- EX-Ref: EX-0012-0099
- AC-Refs: AC-0012-0046-04
- Type: boundary
- screen has empty browserQaEvidenceRefs → UIScreenObservation.observed=false, evidenceMissing=true; NOT in RuntimeObservation.ui

## TC-0012-0134: actionsWired Counts Only Wired Controls (v1.7.15 rev5)

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0047-01
- Type: normal
- 3 declared, 2 DOM-observed+wired → actionsWired=2 (not 3)

## TC-0012-0135: Findings Do Not Increase actionsWired (v1.7.15 rev5)

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0047-02
- Type: normal
- same screen with 5 findings added → actionsWired=2 unchanged

## TC-0012-0136: actionsWired > actionsDeclared Validator Error (v1.7.15 rev5)

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0047-03
- Type: error
- actionsWired=5, actionsDeclared=3 → validator error QFAI-PROT-XXX

## TC-0012-0137: actionsDeclared=0 Screen is Normal (v1.7.15 rev5)

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0047-04
- Type: boundary
- actionsDeclared=0, actionsWired=0 → no error (information-only screen); contrast: actionsDeclared=2, DOM observed, actionsWired=0 → error

## TC-0012-0138: packResolver Provides Consistent Thresholds (v1.7.15 rev5)

- EX-Ref: EX-0012-0102
- AC-Refs: AC-0012-0049-01, AC-0012-0049-02
- Type: normal
- packResolver.ts called by both runtime and validator; both receive same maxIterations/plateauDelta/plateauLookback from pack

## TC-0012-0139: API Coverage in Artifact is Hard Error (v1.7.15 rev5)

- EX-Ref: EX-0012-0102
- AC-Refs: AC-0012-0049-03
- Type: error
- prototyping evidence artifact contains apiEndpoints declaration → validator hard error

## TC-0012-0140: l2Evidence Uses Structured Parser First (v1.7.15 rev5)

- EX-Ref: EX-0012-0102
- AC-Refs: AC-0012-0049-04
- Type: normal
- valid 04_Sources.md with structured sections → structuredArtifactReaders.ts parses; keyword fallback NOT used; structured parse failure → hard fail (not fallback)

## TC-0012-0141: CLI Rejects --mode standard (v1.7.15 rev6)

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0050-01
- Type: error
- `qfai prototyping --mode standard --surface web ...` → exits non-zero; stderr contains "full-harness mode only"

## TC-0012-0142: CLI Rejects --mode low-cost (v1.7.15 rev6)

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0050-02
- Type: error
- `qfai prototyping --mode low-cost --surface web ...` → exits non-zero; stderr contains "full-harness mode only"

## TC-0012-0143: CLI Accepts --mode full-harness (v1.7.15 rev6)

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0050-03
- Type: normal
- `qfai prototyping --mode full-harness --surface web ...` with valid calibration → execution proceeds; no early error exit

## TC-0012-0144: execution.ts Rejects standard Mode Independently (v1.7.15 rev6)

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0050-04
- Type: error
- execution.ts called directly with `mode: "standard"` → Error thrown before CalibrationLoader is invoked

## TC-0012-0145: Mode Check Fires Before CalibrationLoader (v1.7.15 rev6)

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0050-04
- Type: boundary
- execution.ts with `mode: "standard"` and valid packPath → Error thrown; CalibrationLoader never invoked; packPath file need not exist

## TC-0012-0146: CLI Rejects --surface cli (v1.7.15 rev6)

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0051-01
- Type: error
- `qfai prototyping --mode full-harness --surface cli ...` → exits non-zero; error names "cli" as rejected surface

## TC-0012-0147: CLI Rejects --surface api (v1.7.15 rev6)

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0051-02
- Type: error
- `qfai prototyping --mode full-harness --surface api ...` → exits non-zero; error names "api"

## TC-0012-0148: CLI Rejects --surface backend (v1.7.15 rev6)

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0051-03
- Type: error
- `qfai prototyping --mode full-harness --surface backend ...` → exits non-zero; error names "backend"

## TC-0012-0149: execution.ts Calls assertSupportedPrototypingSurface (v1.7.15 rev6)

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0051-04
- Type: normal
- execution.ts with surface="web" → assertSupportedPrototypingSurface("web") does not throw; execution continues

## TC-0012-0150: prototypingEvidence Validator Rejects cli Surface (v1.7.15 rev6)

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0051-05
- Type: error
- Recorded output contains `surface: "cli"` → validator emits error; QFAI-PROT error for unsupported surface

## TC-0012-0151: surfacePolicy isSupportedPrototypingSurface Returns False for cli (v1.7.15 rev6)

- EX-Ref: EX-0012-0105
- AC-Refs: AC-0012-0052-01
- Type: normal
- `isSupportedPrototypingSurface("cli")` → false; `isSupportedPrototypingSurface("web")` → true

## TC-0012-0152: PROTOTYPING_SUPPORTED_SURFACES Contains Exactly 4 Members (v1.7.15 rev6)

- EX-Ref: EX-0012-0105
- AC-Refs: AC-0012-0052-02
- Type: boundary
- `PROTOTYPING_SUPPORTED_SURFACES.sort()` equals `["desktop", "mixed", "mobile", "web"]`; length=4

## TC-0012-0153: assertSupportedPrototypingSurface Throws for Unknown Surface (v1.7.15 rev6)

- EX-Ref: EX-0012-0105
- AC-Refs: AC-0012-0052-01
- Type: boundary
- `assertSupportedPrototypingSurface("unknown-xyz")` → throws; `isSupportedPrototypingSurface("unknown-xyz")` → false

## TC-0012-0154: runFullHarness Missing packPath Throws Before Iteration (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-04
- Type: error
- `runFullHarness({ calibrationRef: { packPath: "./calib/missing.yaml" } })` → Error thrown; no iteration[0] in output

## TC-0012-0155: runFullHarness No calibrationRef Throws (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-04
- Type: error
- `runFullHarness({})` with no calibrationRef → Error thrown before any iteration; message states calibration required

## TC-0012-0156: runFullHarness Malformed YAML Throws at Parse (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-04
- Type: error
- packPath points to malformed YAML file → Error thrown at parse time; no iteration begins

## TC-0012-0157: runFullHarness Records Resolved packPath in Summary (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-05
- Type: normal
- `runFullHarness({ calibrationRef: { packPath: "./calib/standard.yaml" } })` with valid YAML → output summary.calibrationRef.packPath = "./calib/standard.yaml"

## TC-0012-0158: TypeScript Compile Error When Scalar Params Passed (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-01
- Type: boundary
- Attempt to call `runFullHarness({ passingThreshold: 0.95 })` → TypeScript compile error (param removed from signature)

## TC-0012-0159: Validator Rejects calibrationRef.packPath Mismatch (v1.7.15 rev6)

- EX-Ref: EX-0012-0106
- AC-Refs: AC-0012-0053-06
- Type: error
- Recorded output has calibrationRef.packPath="./calib/A.yaml" but pack at runtime was "B.yaml" → validator error

## TC-0012-0160: Validator Passes Concrete evidenceRefs (v1.7.15 rev6)

- EX-Ref: EX-0012-0107
- AC-Refs: AC-0012-0054-01, AC-0012-0054-02, AC-0012-0054-03
- Type: normal
- evidenceRefs = ["prototyping.json#/iterations/0/renderSummary", "screenshots/iter-0.png", "browserQa/iter-0-smoke.json#/findings/0"] → validator passes

## TC-0012-0161: Validator Rejects Self-Reference evidenceRef (v1.7.15 rev6)

- EX-Ref: EX-0012-0107
- AC-Refs: AC-0012-0054-04, AC-0012-0054-05
- Type: error
- evidenceRefs = ["prototyping.json#/runtimeGate"] → validator error: self-reference forbidden

## TC-0012-0162: Validator Rejects Synthetic Free-Text evidenceRef (v1.7.15 rev6)

- EX-Ref: EX-0012-0107
- AC-Refs: AC-0012-0054-06
- Type: error
- evidenceRefs = ["specs: UI matches design as per visual inspection"] → validator error: synthetic ref forbidden

## TC-0012-0163: Validator Rejects Empty evidenceRefs Array (v1.7.15 rev6)

- EX-Ref: EX-0012-0107
- AC-Refs: AC-0012-0054-05
- Type: boundary
- runtimeGate.evidenceRefs = [] → validator error: at least one concrete ref required

## TC-0012-0164: reviewerSignoff accepted Termination Produces approved (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-01
- Type: normal
- `terminationReason = "accepted"` → `reviewerSignoff.status = "approved"`; validator passes

## TC-0012-0165: reviewerSignoff plateau Termination Produces abandoned (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-03
- Type: error
- `terminationReason = "plateau"` + `status = "approved"` → validator rejects: inconsistent; correct: status = "abandoned"

## TC-0012-0166: reviewerSignoff isCompleted True Alone Does Not Produce approved (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-04
- Type: boundary
- `isCompleted: true` + `terminationReason: "plateau"` → status must be "abandoned" not "approved"; validator rejects if "approved"

## TC-0012-0167: uiFidelityBuilder Matches by screenId (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-05
- Type: normal
- obs.screenId = "screen-login", screen.screenId = "screen-login" → match found; fidelity computed

## TC-0012-0168: uiFidelityBuilder Does Not Match by uiContractId (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-05
- Type: error
- obs.screenId = "screen-login", screen.uiContractId = "screen-login", screen.screenId = "screen-001" → no match found (old path removed); observation unmatched

## TC-0012-0169: Validator Hard-Errors on uiContractId in Observation (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-06
- Type: error
- Observation record contains `uiContractId` field → validator hard-error; backward compat abandoned (OQ-0005)

## TC-0012-0170: reviewerLogs verdict Uses Mapped Vocabulary (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-01, AC-0012-0055-02
- Type: normal
- reviewerLogs[0].verdict = "approve" → validator passes; verdict = "accept" (pre-mapping) → TypeScript type error

## TC-0012-0171: Shipped Docs Do Not Contain standard or low-cost (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-03
- Type: normal
- SKILL.md, evidence/README.md, review/README.md do not contain "standard mode", "low-cost", or "mockPaths.status=pass"

## TC-0012-0172: Test Fixtures Do Not Allow cli+standard Prototyping (v1.7.15 rev6)

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0055-03
- Type: boundary
- No test fixture contains `surface: "cli"` with `mode: "standard"`; no fixture asserts `approved` for plateau termination

## TC-0012-0173: CalibrationPack Resolved — Normal Path

- EX-Ref: EX-0012-0109
- AC-Refs: AC-0012-0056, AC-0012-0057
- Type: normal
- Test: execution.ts calls CalibrationLoader with packPath; resulting CalibrationPack object passed to runFullHarness(); runtime.ts receives CalibrationPack without performing any I/O

## TC-0012-0174: CalibrationLoader Missing Pack — Error Path

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0056
- Type: error
- Test: execution.ts with missing packPath; verify CalibrationResolutionError thrown; verify runFullHarness not called

## TC-0012-0175: runtime.ts Zero CalibrationLoader Imports — Boundary

- EX-Ref: EX-0012-0111
- AC-Refs: AC-0012-0058
- Type: boundary
- Test: static analysis / grep of runtime.ts source confirms 0 import statements for CalibrationLoader; TypeScript compilation must succeed after import removal

## TC-0012-0176: uiFidelity Status Guard — Normal Path

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0059, AC-0012-0062
- Type: normal
- Test: uiFidelity.status = "completed" + 0 missingRequired + all screens present → guard passes; execution continues to buildSpecCoverageSummary

## TC-0012-0177: uiFidelity Incomplete Status — Error Path

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0059, AC-0012-0062
- Type: error
- Test: uiFidelity.status = "insufficient-evidence" → UiFidelityEvidenceError thrown before buildSpecCoverageSummary; verify runFullHarness not called

## TC-0012-0178: missingRequiredEvidence Non-Empty — Error Path

- EX-Ref: EX-0012-0113
- AC-Refs: AC-0012-0060
- Type: error
- Test: uiFidelity.missingRequiredEvidence = ["browser-qa"] → UiFidelityEvidenceError message names "browser-qa"; runFullHarness not called

## TC-0012-0179: Missing Required Screen — Error Path

- EX-Ref: EX-0012-0114
- AC-Refs: AC-0012-0061
- Type: error
- Test: required screen absent from screenSummaries → UiFidelityEvidenceError names missing screen; runFullHarness not called

## TC-0012-0180: Guard Ordering Correct — Boundary

- EX-Ref: EX-0012-0115
- AC-Refs: AC-0012-0062
- Type: boundary
- Test: execution.ts code review confirms guard placement: after buildUiFidelity() return, before buildSpecCoverageSummary() invocation; no specCoverage/L2 state produced on guard failure

## TC-0012-0181: Concrete Spec Anchor Ref — Normal Path

- EX-Ref: EX-0012-0116
- AC-Refs: AC-0012-0063, AC-0012-0065
- Type: normal
- Test: isConcreteArtifactRef("40_screen_contracts.md#screen-login") returns true; isConcreteArtifactRef("screenshots/iter-0.png") returns true; no validator error

## TC-0012-0182: Directory Path Rejected — Error Path

- EX-Ref: EX-0012-0117
- AC-Refs: AC-0012-0064, AC-0012-0065
- Type: error
- Test: isConcreteArtifactRef("./evidence/prototyping/") returns false; validator emits error for directory path in specCoverage.evidenceRefs

## TC-0012-0183: Self-Ref Rejected — Error Path

- EX-Ref: EX-0012-0118
- AC-Refs: AC-0012-0064, AC-0012-0065
- Type: error
- Test: isConcreteArtifactRef(".qfai/evidence/prototyping.json#/specCoverage") returns false; validator emits error

## TC-0012-0184: Synthetic Token Rejected — Error Path

- EX-Ref: EX-0012-0119
- AC-Refs: AC-0012-0064, AC-0012-0065
- Type: error
- Test: isConcreteArtifactRef("specs: all screens covered") returns false; validator emits error

## TC-0012-0185: Calibration Metadata Match — Normal Path

- EX-Ref: EX-0012-0120
- AC-Refs: AC-0012-0066, AC-0012-0067
- Type: normal
- Test: summary calibrationRef with matching packPath/packVersion/configPath → validator passes; 0 calibration mismatch issues

## TC-0012-0186: packVersion Mismatch Is Error — Error Path

- EX-Ref: EX-0012-0121
- AC-Refs: AC-0012-0067
- Type: error
- Test: summary packVersion = "1.0.1", actual = "1.0.2" → issues.push(error(...)) called; result has ≥1 error with kind=error (not warning)

## TC-0012-0187: "1.0.0" Heuristic Absent — Boundary

- EX-Ref: EX-0012-0122
- AC-Refs: AC-0012-0068
- Type: boundary
- Test: packVersion = "1.0.0" in summary, actual differs → validator emits error; no special-case pass for "1.0.0"; grep confirms no hardcoded "1.0.0" heuristic in prototypingEvidence.ts

## TC-0012-0188: All 6 Error Classes Exported — Normal Path

- EX-Ref: EX-0012-0123
- AC-Refs: AC-0012-0069
- Type: normal
- Test: import all 6 classes from prototyping/errors.ts; verify each extends Error; verify 0 missing classes; verify no extra classes beyond the 6

## TC-0012-0189: EvidenceWriteError on Write Failure — Error Path

- EX-Ref: EX-0012-0124
- AC-Refs: AC-0012-0070
- Type: error
- Test: writeEvidenceBundle() throws → execution.ts catch block wraps in EvidenceWriteError (not CalibrationResolutionError); message does not contain "Failed to load calibration pack"

## TC-0012-0190: FullHarnessRuntimeError on Runtime Failure — Error Path

- EX-Ref: EX-0012-0124
- AC-Refs: AC-0012-0070
- Type: error
- Test: runFullHarness() internal throw → execution.ts catch block wraps in FullHarnessRuntimeError; instanceof check identifies FullHarnessRuntimeError

## TC-0012-0191: packPath-Only Config Accepted — Normal Path

- EX-Ref: EX-0012-0125
- AC-Refs: AC-0012-0071, AC-0012-0073
- Type: normal
- Test: config with only prototyping.calibration.packPath → normalize returns without error; scalar fields absent from PrototypingCalibrationConfig type

## TC-0012-0192: Obsolete thresholds.accept Rejected — Error Path

- EX-Ref: EX-0012-0126
- AC-Refs: AC-0012-0072
- Type: error
- Test: config with thresholds.accept: 0.9 → normalize throws error; error message names "thresholds.accept" as obsolete

## TC-0012-0193: Obsolete maxIterations Rejected — Error Path

- EX-Ref: EX-0012-0126
- AC-Refs: AC-0012-0072
- Type: error
- Test: config with maxIterations: 5 → normalize throws error; error message names "maxIterations" as obsolete

## TC-0012-0194: Shipped Template Has Zero Scalar Fields — Boundary

- EX-Ref: EX-0012-0125
- AC-Refs: AC-0012-0073
- Type: boundary
- Test: grep qfai.config.yaml for thresholds/maxIterations/plateauDelta/plateauLookback → 0 matches; only packPath present under calibration

## TC-0012-0195: Rejection Message From Constant — Normal Path

- EX-Ref: EX-0012-0127
- AC-Refs: AC-0012-0074, AC-0012-0075
- Type: normal
- Test: assertSupportedPrototypingSurface("cli") → error message contains "web" and "mobile" and "desktop" and "mixed"; message does not contain hardcoded "cli"

## TC-0012-0196: Extension of PROTOTYPING_SUPPORTED_SURFACES Auto-Updates Message — Edge

- EX-Ref: EX-0012-0128
- AC-Refs: AC-0012-0074
- Type: edge
- Test: temporarily add new surface to PROTOTYPING_SUPPORTED_SURFACES in test; verify rejection message includes the new surface without modifying message code

## TC-0012-0197: isSupportedPrototypingSurface Returns False for Stale cli — Boundary

- EX-Ref: EX-0012-0127
- AC-Refs: AC-0012-0075
- Type: boundary
- Test: isSupportedPrototypingSurface("cli") returns false; isSupportedPrototypingSurface("web") returns true

## TC-0012-0198: toRepoRelativeArtifactRef() Returns POSIX Repo-Relative Path — Normal Path (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0129, EX-0012-0130
- AC-Refs: AC-0012-0076, AC-0012-0083
- Type: normal
- Test: `toRepoRelativeArtifactRef({ repoRoot: "/repo", absolutePath: "/repo/.qfai/specs/s/01.md", line: 5 })` returns `".qfai/specs/s/01.md#L5"` using POSIX separator; same on Windows host with normalized input

## TC-0012-0199: toRepoRelativeArtifactRef() Throws for Outside-Root Path — Error (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0131
- AC-Refs: AC-0012-0080
- Type: error
- Test: `toRepoRelativeArtifactRef({ repoRoot: "/repo", absolutePath: "/other-repo/file.md" })` throws; error message indicates path is outside repository root

## TC-0012-0200: toRepoRelativeArtifactRef() Throws for Directory Path — Error (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0132
- AC-Refs: AC-0012-0081
- Type: error
- Test: `toRepoRelativeArtifactRef({ repoRoot: "/repo", absolutePath: "/repo/.qfai/evidence/prototyping-iter0/" })` throws; directory path (trailing slash or no extension) is rejected

## TC-0012-0201: toRepoRelativeArtifactRef() Throws When Both line and anchor Specified — Boundary (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0133
- AC-Refs: AC-0012-0082
- Type: boundary
- Test: `toRepoRelativeArtifactRef({ repoRoot: "/repo", absolutePath: "/repo/file.md", line: 5, anchor: "section-a" })` throws; line and anchor are mutually exclusive

## TC-0012-0202: buildSpecCoverageSummary() evidenceRefs Are Concrete and Not Absolute — Normal Path (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0129, EX-0012-0142
- AC-Refs: AC-0012-0077, AC-0012-0078, AC-0012-0079
- Type: normal
- Test: call `buildSpecCoverageSummary()` and `buildPerSpecCoverage()` with valid inputs; assert all `evidenceRefs` and `coverageRefs[].declaredRef` values are POSIX repo-relative paths (not absolute paths, not directory paths)

## TC-0012-0203: runtimeGate.evidenceRefs Valid Array — Validator Passes — Normal Path (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0134
- AC-Refs: AC-0012-0084, AC-0012-0085, AC-0012-0086
- Type: normal
- Test: `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = [".qfai/evidence/iter-0/qa.json#/finding-1"]` returns 0 errors for the evidenceRefs field; field is read and validated

## TC-0012-0204: runtimeGate.evidenceRefs Absent — Validator Error — Error (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0135
- AC-Refs: AC-0012-0087
- Type: error
- Test: `validatePrototypingEvidence()` with evidence where `runtimeGate.evidenceRefs` field is absent; at least 1 error returned; error code references the missing field

## TC-0012-0205: runtimeGate.evidenceRefs Empty Array — Validator Error — Boundary (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0136
- AC-Refs: AC-0012-0088
- Type: boundary
- Test: `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = []`; at least 1 error returned; empty array is treated as missing required refs

## TC-0012-0206: Absolute Path in runtimeGate.evidenceRefs — Validator Error — Error (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0137
- AC-Refs: AC-0012-0089
- Type: error
- Test: `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = ["/abs/path/file.json"]`; error returned for absolute path entry; error message identifies the invalid ref

## TC-0012-0207: Self-Ref in runtimeGate.evidenceRefs — Validator Error — Error (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0090
- Type: error
- Test: `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = [".qfai/evidence/prototyping.json#/runtimeGate"]`; error returned for self-referential entry

## TC-0012-0208: Synthetic Token in runtimeGate.evidenceRefs — Validator Error — Edge (v1.7.15 rev8 WS-2)

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0091, AC-0012-0092, AC-0012-0093
- Type: edge
- Test: `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = ["routes: all observed", "", ".qfai/evidence/"]`; each entry produces individual error; 3 errors total

## TC-0012-0209: All 5 Ref Sites Pass Validation with Consistent Refs — Normal Path (v1.7.15 rev8 WS-3)

- EX-Ref: EX-0012-0139
- AC-Refs: AC-0012-0094, AC-0012-0095
- Type: normal
- Test: construct evidence with all 5 ref sites populated using concrete POSIX refs via shared helpers; `validatePrototypingEvidence()` returns 0 errors; each site validates using `isConcreteArtifactRef()`

## TC-0012-0210: isConcreteArtifactRef() Returns Same Result for Same Input — Boundary (v1.7.15 rev8 WS-3)

- EX-Ref: EX-0012-0139
- AC-Refs: AC-0012-0094
- Type: boundary
- Test: `isConcreteArtifactRef(".qfai/evidence/iter-0/qa.json")` called twice with same input returns same boolean value both times (pure function property)

## TC-0012-0211: No Parallel Grammar Definition Outside pathUtils.ts — Edge (v1.7.15 rev8 WS-3)

- EX-Ref: EX-0012-0140
- AC-Refs: AC-0012-0096
- Type: edge
- Test: static analysis/grep confirms 0 independent regex or pattern definitions for concrete-ref grammar outside `packages/qfai/src/core/prototyping/pathUtils.ts`

## TC-0012-0212: iterations[].evidenceRefs.runtimeGate Absolute Path Rejected by Same Grammar — Error (v1.7.15 rev8 WS-3)

- EX-Ref: EX-0012-0141
- AC-Refs: AC-0012-0095
- Type: error
- Test: evidence with `iterations[0].evidenceRefs.runtimeGate = ["/abs/path.json"]`; `validatePrototypingEvidence()` returns error using same `isConcreteArtifactRef()` check as top-level runtimeGate

## TC-0012-0213: execution.ts assertConcreteArtifactRef() Blocks Absolute Builder Output Before Bundle Write — Error (v1.7.15 rev8 WS-3)

- EX-Ref: EX-0012-0143
- AC-Refs: AC-0012-0097, AC-0012-0098
- Type: error
- Test: unit test for `execution.ts` builder pipeline; inject absolute path in specCoverage output; assert `assertConcreteArtifactRef()` throws before `fsEvidenceWriter` is called

## TC-0012-0214: Closure Test — runPrototypingExecution() Output Passes validatePrototypingEvidence() with 0 Errors — Normal Path (v1.7.15 rev8 WS-4)

- EX-Ref: EX-0012-0144
- AC-Refs: AC-0012-0099, AC-0012-0100
- Type: normal
- Test: in `prototypingExecution.productionPath.test.ts`, call `runPrototypingExecution()` with valid inputs; pass output to `validatePrototypingEvidence()`; assert 0 errors returned (positive closure test)

## TC-0012-0215: Negative Injection — Absolute Path in specCoverage Causes Validator Error — Error (v1.7.15 rev8 WS-4)

- EX-Ref: EX-0012-0145
- AC-Refs: AC-0012-0101
- Type: error
- Test: in `prototypingExecution.productionPath.test.ts`, create fixture with `specCoverage.evidenceRefs[0] = "/abs/path/file.md"`; pass to `validatePrototypingEvidence()`; assert at least 1 error for absolute path

## TC-0012-0216: Negative Injection — Absent runtimeGate.evidenceRefs Causes Validator Error — Error (v1.7.15 rev8 WS-4)

- EX-Ref: EX-0012-0147
- AC-Refs: AC-0012-0101
- Type: error
- Test: in `prototypingExecution.productionPath.test.ts` or `prototypingEvidence.test.ts`, pass evidence fixture with `runtimeGate.evidenceRefs` absent; assert at least 1 error for missing required field

## TC-0012-0217: specCoverage.test.ts Negative Cases Exist and Pass — Boundary (v1.7.15 rev8 WS-4)

- EX-Ref: EX-0012-0146, EX-0012-0148
- AC-Refs: AC-0012-0102, AC-0012-0103
- Type: boundary
- Test: `specCoverage.test.ts` contains: (a) absolute path input → repo-relative output assertion; (b) outside-root path → throw assertion; (c) directory path → throw assertion; (d) `coverageRefs[].declaredRef` format assertion; `prototypingEvidence.test.ts` contains: (e) runtimeGate.evidenceRefs absent/empty-array/absolute-path/self-ref/synthetic-token → error assertions

## TC-0012-0218: Static Analysis — pathUtils.ts Contains Zero Imports from execution.ts Transitive Graph (v1.7.15 rev8 WS-1)

- EX-Ref: EX-0012-0149
- AC-Refs: AC-0012-0076
- Type: edge
- Test: in `prototypingRev8E2E.test.ts` or `pathUtils.test.ts`, read `packages/qfai/src/core/prototyping/pathUtils.ts` source text; assert that no import specifier matches any of `execution`, `specCoverage`, `l2evidence`, `harness/runtime`; this enforces the leaf-module constraint from BR-0012-0099 and DR-0012-0046 at the test layer

## TC-0012-0219: runtimeGate.ui[].declaredRef Absent — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0151
- AC-Refs: AC-0012-0104
- Type: error
- Verify: calling validatePrototypingEvidence() with a ui[] row missing declaredRef produces a QFAI-PROT error

## TC-0012-0220: runtimeGate.ui[].declaredRef Absolute Path — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0152
- AC-Refs: AC-0012-0105
- Type: error
- Verify: absolute path in ui[].declaredRef produces a QFAI-PROT error

## TC-0012-0221: runtimeGate.ui[].declaredRef Self-Ref — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0157
- AC-Refs: AC-0012-0105
- Type: error
- Verify: self-ref pointing to prototyping.json in ui[].declaredRef produces a QFAI-PROT error

## TC-0012-0222: runtimeGate.ui[].renderEvidenceRefs[] Empty Array — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0153
- AC-Refs: AC-0012-0106
- Type: error
- Verify: empty renderEvidenceRefs[] on a ui[] row produces a QFAI-PROT error

## TC-0012-0223: runtimeGate.ui[].renderEvidenceRefs[] Synthetic Token — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0154
- AC-Refs: AC-0012-0107
- Type: error
- Verify: synthetic token in renderEvidenceRefs[] produces a QFAI-PROT error

## TC-0012-0224: runtimeGate.ui[].browserQaEvidenceRefs[] Absent or Empty — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0153
- AC-Refs: AC-0012-0108
- Type: error
- Verify: absent or empty browserQaEvidenceRefs[] on a ui[] row produces a QFAI-PROT error

## TC-0012-0225: runtimeGate.ui[].browserQaEvidenceRefs[] Bare Filename — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0155
- AC-Refs: AC-0012-0109
- Type: error
- Verify: bare filename in browserQaEvidenceRefs[] produces a QFAI-PROT error

## TC-0012-0226: runtimeGate.ui[].browserQaEvidenceRefs[] Windows Separator — Validator Error — Boundary (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0156
- AC-Refs: AC-0012-0109
- Type: boundary
- Verify: Windows `\\` separator in browserQaEvidenceRefs[] entry produces a QFAI-PROT error

## TC-0012-0227: runtimeGate.ui[] Row — All Three Leaf Fields Valid — Normal Path (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0150
- AC-Refs: AC-0012-0104, AC-0012-0105, AC-0012-0106, AC-0012-0107, AC-0012-0108, AC-0012-0109
- Type: normal
- Verify: ui[] row with valid declaredRef, renderEvidenceRefs[], browserQaEvidenceRefs[] passes validation with 0 errors for that row

## TC-0012-0228: l1.axes[].evidenceRefs[] Synthetic Token — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0158
- AC-Refs: AC-0012-0111, AC-0012-0112
- Type: error
- Verify: synthetic token "a" in l1.axes[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0229: l2.axes[].evidenceRefs[] Synthetic Token — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0159
- AC-Refs: AC-0012-0113, AC-0012-0114
- Type: error
- Verify: synthetic token "b" in l2.axes[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0230: l1.axes[].evidenceRefs[] Empty Array — Validator Error — Boundary (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0162
- AC-Refs: AC-0012-0111
- Type: boundary
- Verify: empty evidenceRefs[] on a single l1.axes[] axis produces a QFAI-PROT error

## TC-0012-0231: axes[] Self-Ref — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0161
- AC-Refs: AC-0012-0115
- Type: error
- Verify: self-ref in l2.axes[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0232: Per-Axis Validation Isolation — One Bad Axis in Many (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0163
- AC-Refs: AC-0012-0116
- Type: boundary
- Verify: when one axis has valid refs and a later axis has a synthetic token, the error is produced for the later axis regardless of the valid axis

## TC-0012-0233: reviewerLogs[].evidenceRefs[] Synthetic Token — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0164
- AC-Refs: AC-0012-0117, AC-0012-0118, AC-0012-0119
- Type: error
- Verify: "reviewer:1" in reviewerLogs[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0234: reviewerLogs[].evidenceRefs[] Absolute Path — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0165
- AC-Refs: AC-0012-0120
- Type: error
- Verify: absolute path in reviewerLogs[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0235: reviewerLogs[].evidenceRefs[] Empty Array — Validator Error — Error (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0166
- AC-Refs: AC-0012-0117
- Type: error
- Verify: empty reviewerLogs[0].evidenceRefs[] produces a QFAI-PROT error

## TC-0012-0236: bundleWriter.ts — declaredRef Required — TypeScript Type Check — Boundary (v1.7.15 rev9 WS-2)

- EX-Ref: EX-0012-0167
- AC-Refs: AC-0012-0122
- Type: boundary
- Verify: `pnpm check-types` fails or the type definition does not allow `declaredRef?` (optional)

## TC-0012-0237: bundleWriter.ts — Leaf Arrays Required Non-Nullable — TypeScript Type Check — Boundary (v1.7.15 rev9 WS-2)

- EX-Ref: EX-0012-0168
- AC-Refs: AC-0012-0123
- Type: boundary
- Verify: `pnpm check-types` exits 0; leaf array fields in bundleWriter.ts types are required (no undefined/null)

## TC-0012-0238: tests/core/ Fixtures Zero Synthetic Tokens After WS-3 — Boundary (v1.7.15 rev9 WS-3)

- EX-Ref: EX-0012-0170
- AC-Refs: AC-0012-0130
- Type: boundary
- Verify: grep for "a", "b", "reviewer:1" in evidenceRefs contexts across packages/qfai/tests/core/ returns 0 results

## TC-0012-0239: All 15 Negative Cases Exist and Pass — Normal Path (v1.7.15 rev9 WS-3)

- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0127, AC-0012-0128, AC-0012-0129
- Type: normal
- Verify: `pnpm vitest run --project validators` exits 0; all 15 negative test cases present and passing

## TC-0012-0240: Leaf-Field Closure Assertion in productionPath.test.ts — Normal Path (v1.7.15 rev9 WS-3)

- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0131
- Type: normal
- Verify: prototypingExecution.productionPath.test.ts includes at least 1 positive closure assertion for leaf refs + 1 negative injection; `pnpm vitest run --project core` exits 0

## TC-0012-0241: README Enumerates All Concrete-Ref Leaf Fields — Normal Path (v1.7.15 rev9 WS-4)

- EX-Ref: EX-0012-0172
- AC-Refs: AC-0012-0132
- Type: normal
- Verify: packages/qfai/README.md lists runtimeGate.ui[].declaredRef, renderEvidenceRefs[], browserQaEvidenceRefs[], axes[].evidenceRefs[], reviewerLogs[].evidenceRefs[] in the concrete-ref contract description

## TC-0012-0242: No Parallel Grammar Implementation Outside pathUtils.ts — Boundary (v1.7.15 rev9 WS-1)

- EX-Ref: EX-0012-0150
- AC-Refs: AC-0012-0110
- Type: boundary
- Verify: grep for independent concrete-ref grammar definitions in packages/qfai/src/ (excluding pathUtils.ts) returns 0 results
### TC-0012-0219: ui[] declaredRef Required — Absent Field Causes Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0150
- AC-Refs: AC-0012-0104
- Type: error
- Test: `prototypingEvidence.test.ts`: construct bundle with `runtimeGate.ui[0]` missing `declaredRef`; call `validatePrototypingEvidence()`; assert error contains identifier for missing `declaredRef` on ui row

### TC-0012-0220: ui[] declaredRef Absolute Path — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0151
- AC-Refs: AC-0012-0105
- Type: error
- Test: `prototypingEvidence.test.ts`: set `ui[0].declaredRef = "/abs/path/spec.md"`; assert `validatePrototypingEvidence()` returns error for absolute path in `declaredRef`

### TC-0012-0221: ui[] declaredRef Synthetic Token — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0152
- AC-Refs: AC-0012-0105
- Type: error
- Test: `prototypingEvidence.test.ts`: set `ui[0].declaredRef = "spec"` (bare filename); assert validator error; also test Windows `\\` separator variant

### TC-0012-0222: ui[] declaredRef Concrete Ref — Passes Validation (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0153
- AC-Refs: AC-0012-0104, AC-0012-0105
- Type: normal
- Test: `prototypingEvidence.test.ts`: set `ui[0].declaredRef = ".qfai/contracts/ui/ui-0001-home.yaml#/screens/0"` (all other fields valid); assert no error for `declaredRef`

### TC-0012-0223: ui[] renderEvidenceRefs[] Empty Array — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0154
- AC-Refs: AC-0012-0106
- Type: error
- Test: `prototypingEvidence.test.ts`: set `ui[0].renderEvidenceRefs = []`; assert `validatePrototypingEvidence()` errors on empty renderEvidenceRefs

### TC-0012-0224: ui[] renderEvidenceRefs[] Synthetic Token — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0155
- AC-Refs: AC-0012-0107
- Type: error
- Test: `prototypingEvidence.test.ts`: set `ui[0].renderEvidenceRefs = ["a"]`; assert validator error for synthetic token `"a"`

### TC-0012-0225: ui[] browserQaEvidenceRefs[] Empty Array — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0156
- AC-Refs: AC-0012-0108
- Type: error
- Test: `prototypingEvidence.test.ts`: set `ui[0].browserQaEvidenceRefs = []`; assert validator error for empty browserQaEvidenceRefs

### TC-0012-0226: ui[] browserQaEvidenceRefs[] Windows Separator — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0157
- AC-Refs: AC-0012-0109
- Type: boundary
- Test: `prototypingEvidence.test.ts`: set `ui[0].browserQaEvidenceRefs = [".qfai\\evidence\\home.json"]`; assert validator error for Windows `\\` separator

### TC-0012-0227: Axis L1 — evidenceRefs[] Synthetic Token "a" — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0160
- AC-Refs: AC-0012-0114
- Type: error
- Test: `prototypingEvidence.test.ts`: set `iterations[0].l1.axes[0].evidenceRefs = ["a"]`; assert `validatePrototypingEvidence()` errors on synthetic token

### TC-0012-0228: Axis L2 — evidenceRefs[] Synthetic Token "b" — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0161
- AC-Refs: AC-0012-0115
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l2.axes[0].evidenceRefs = ["b"]`; assert validator error for synthetic token `"b"`

### TC-0012-0229: Axis — Per-Axis: One Valid One Synthetic — Error for Invalid Axis (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0162
- AC-Refs: AC-0012-0119
- Type: boundary
- Test: `prototypingEvidence.test.ts`: `l1.axes[0].evidenceRefs = [".qfai/evidence/iter-0/axis-0.md#finding-1"]`; `l1.axes[1].evidenceRefs = ["a"]`; assert error for axes[1] only (per-axis granularity confirmed)

### TC-0012-0230: Axis L1 — evidenceRefs[] Empty Array — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0163
- AC-Refs: AC-0012-0116
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l1.axes[0].evidenceRefs = []`; assert validator error for empty array on axis

### TC-0012-0231: Axis — evidenceRefs[] Absolute Path — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0164
- AC-Refs: AC-0012-0115, AC-0012-0117
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l2.axes[0].evidenceRefs = ["/abs/path/eval.md"]`; assert validator error for absolute path

### TC-0012-0232: Axis — evidenceRefs[] Self-Ref to prototyping.json — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0165
- AC-Refs: AC-0012-0118
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l2.axes[0].evidenceRefs = [".qfai/evidence/prototyping.json#/iterations/0"]`; assert validator error for self-ref

### TC-0012-0233: reviewerLogs — evidenceRefs[] Synthetic Token "reviewer:1" — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0166
- AC-Refs: AC-0012-0120
- Type: error
- Test: `prototypingEvidence.test.ts`: set `reviewerLogs[0].evidenceRefs = ["reviewer:1"]`; assert validator error for synthetic token

### TC-0012-0234: reviewerLogs — evidenceRefs[] Absolute Path — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0167
- AC-Refs: AC-0012-0121
- Type: error
- Test: `prototypingEvidence.test.ts`: set `reviewerLogs[0].evidenceRefs = ["/abs/path/reviewer.md"]`; assert validator error for absolute path

### TC-0012-0235: reviewerLogs — evidenceRefs[] Empty Array — Validator Error (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0168
- AC-Refs: AC-0012-0122
- Type: error
- Test: `prototypingEvidence.test.ts`: set `reviewerLogs[0].evidenceRefs = []`; assert validator error for empty array

### TC-0012-0236: isConcreteArtifactRef() Reused — No Parallel Grammar in prototypingEvidence.ts (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0159
- AC-Refs: AC-0012-0113
- Type: edge
- Test: in `prototypingEvidence.test.ts` static analysis block or `pathUtils.test.ts`: read `prototypingEvidence.ts` source text; assert no regex or custom pattern definitions for concrete-ref validation; all validation routes through `isConcreteArtifactRef()` from `pathUtils.ts`

### TC-0012-0237: bundleWriter.ts declaredRef Required — TypeScript Type Error on Omit (v1.7.15 rev9 WS-2)
- EX-Ref: EX-0012-0169
- AC-Refs: AC-0012-0124
- Type: boundary
- Test: add a compile-error test or verify with `pnpm check-types`: construct `ui[]` row without `declaredRef`; assert `pnpm check-types` exits non-zero (type error for missing required field)

### TC-0012-0238: bundleWriter.ts Leaf Arrays Required Non-Nullable — Null Emission Causes Type Error (v1.7.15 rev9 WS-2)
- EX-Ref: EX-0012-0170
- AC-Refs: AC-0012-0125, AC-0012-0126
- Type: boundary
- Test: verify with `pnpm check-types`: attempt to assign `null` or `undefined` to any of the leaf array fields (`renderEvidenceRefs`, `browserQaEvidenceRefs`, `axes[].evidenceRefs`, `reviewerLogs[].evidenceRefs`); assert type error

### TC-0012-0239: Closure Test — Leaf Fields in Execution Output Are Concrete (v1.7.15 rev9 WS-3)
- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0131
- Type: normal
- Test: `prototypingExecution.productionPath.test.ts`: run `runPrototypingExecution()` with valid project; assert all leaf fields (`ui[].declaredRef`, `ui[].renderEvidenceRefs[]`, `ui[].browserQaEvidenceRefs[]`, `axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`) contain concrete artifact refs matching `isConcreteArtifactRef()` pattern

### TC-0012-0240: All 15 Leaf-Field Negative Cases Present in prototypingEvidence.test.ts (v1.7.15 rev9 WS-3)
- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0128, AC-0012-0129
- Type: normal
- Test: verify test file contains 7 ui[] negative cases (AC-0012-0128) + 5 axis-level negative cases (AC-0012-0129) + 3 reviewer negative cases (AC-0012-0129); count assertions using grep; all pass with `pnpm vitest run --project validators --project core`

### TC-0012-0241: tests/core/ Fixtures Have No Synthetic Token evidenceRefs (v1.7.15 rev9 WS-3)
- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0130
- Type: boundary
- Test: `grep -r '"a"' tests/core/` and `grep -r '"b"' tests/core/` and `grep -r '"reviewer:1"' tests/core/` → 0 matches in evidenceRefs contexts; all replaced with concrete artifact refs

### TC-0012-0242: README Enumerates All Concrete-Ref Leaf Fields (v1.7.15 rev9 WS-4)
- EX-Ref: EX-0012-0172
- AC-Refs: AC-0012-0132
- Type: normal
- Test: `packages/qfai/README.md` must contain explicit references to: `ui[].declaredRef`, `ui[].renderEvidenceRefs[]`, `ui[].browserQaEvidenceRefs[]`, `axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`; grep for these field names; all present; no content implies "top-level only" strictness

### TC-0012-0243: No Parallel Grammar — isConcreteArtifactRef() Reuse Static Check (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0159
- AC-Refs: AC-0012-0110
- Type: edge
- Test: in `pathUtils.test.ts` or static check in `prototypingEvidence.test.ts`: inspect `prototypingEvidence.ts` source for any regex or custom pattern outside `isConcreteArtifactRef()` calls for concrete-ref validation; assert 0 parallel implementations found

### TC-0012-0244: ui[] All Leaf Fields Valid — Full Row Passes (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0158
- AC-Refs: AC-0012-0104, AC-0012-0105, AC-0012-0106, AC-0012-0107, AC-0012-0108, AC-0012-0109
- Type: normal
- Test: `prototypingEvidence.test.ts`: construct bundle with `ui[0]` having all leaf fields populated with concrete refs; assert `validatePrototypingEvidence()` produces no error for ui leaf fields

### TC-0012-0245: Axis L1 — evidenceRefs[] Non-Empty Per-Axis Required (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0163
- AC-Refs: AC-0012-0111
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l1.axes[0].evidenceRefs = []`; assert error on missing/empty per-axis (distinct from TC-0012-0230 which covers same scenario — this TC specifically validates AC-0012-0111 coverage)

### TC-0012-0246: Axis L1 — evidenceRefs[i] Concrete Ref Requirement (v1.7.15 rev9 WS-1)
- EX-Ref: EX-0012-0160
- AC-Refs: AC-0012-0112
- Type: error
- Test: `prototypingEvidence.test.ts`: set `l1.axes[0].evidenceRefs = [".qfai/evidence/iter-0/axis-0.md#finding-1"]` (valid); then set `l1.axes[1].evidenceRefs = ["a"]` (synthetic); assert only axes[1] causes error; confirms `isConcreteArtifactRef()` applied per-entry

### TC-0012-0247: bundleWriter.ts All Leaf Arrays Required Non-Nullable TypeScript Check (v1.7.15 rev9 WS-2)
- EX-Ref: EX-0012-0170
- AC-Refs: AC-0012-0123
- Type: boundary
- Test: verify with `pnpm check-types`: attempt assignment of `null`, `undefined`, or omit for `renderEvidenceRefs[]`, `browserQaEvidenceRefs[]`, `axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`; assert all produce TypeScript type errors (non-nullable schema enforced)

### TC-0012-0248: All 7 ui[] Leaf-Field Negative Cases Present (v1.7.15 rev9 WS-3)
- EX-Ref: EX-0012-0171
- AC-Refs: AC-0012-0127
- Type: normal
- Test: count test cases in `prototypingEvidence.test.ts` for ui[] leaf negatives: (1) declaredRef absent, (2) absolute path, (3) synthetic token, (4) renderEvidenceRefs empty, (5) renderEvidenceRefs synthetic, (6) browserQaEvidenceRefs empty, (7) browserQaEvidenceRefs Windows separator; assert all 7 present; `pnpm vitest run --project validators` exits 0
