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

| Step | Action                                                              | Expected                                  |
| ---- | ------------------------------------------------------------------- | ----------------------------------------- |
| 1    | Provide valid render coverage, browserQa, screen contracts, specCov | Inputs ready                              |
| 2    | Call scoreL1(inputs)                                                | L1.total > 0, axes populated from evidence|
| 3    | Call scoreL2(inputs)                                                | L2.total > 0, axes populated from evidence|

## TC-0012-0031: L1/L2 Panel Scoring Missing Evidence Error (v1.7.15)

- EX-Ref: EX-0012-0041
- AC-Refs: AC-0012-0026-01
- Type: error

| Step | Action                                | Expected                         |
| ---- | ------------------------------------- | -------------------------------- |
| 1    | Omit render coverage from L1 inputs   | Inputs incomplete                |
| 2    | Call scoreL1(inputs)                  | MeasurementError thrown          |

## TC-0012-0032: weightedTotal = min(L1, L2) (v1.7.15)

- EX-Ref: EX-0012-0042
- AC-Refs: AC-0012-0026-03
- Type: normal

| Step | Action                                          | Expected            |
| ---- | ----------------------------------------------- | ------------------- |
| 1    | Set L1.total=0.85, L2.total=0.70                | Values ready        |
| 2    | Call computeWeightedTotal(l1, l2)               | Returns 0.70        |
| 3    | Set L1.total=0.60, L2.total=0.90                | Values updated      |
| 4    | Call computeWeightedTotal(l1, l2)               | Returns 0.60        |

## TC-0012-0033: Converged Blocked at Iteration 1 (v1.7.15)

- EX-Ref: EX-0012-0043
- AC-Refs: AC-0012-0026-02
- Type: boundary

| Step | Action                                                           | Expected                |
| ---- | ---------------------------------------------------------------- | ----------------------- |
| 1    | Run full-harness; iteration 1 yields weightedTotal=0.95 (>0.80) | Iteration 1 complete    |
| 2    | Check terminationReason                                          | null (still in-progress)|
| 3    | Run iteration 2; weightedTotal=0.90 with plateau met             | Iteration 2 complete    |
| 4    | Check terminationReason                                          | "converged"             |

## TC-0012-0034: Plateau and max-iterations Boundary (v1.7.15)

- EX-Ref: EX-0012-0044
- AC-Refs: AC-0012-0026-02
- Type: boundary

| Step | Action                                                            | Expected                    |
| ---- | ----------------------------------------------------------------- | --------------------------- |
| 1    | Run until iterationCount=5, score delta < plateauDelta for 3 iter | Plateau detected            |
| 2    | Check terminationReason                                           | "plateau"                   |
| 3    | Run separate case until iterationCount === maxIterations (15)     | Max iterations reached      |
| 4    | Check terminationReason                                           | "max-iterations"            |

## TC-0012-0035: reviewerLogs Append-Only Integrity (v1.7.15)

- EX-Ref: EX-0012-0045
- AC-Refs: AC-0012-0026-02
- Type: normal

| Step | Action                                   | Expected                                     |
| ---- | ---------------------------------------- | -------------------------------------------- |
| 1    | Complete iteration 1                     | reviewerLogs.length === 1                    |
| 2    | Complete iteration 2                     | reviewerLogs.length === 2, first entry intact|
| 3    | Verify reviewerLogs[0] unchanged         | Matches iteration 1 log exactly              |

## TC-0012-0036: Reviewer Placeholder Rejection (v1.7.15)

- EX-Ref: EX-0012-0046
- AC-Refs: AC-0012-0027-01
- Type: error

| Step | Action                                | Expected                                 |
| ---- | ------------------------------------- | ---------------------------------------- |
| 1    | Set reviewerId = "qfai"              | Input ready                              |
| 2    | Start full-harness execution          | Runtime error: placeholder reviewer      |
| 3    | Set reviewerId = ""                   | Input ready                              |
| 4    | Start full-harness execution          | Runtime error: reviewer required         |
| 5    | Set reviewerId = "alice"              | Input ready                              |
| 6    | Start full-harness execution          | Execution proceeds (no error)            |

## TC-0012-0037: commitSha Missing Error (v1.7.15)

- EX-Ref: EX-0012-0047
- AC-Refs: AC-0012-0027-02
- Type: error

