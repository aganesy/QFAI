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

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Set prototyping.yaml recommended_mode=low-cost | Config ready |
| 2 | Call resolvePrototypingMode() with no user override | effectiveMode="low-cost", source="discussion-recommendation" |
| 3 | Call resolvePrototypingMode() with user override=full-harness | effectiveMode="full-harness", source="explicit-request" |

## TC-0012-0018: Existence-Based Precedence Error

- EX-Ref: EX-0012-0015
- AC-Refs: AC-0012-0014
- Type: error

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create prototyping.yaml with `prototyping: "not-an-object"` | File created |
| 2 | Call parseDiscussionModeRecommendationWithWarnings() | Error emitted for non-object namespaced block |
| 3 | Verify no legacy fallback occurred | Legacy path not invoked |

## TC-0012-0019: Recommendation Artifact Status Values

- EX-Ref: EX-0012-0014
- AC-Refs: AC-0012-0015
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create valid prototyping.yaml in discussion-pack | File created |
| 2 | Call resolveLatestRecommendationArtifact() | status="valid", recommendation populated |
| 3 | Remove prototyping.yaml | File removed |
| 4 | Call resolveLatestRecommendationArtifact() | status="missing" |

## TC-0012-0020: Obligation Matrix Derivation

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0016, AC-0012-0017
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Call derivePrototypingObligations("web-ui", "standard") | requireRuntimeGate=true, requireUiFidelity=true, requireFullHarness=false |
| 2 | Call derivePrototypingObligations("non-ui", "standard") | requireUiFidelity=false, requireRenderBundle=false |
| 3 | Call derivePrototypingObligations("web-ui", "full-harness") | requireFullHarness=true |

## TC-0012-0021: Calibration Config Defaults

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0018
- Type: boundary

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Load config with no prototyping stanza | Config loaded |
| 2 | Check prototyping.calibration | accept=0.8, refine=0.5, maxIterations=15, plateauDelta=0.02, plateauLookback=3 |

## TC-0012-0022: Calibration Config Custom Values

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Load config with prototyping.calibration.thresholds.accept=0.9 | Config loaded |
| 2 | Check prototyping.calibration.thresholds.accept | 0.9 (custom value applied) |
| 3 | Check prototyping.calibration.thresholds.refine | 0.5 (default kept) |

## TC-0012-0023: Report Prototyping Section Present

- EX-Ref: EX-0012-0016
- AC-Refs: AC-0012-0019
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create valid prototyping evidence and prototyping.yaml | Evidence and config ready |
| 2 | Run createReportData() | Report data generated |
| 3 | Check prototyping section in report | Section present with mode, obligations, evidence, harness, render, browserQa, calibration |

## TC-0012-0024: Recommendation Artifact Status Transitions

- EX-Ref: EX-0012-0017
- AC-Refs: AC-0012-0015
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create valid prototyping.yaml in discussion-pack | File ready |
| 2 | Call resolveLatestRecommendationArtifact() | status="valid", recommendation populated |
| 3 | Delete prototyping.yaml | File removed |
| 4 | Call resolveLatestRecommendationArtifact() | status="missing" |
| 5 | Remove entire discussion-pack | Pack removed |
| 6 | Call resolveLatestRecommendationArtifact() | status="no-pack" |

## TC-0012-0025: Calibration Config Normalization

- EX-Ref: EX-0012-0018
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Load config with no prototyping stanza | Config loaded |
| 2 | Check calibration defaults | accept=0.8, refine=0.5, maxIterations=15 |
| 3 | Load config with accept=0.9 | Config loaded |
| 4 | Check accept value | 0.9 (custom) |
| 5 | Load config with accept=2.0 (invalid) | Config loaded |
| 6 | Check accept value | 0.8 (default, invalid replaced) |

## TC-0012-0026: fullHarness Termination Reason

- EX-Ref: EX-0012-0019
- AC-Refs: AC-0012-0019
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Run full-harness loop that converges at iteration 3 | Loop completes |
| 2 | Check terminationReason | "converged" |
| 3 | Run full-harness loop that hits maxIterations (15) | Loop completes |
| 4 | Check terminationReason | "max-iterations" |

## TC-0012-0027: Mode Provenance Fields

- EX-Ref: EX-0012-0020
- AC-Refs: AC-0012-0013
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Resolve mode with namespaced discussion recommendation | Resolution complete |
| 2 | Check sourceSchema | "namespaced" |
| 3 | Resolve mode with no inputs | Resolution complete |
| 4 | Check source | "system-default", effective="standard" |

## TC-0012-0028: Calibration Config Field Defaults

- EX-Ref: EX-0012-0021
- AC-Refs: AC-0012-0018
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Load config with no prototyping stanza | Config loaded |
| 2 | Check all calibration fields | All match documented defaults |

## TC-0012-0029: Surface Inference Priority

- EX-Ref: EX-0012-0022
- AC-Refs: AC-0012-0016
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Set prototyping.yaml surface="web-ui" | Config ready |
| 2 | Call inferSurfaceFromRecommendationAndEvidence() | Returns "web-ui" (explicit) |
| 3 | Remove surface field, provide uiRoutes evidence | Config updated |
| 4 | Call inference again | Returns "web-ui" (inferred) |
