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