| Step | Action                                | Expected                                 |
| ---- | ------------------------------------- | ---------------------------------------- |
| 1    | Mock git SHA retrieval to fail         | Mock active                              |
| 2    | Start full-harness execution          | Runtime error: commitSha required        |

## TC-0012-0038: Calibration Pack Missing Error (v1.7.15)

- EX-Ref: EX-0012-0050
- AC-Refs: AC-0012-0027-03
- Type: error

| Step | Action                                | Expected                                 |
| ---- | ------------------------------------- | ---------------------------------------- |
| 1    | Remove calibration pack file          | File absent                              |
| 2    | Start full-harness; CalibrationLoader | Runtime error: calibration pack not found|

## TC-0012-0039: Missing Evidence Fail-Fast (v1.7.15)

- EX-Ref: EX-0012-0053
- AC-Refs: AC-0012-0027-04
- Type: error

| Step | Action                                     | Expected                                     |
| ---- | ------------------------------------------ | -------------------------------------------- |
| 1    | Omit render evidence                       | Input incomplete                             |
| 2    | Start measurement phase                    | Runtime error: render evidence missing        |
| 3    | Restore render, omit browserQa             | Input incomplete                             |
| 4    | Start measurement phase                    | Runtime error: browserQa evidence missing     |

## TC-0012-0040: specCoverage Zero-Seeded Rejection (v1.7.15)

- EX-Ref: EX-0012-0048
- AC-Refs: AC-0012-0028-01
- Type: boundary

| Step | Action                                                     | Expected                                   |
| ---- | ---------------------------------------------------------- | ------------------------------------------ |
| 1    | Provide declared=5, observed=3 for uiRoutes                | Input ready                                |
| 2    | Call buildSpecCoverageSummary()                            | ratio=0.6 (real diff)                      |
| 3    | Provide declared=0, observed=0 for all axes                | Input ready                                |
| 4    | Call buildSpecCoverageSummary()                            | Rejected: zero-seeded output               |

## TC-0012-0041: uiFidelity Synthetic mockPaths Rejection (v1.7.15)

- EX-Ref: EX-0012-0049
- AC-Refs: AC-0012-0028-02
- Type: error

| Step | Action                                                  | Expected                                 |
| ---- | ------------------------------------------------------- | ---------------------------------------- |
| 1    | Build uiFidelity with no browserQa findings             | Build complete                           |
| 2    | Check mockPaths                                         | Empty (no auto-generated pass entries)   |
| 3    | Attempt to inject mockPaths.status="pass" synthetically | Rejected                                 |

## TC-0012-0042: extractDomLabelsWithJsdom Replaces Empty Implementation (v1.7.15)

- EX-Ref: EX-0012-0054
- AC-Refs: AC-0012-0028-03
- Type: normal

| Step | Action                                           | Expected                               |
| ---- | ------------------------------------------------ | -------------------------------------- |
| 1    | Provide HTML with visible text labels            | Input ready                            |
| 2    | Call extractDomLabelsWithJsdom() in uiObservation| Returns non-empty label array          |
| 3    | Search for extractHtmlLabelsFromString in source | Not found (removed)                    |

## TC-0012-0043: Docs Claim-to-Runtime Mapping (v1.7.15)

- EX-Ref: EX-0012-0052
- AC-Refs: AC-0012-0029-01
- Type: normal

| Step | Action                                                           | Expected                                     |
| ---- | ---------------------------------------------------------------- | -------------------------------------------- |
| 1    | Extract constraint claims from SKILL.md                          | Claims enumerated                            |
| 2    | For each claim, find matching validator rule or runtime error     | 1:1 correspondence for all claims            |

## TC-0012-0044: packVersion from Pack Metadata (v1.7.15)

- EX-Ref: EX-0012-0051
- AC-Refs: AC-0012-0029-02
- Type: normal

| Step | Action                                           | Expected                               |
| ---- | ------------------------------------------------ | -------------------------------------- |
| 1    | Create calibration pack with metadata version 2.1| Pack ready                             |
| 2    | Load via CalibrationLoader                       | packVersion === "2.1.0"                |

## TC-0012-0045: packVersion Hardcode Rejected (v1.7.15)

- EX-Ref: EX-0012-0051
- AC-Refs: AC-0012-0029-02
- Type: edge

| Step | Action                                           | Expected                               |
| ---- | ------------------------------------------------ | -------------------------------------- |
| 1    | Search source for packVersion: "1.0.0" hardcode  | Not found (hardcode removed)           |
