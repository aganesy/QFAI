# 05 Examples

## EX-0012-0001: Standard Mode All-Spec Prototyping

- BR-Ref: BR-0012-0002, BR-0012-0004
- Given 5 specs in `.qfai/specs/`, no explicit mode
- When prototyping runs
- Then standard mode processes all 5 specs with static + optional light validation

## EX-0012-0002: Spec Auto-Discovery Detection

- BR-Ref: BR-0012-0002
- Given 対象 spec modified on branch, 対象 spec stale by mtime
- When auto-discovery runs
- Then both 対象 spec and 対象 spec are flagged (union of sources A and C)

## EX-0012-0003: Non-UI Coverage Matrix

- BR-Ref: BR-0012-0002
- Given a CLI project with `surface: non-ui`
- When Coverage Matrix is generated
- Then UI-specific rows are marked n/a

## EX-0012-0004: Full-Harness Convergence

- BR-Ref: BR-0012-0004
- Given full-harness mode with max 5 iterations
- When all dimension floors are met at iteration 3
- Then loop terminates with "converged" status

## EX-0012-0005: Placeholder Page REVISE

- BR-Ref: BR-0012-0005
- Given a page with only "Lorem ipsum" content
- When reviewer evaluates
- Then it returns REVISE (placeholder-only is not accepted)

## EX-0012-0006: Coverage Placeholder for BR-0012-0001

- BR-Ref: BR-0012-0001
- Given the consolidated rule BR-0012-0001
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0001

## EX-0012-0007: Coverage Placeholder for BR-0012-0003

- BR-Ref: BR-0012-0003
- Given the consolidated rule BR-0012-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0003

## EX-0012-0008: Coverage Placeholder for BR-0012-0006

- BR-Ref: BR-0012-0006
- Given the consolidated rule BR-0012-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0006

## EX-0012-0009: Coverage Placeholder for BR-0012-0007

- BR-Ref: BR-0012-0007
- Given the consolidated rule BR-0012-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0012-0007

## EX-0012-0010: Skill Invocation — Correct Path

- BR-Ref: BR-0012-0009
- Given a developer wants to run prototyping
- When they invoke `/qfai-prototyping` via the AI agent skill interface
- Then the skill executes, processes all specs, and produces evidence artifacts

## EX-0012-0011: CLI Command Attempt — Not Found

- BR-Ref: BR-0012-0008
- Given a developer runs `qfai prototyping` in the terminal
- When the CLI processes the command
- Then it returns "unknown command" or equivalent error (command does not exist)

## EX-0012-0012: Active Document Mentioning CLI — Violation

- BR-Ref: BR-0012-0008
- Given a policy document states "run `qfai prototyping` to generate skeletons"
- When a spec reviewer scans active documents
- Then the document is flagged as a violation; must be corrected or labelled `[SUPERSEDED v1.7.12]`

## EX-0012-0013: Skill Contract Mode Section — Self-Contained

- BR-Ref: BR-0012-0010
- Given the SKILL.md contract for `/qfai-prototyping`
- When the mode section is inspected
- Then it lists low-cost, standard (default), and full-harness with their obligations, without referencing external policy documents for mode definitions

## EX-0012-0014: Mode Resolution with Discussion Recommendation

- BR-Ref: BR-0012-0011

| Input                                                                   | Expected                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| prototyping.yaml: recommended_mode=low-cost, no user override           | effectiveMode="low-cost", source="discussion-recommendation" |
| prototyping.yaml: recommended_mode=low-cost, user override=full-harness | effectiveMode="full-harness", source="explicit-request"      |

## EX-0012-0015: Existence-Based Precedence

- BR-Ref: BR-0012-0012

| Input                                                                       | Expected                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| prototyping.yaml: `prototyping: null` (key exists, value null)              | Error: non-object namespaced block                            |
| prototyping.yaml: no `prototyping` key, has `recommended_mode` at top level | Hard error: legacy top-level keys rejected (v1.7.14, DR-0112) |

## EX-0012-0016: Obligation Matrix

- BR-Ref: BR-0012-0014

| Surface | Mode         | requireRuntimeGate | requireUiFidelity | requireFullHarness |
| ------- | ------------ | ------------------ | ----------------- | ------------------ |
| web     | standard     | true               | true              | false              |
| web     | full-harness | true               | true              | true               |
| non-ui  | standard     | true               | false             | false              |
| non-ui  | low-cost     | false              | false             | false              |

## EX-0012-0017: Recommendation Artifact Status Values

- BR-Ref: BR-0012-0013

| Input                                               | Expected                                        |
| --------------------------------------------------- | ----------------------------------------------- |
| Valid prototyping.yaml in latest discussion-pack    | status="valid", recommendation object populated |
| prototyping.yaml exists but missing required fields | status="invalid", warnings populated            |
| Discussion-pack exists but no prototyping.yaml      | status="missing"                                |
| No discussion-pack found                            | status="no-pack"                                |

## EX-0012-0018: Calibration Config Normalization

- BR-Ref: BR-0012-0015

| Input                                                               | Expected                                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Config with no prototyping stanza                                   | Defaults: accept=0.8, refine=0.5, maxIterations=15, plateauDelta=0.02, plateauLookback=3 |
| Config with prototyping.calibration.thresholds.accept=0.9           | accept=0.9, all other fields use defaults                                                |
| Config with prototyping.calibration.thresholds.accept=2.0 (invalid) | accept replaced with default 0.8                                                         |

## EX-0012-0019: fullHarness Converged vs Max-Iterations

- BR-Ref: BR-0012-0016

| terminationReason | Condition                                                     |
| ----------------- | ------------------------------------------------------------- |
| "converged"       | All dimension floors met + aggregate score > accept threshold |
| "max-iterations"  | maxIterations reached without convergence                     |
| null              | Full-harness not enabled or not started                       |

## EX-0012-0020: Mode Provenance Tracking

- BR-Ref: BR-0012-0018

| Scenario                                    | requested      | effective      | source                      | sourceSchema |
| ------------------------------------------- | -------------- | -------------- | --------------------------- | ------------ |
| User requests full-harness                  | "full-harness" | "full-harness" | "explicit-request"          | null         |
| Discussion recommends low-cost (namespaced) | null           | "low-cost"     | "discussion-recommendation" | "namespaced" |
| No input at all                             | null           | "standard"     | "system-default"            | null         |

## EX-0012-0021: Calibration Config Fields

- BR-Ref: BR-0012-0017

| Field             | Default | Valid Range      |
| ----------------- | ------- | ---------------- |
| thresholds.accept | 0.8     | 0.0-1.0          |
| thresholds.refine | 0.5     | 0.0-1.0          |
| maxIterations     | 15      | positive integer |
| plateauDelta      | 0.02    | non-negative     |
| plateauLookback   | 3       | non-negative     |

## EX-0012-0022: Surface Inference Priority

- BR-Ref: BR-0012-0019

| Input                                       | Expected                                         |
| ------------------------------------------- | ------------------------------------------------ |
| prototyping.yaml surface="web"              | surface="web" (explicit)                         |
| No surface field, evidence has uiRoutes > 0 | surface="web" (inferred)                         |
| No surface field, no evidence signals       | surface=null (v1.7.14: no default, returns null) |

## EX-0012-0041: L1/L2 Panel Scoring with Real Evidence (v1.7.15)

- BR-Ref: BR-0012-0041, BR-0012-0042

| Input                                                                 | Expected                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Valid render coverage + browser QA + screen contracts + spec coverage | L1.total > 0, L2.total > 0, both derived from evidence     |
| Missing render coverage input                                         | MeasurementError thrown (no silent fallback to l1.total=0) |

## EX-0012-0042: weightedTotal = min(L1, L2) (v1.7.15)

- BR-Ref: BR-0012-0043

| L1.total | L2.total | Expected weightedTotal |
| -------- | -------- | ---------------------- |
| 0.85     | 0.70     | 0.70                   |
| 0.60     | 0.90     | 0.60                   |
| 0.80     | 0.80     | 0.80                   |

## EX-0012-0043: Converged Requires iterationCount >= 2 (v1.7.15)

- BR-Ref: BR-0012-0044

| iterationCount | weightedTotal | acceptThreshold | Expected status |
| -------------- | ------------- | --------------- | --------------- |
| 1              | 0.95          | 0.80            | in-progress     |
| 2              | 0.85          | 0.80            | converged       |
| 1              | 0.50          | 0.80            | in-progress     |

## EX-0012-0044: Plateau and max-iterations (v1.7.15)

- BR-Ref: BR-0012-0045, BR-0012-0046

| iterationCount | Condition                                            | Expected terminationReason |
| -------------- | ---------------------------------------------------- | -------------------------- |
| 5              | score delta < plateauDelta for plateauLookback iters | plateau                    |
| 15             | iterationCount === maxIterations                     | max-iterations             |
| 10             | iterationCount < maxIterations, not converged        | null (continue)            |

## EX-0012-0045: reviewerLogs Append-Only (v1.7.15)

- BR-Ref: BR-0012-0047

- Given iteration 1 produces reviewerLog entry A
- When iteration 2 runs
- Then reviewerLogs === [A, B] (B appended, A unchanged)
- And reviewerLogs.length === 2 === iterationCount

## EX-0012-0046: Reviewer Placeholder Rejection (v1.7.15)

- BR-Ref: BR-0012-0048

| reviewerId input | Expected result                         |
| ---------------- | --------------------------------------- |
| "qfai"           | CLI/runtime error: placeholder reviewer |
| "default"        | CLI/runtime error: placeholder reviewer |
| "auto"           | CLI/runtime error: placeholder reviewer |
| "system"         | CLI/runtime error: placeholder reviewer |
| "unknown"        | CLI/runtime error: placeholder reviewer |
| ""               | CLI/runtime error: reviewer required    |
| "alice"          | Accepted                                |

## EX-0012-0047: commitSha Mandatory (v1.7.15)

- BR-Ref: BR-0012-0049

- Given full-harness mode and git is not available or HEAD is detached with no SHA
- When execution starts
- Then runtime error is thrown with message about missing commitSha

## EX-0012-0048: specCoverage Zero-Seeded Rejection (v1.7.15)

- BR-Ref: BR-0012-0050

| specCoverage output                                               | Expected |
| ----------------------------------------------------------------- | -------- |
| {uiRoutes: {declared:5, observed:3, ratio:0.6}, ...}              | Accepted |
| {uiRoutes: {declared:0, observed:0, ratio:0}, apiEndpoints: ...0} | Rejected |

## EX-0012-0049: uiFidelity Synthetic mockPaths Rejection (v1.7.15)

- BR-Ref: BR-0012-0051

| mockPaths entry                                        | Expected             |
| ------------------------------------------------------ | -------------------- |
| {path: "/login", status: "pass"} with browserQa backup | Accepted             |
| {path: "/login", status: "pass"} auto-generated        | Rejected (synthetic) |
| No browserQa findings                                  | mockPaths is empty   |

## EX-0012-0050: CalibrationLoader Fail-Fast (v1.7.15)

- BR-Ref: BR-0012-0053

| Calibration pack state      | Expected                                     |
| --------------------------- | -------------------------------------------- |
| Valid pack at expected path | CalibrationPack loaded, execution proceeds   |
| Pack file missing           | Runtime error: calibration pack not found    |
| Pack file unreadable        | Runtime error: calibration pack read failure |
| Pack schema invalid         | Runtime error: calibration schema mismatch   |

## EX-0012-0051: packVersion from Metadata (v1.7.15)

- BR-Ref: BR-0012-0054

| Pack metadata version | Expected packVersion |
| --------------------- | -------------------- |
| "2.1.0"               | "2.1.0"              |
| Metadata missing      | Runtime error        |

## EX-0012-0052: Docs-Runtime Claim Mapping (v1.7.15)

- BR-Ref: BR-0012-0055

- Given SKILL.md claims "reviewer is mandatory in full-harness"
- When runtime is inspected
- Then execution.ts throws error on missing/placeholder reviewer (1:1 correspondence)

## EX-0012-0053: Missing Evidence Fail-Fast (v1.7.15)

- BR-Ref: BR-0012-0056

| Missing evidence     | Expected                               |
| -------------------- | -------------------------------------- |
| Calibration pack     | Runtime error before measurement phase |
| Reviewer identity    | Runtime error before measurement phase |
| Commit SHA           | Runtime error before measurement phase |
| Render evidence      | Runtime error before measurement phase |
| Browser QA evidence  | Runtime error before measurement phase |
| UI observation input | Runtime error before measurement phase |
| Spec coverage input  | Runtime error before measurement phase |

## EX-0012-0054: extractHtmlLabelsFromString Replaced (v1.7.15)

- BR-Ref: BR-0012-0052

- Given HTML capture input with DOM labels
- When label extraction is invoked
- Then extractDomLabelsWithJsdom() in uiObservation.ts produces labels (old empty function removed from codebase)

## EX-0012-0055: Pre-Scored l1/l2 Rejected (v1.7.15 rev2)

- BR-Ref: BR-0012-0057

- Given a caller attempts `runFullHarness({ l1: {...}, l2: {...}, ... })`
- When TypeScript compilation runs
- Then compilation fails because l1/l2 do not exist in the request type

## EX-0012-0056: panelInputs Missing Throws (v1.7.15 rev2)

- BR-Ref: BR-0012-0057

- Given runFullHarness called with request lacking panelInputs
- When execution starts
- Then runtime throws "panelInputs required" before any measurement

## EX-0012-0067: FullHarnessIteration Required Fields (v1.7.15 rev2)

- BR-Ref: BR-0012-0058

- Given a FullHarnessIteration object
- When inspected
- Then l1, l2, weightedTotal, commitSha, reviewerId, limitations, evidenceRefs are all present and non-null

## EX-0012-0068: validatePanelInputs 10-Check (v1.7.15 rev2)

- BR-Ref: BR-0012-0059

| Input condition                                          | Expected |
| -------------------------------------------------------- | -------- |
| renderEvidence.totalScreens === 0                        | throw    |
| renderEvidence.evidenceRefs.length === 0                 | throw    |
| browserQa.executed === false                             | throw    |
| browserQa.evidenceRefs.length === 0                      | throw    |
| specCoverage.evidenceRefs.length === 0                   | throw    |
| uiObservation.htmlCaptureRefs.length === 0               | throw    |
| discussionAxes.evidenceRefs.length === 0                 | throw    |
| screenContract.evidenceRefs.length === 0                 | throw    |
| trendAlignment.evidenceRefs.length === 0                 | throw    |
| screenContract.totalContracts > 0 && fidelityScore === 0 | throw    |

## EX-0012-0069: panelScore Double Defense (v1.7.15 rev2)

- BR-Ref: BR-0012-0061

- Given aggregateScore = 1.5 (out of 0-1 range)
- When panelScore validation runs
- Then error: "aggregateScore must be 0-1"

- Given trendSourcesChecked = 0
- When panelScore validation runs
- Then error: "trend sources required"

## EX-0012-0057: l2Evidence Builder Happy Path (v1.7.15 rev2)

- BR-Ref: BR-0012-0060

- Given a discussion pack with 3-layer eval files (20-23) and screen contracts
- When buildDiscussionAxisInputs / buildScreenContractInputs / buildTrendAlignmentInputs run
- Then each returns populated input objects with real axis counts, contract coverage, and trend counts

## EX-0012-0058: l2Evidence Builder Missing Artifact (v1.7.15 rev2)

- BR-Ref: BR-0012-0060

- Given a discussion pack missing 3-layer eval files
- When buildDiscussionAxisInputs runs
- Then it throws an error indicating artifact insufficiency

## EX-0012-0059: CalibrationLoader All Failure Modes (v1.7.15 rev2)

- BR-Ref: BR-0012-0062

| Missing Item              | Expected Behavior                  |
| ------------------------- | ---------------------------------- |
| Pack file not found       | throw "calibration pack not found" |
| YAML parse error          | throw "invalid YAML"               |
| version field missing     | throw "version required"           |
| thresholds.accept missing | throw "accept threshold required"  |
| maxIterations missing     | throw "maxIterations required"     |
| plateauDelta missing      | throw "plateauDelta required"      |
| plateauLookback missing   | throw "plateauLookback required"   |

## EX-0012-0060: Termination Guard (v1.7.15 rev2)

- BR-Ref: BR-0012-0063

- Given iterationCount=1 and plateauLookback=3
- When computeTerminationReason runs
- Then status="in-progress" and terminationReason=undefined (neither plateau nor converged)

## EX-0012-0061: specCoverage Missing Spec (v1.7.15 rev2)

- BR-Ref: BR-0012-0064

- Given specNames=["alpha","beta"] and perSpecMap has only "alpha"
- When buildPrototypingSummaryBundle runs
- Then error thrown for missing "beta" (not zero-initialized)

## EX-0012-0062: ScreenObservation Happy Path (v1.7.15 rev2)

- BR-Ref: BR-0012-0065

- Given browser QA with interaction results for routes ["/", "/about"]
- When UiObservation builds
- Then screens array has 2 ScreenObservation entries, each with route, htmlCaptureRef, domLabelsFound, elementsPlaced, actionsWired (from QA), mockPathFindings

## EX-0012-0063: actionsWired Unknown (v1.7.15 rev2)

- BR-Ref: BR-0012-0065

- Given a screen where browser QA interaction phase did not execute
- When actionsWired is computed
- Then actionsWired = "unknown" (not 0)

## EX-0012-0064: uiFidelity Auto-Pass Absent (v1.7.15 rev2)

- BR-Ref: BR-0012-0065

- Given uiFidelity processing with expected mockPaths
- When building observed values
- Then no status="pass" entries are generated from expected paths

## EX-0012-0065: History Array Length Mismatch (v1.7.15 rev2)

- BR-Ref: BR-0012-0066

- Given iterations=[it1,it2] but scoringTrace=[st1]
- When history reconstruction runs
- Then runtime error thrown: "iterations.length !== scoringTrace.length"

## EX-0012-0066: Normal Fixture Rev2 Validation (v1.7.15 rev2)

- BR-Ref: BR-0012-0067

- Given normal-path test fixtures directory
- When grepped for `"l1":` or `"l2":` direct pass or `packVersion:"1.0.0"` or single-iteration converged
- Then zero matches found

## EX-0012-0070: Canonical Prototyping Surface Validation (v1.7.14)

- BR-Ref: BR-0012-0020

- Given a classification block with primary_surface="web-ui" (legacy -ui suffix)
- When assertCanonicalPrototypingSurface() is called
- Then validation fails; only the 5 canonical values (web/mobile/desktop/cli/mixed) are accepted

## EX-0012-0071: Execution Hard Gate on Invalid Recommendation (v1.7.14)

- BR-Ref: BR-0012-0021

- Given recommendation.status==="invalid" and classification===null from resolver output
- When execution.ts processes via readValidatedClassification() (strict API)
- Then a hard error is thrown; readClassificationBlock() (non-strict) is never used

## EX-0012-0072: Semantic Invariant — Mode Mismatch Cascade (v1.7.14)

- BR-Ref: BR-0012-0022

- Given recommended_mode="full-harness" but allowed_modes=["standard"] in prototyping.yaml
- When validateRecommendationSemantics() checks the mismatch
- Then parser returns null+warning, resolver returns invalid, execution throws hard error

## EX-0012-0073: Classification Separation — Surface-Based Obligations (v1.7.14)

- BR-Ref: BR-0012-0023

- Given classification with primary_surface="web" (needsVisualBrowserEvidence=true) and a second spec with primary_surface="cli"
- When derivePrototypingObligations() runs for each
- Then web spec gets requireRenderBundle=true, requireBrowserQaBundle=true; cli spec gets requireRuntimeGate=true, visual/browser evidence=false

## EX-0012-0074: Full-Harness Iteration Protocol Termination (v1.7.14)

- BR-Ref: BR-0012-0024

- Given full-harness mode with accept=0.7, max=10 iterations; at iteration 5 weightedTotal reaches 0.75
- When the 4-step cycle (Evaluate→Identify→Fix→Re-evaluate) completes iteration 5
- Then loop terminates with terminationReason="converged"; if iterationCount were 1 instead, QFAI-PROT-290 warning would fire

## EX-0012-0075: Independent Evaluator Panel Scoring (v1.7.14)

- BR-Ref: BR-0012-0025

- Given L1 (product-surface-reviewer) scores 0.72, L2 (product-experience-architect) scores 0.68, L3 (qa-gatekeeper) passes integrity
- When weightedTotal is computed
- Then weightedTotal = min(L1, L2) = min(0.72, 0.68) = 0.68; L1/L2 launched in background mode without improvement history

## EX-0012-0076: Score Scope Separation Enforcement (v1.7.14)

- BR-Ref: BR-0012-0026

- Given discussion 3-layer scores {product:0.8, engineering:0.7, quality:0.75} already recorded
- When an implementation copies these discussion scores directly into prototyping scoringTrace
- Then validation rejects: discussion scores measure design direction quality; scoringTrace measures implementation fidelity; copying is forbidden

## EX-0012-0077: Evaluation Rigor — Existence Gate Cap (v1.7.14)

- BR-Ref: BR-0012-0027

- Given L1 evaluator finds a required navigation element completely missing (existence_gate range 0.0–0.3, score=0.2)
- When the 3-tier rubric (existence_gate / quality_criteria / excellence_criteria) is applied
- Then total score capped at 0.3; finding classified as L1(structural, auto-fix)

## EX-0012-0078: Asset Acquisition — Emoji and Placeholder Forbidden (v1.7.14)

- BR-Ref: BR-0012-0028

- Given a full-harness prototyping output that uses emoji icons (🏠) in the hero section and "Lorem ipsum" placeholder text
- When asset acquisition rules are evaluated
- Then output rejected: emoji in UI forbidden, placeholder in final output forbidden; free sources (Unsplash, Pexels) MUST be used; WCAG 2.1 AA required

## EX-0012-0079: Reviewer Gate — Six Verification Checks (v1.7.14)

- BR-Ref: BR-0012-0029

- Given a full-harness result with iterationCount=1, scoringTrace=[0.65], terminationReason="converged"
- When the 6 reviewer verification checks run
- Then check fails on: iterationCount>1 (false), score improvement not shown (single entry), and terminationReason mismatch with trajectory

## EX-0012-0080: Validator Rules PROT-290~294 (v1.7.14)

- BR-Ref: BR-0012-0030

- Given iterationCount=3 but scoringTrace has 2 entries, and max_iterations=5
- When full-harness validator rules QFAI-PROT-290~294 are evaluated
- Then QFAI-PROT-291(warning) fires: trace length (2) ≠ iterationCount (3)

## EX-0012-0081: Maximum Delta Cap Exceeded (v1.7.14)

- BR-Ref: BR-0012-0031

- Given iteration N scores ux_quality=0.50, iteration N+1 scores ux_quality=0.70 (delta=0.20)
- When maxDeltaPerAxisPerIteration=0.15 cap is checked
- Then delta 0.20 exceeds cap 0.15; re-evaluation or justification is required before accepting the score

## EX-0012-0082: cli + full-harness Rejection (v1.7.15 rev4)

- BR-Ref: BR-0012-0069
- Given `surface: cli`, `mode: full-harness`
- When `derivePrototypingObligations()` is called
- Then exception is thrown with message indicating cli cannot use full-harness

## EX-0012-0083: web + full-harness Acceptance (v1.7.15 rev4)

- BR-Ref: BR-0012-0068
- Given `surface: web`, `mode: full-harness`
- When `derivePrototypingObligations()` is called
- Then obligations are derived successfully

## EX-0012-0084: 3-Screen Contract Target Generation (v1.7.15 rev4)

- BR-Ref: BR-0012-0070, BR-0012-0071
- Given `40_screen_contracts.md` with 3 screen definitions
- When Browser QA targets are generated
- Then 3 targets are created, each with its own evidence record

## EX-0012-0085: Missing Screen Contract File (v1.7.15 rev4)

- BR-Ref: BR-0012-0070
- Given `40_screen_contracts.md` does not exist
- When Browser QA target generation is attempted
- Then clear error message is returned indicating missing screen contract

## EX-0012-0086: Empty browserQa evidenceRefs Hard Fail (v1.7.15 rev4)

- BR-Ref: BR-0012-0072
- Given Browser QA execution completes with empty `evidenceRefs.browserQa`
- When iteration evidence is validated
- Then hard fail is triggered with explicit error message

## EX-0012-0087: browserQa Evidence Chain Populated (v1.7.15 rev4)

- BR-Ref: BR-0012-0072, BR-0012-0073
- Given Browser QA execution produces 2 phases and 3 findings
- When evidence chain is assembled
- Then `iterations[].evidenceRefs.browserQa` contains all phase refs and finding refs, and summary includes both

## EX-0012-0088: Canonical Route Comparison Match (v1.7.15 rev4)

- BR-Ref: BR-0012-0074
- Given screen contract route `/dashboard` and observation path `/dashboard/`
- When specCoverage compares routes
- Then routes match (trailing slash normalized)

## EX-0012-0089: URL Rejected as Route (v1.7.15 rev4)

- BR-Ref: BR-0012-0074
- Given input `https://app.example.com/dashboard?tab=1`
- When runtimeGateBuilder processes route
- Then URL is rejected as route (not canonical path)

## EX-0012-0090: Missing Observation Report (v1.7.15 rev4)

- BR-Ref: BR-0012-0075
- Given screen contract has routes `/dashboard`, `/settings`, `/profile`
- And observations exist only for `/dashboard`, `/settings`
- When specCoverage runs
- Then `/profile` is reported as `missing_observation`

## EX-0012-0091: L2 Structured Parse Priority (v1.7.15 rev4)

- BR-Ref: BR-0012-0076
- Given 20-23 structured files all present
- When l2Evidence collects evidence
- Then structured parse is used; heuristic fallback is not invoked

## EX-0012-0092: L2 Heuristic Fallback on Missing Structured Source (v1.7.15 rev4)

- BR-Ref: BR-0012-0076
- Given `04_Sources.md` structured fields are empty
- When l2Evidence collects evidence
- Then heuristic fallback is used for that source only, with warning log

## EX-0012-0093: skip→reject Conversion in Tests (v1.7.15 rev4)

- BR-Ref: BR-0012-0077
- Given test fixture with `skip: true` flag
- When cleanup is applied
- Then flag becomes `reject: true` and test expectation matches reject behavior

## EX-0012-0094: "/primary" Removed from Test Expectations (v1.7.15 rev4)

- BR-Ref: BR-0012-0077
- Given test expecting Browser QA target `"/primary"`
- When cleanup is applied
- Then test expectation uses screen contract-derived route

## EX-0012-0095: Parameterized Route Pattern Match (v1.7.15 rev4)

- BR-Ref: BR-0012-0079
- Given screen contract route `/orders/:id` and observation path `/orders/123`
- When pattern-based matching runs
- Then routes match

## EX-0012-0096: Docs Reality Sync Verification (v1.7.15 rev4)

- BR-Ref: BR-0012-0078
- Given README.md references stale behavior (e.g., `"/primary"` target)
- When reality sync cleanup is applied
- Then README reflects current screen contract-based target derivation

## EX-0012-0097: non-UI surface all-mode rejection (v1.7.15 rev5)

- BR-Ref: BR-0012-0080
- Given surface=cli and mode=standard
- When execution attempts to start
- Then mode.ts/execution.ts/runtime.ts/CLI/prototypingEvidence.ts all reject with reason code `unsupported_non_ui_prototyping_surface`

## EX-0012-0098: observed-only RuntimeObservation ledger (v1.7.15 rev5)

- BR-Ref: BR-0012-0081
- Given 3 declared routes, 2 rendered/observed, 1 never rendered
- When RuntimeObservation is built
- Then ledger contains only the 2 observed routes; unrendered route is absent; runtimeGate.api/db fields do not exist; specCoverage = 2/3 (66%)

## EX-0012-0099: per-screen Browser QA mandatory (v1.7.15 rev5)

- BR-Ref: BR-0012-0082
- Given 3 screen contracts, each with distinct browserQaEvidenceRefs
- When full-harness runs
- Then 3 separate Browser QA executions occur, each with its own refs; generic phaseLevelRefs fallback is absent; UIScreenObservation with no refs → observed=false/evidenceMissing=true

## EX-0012-0100: actionsWired = action coverage semantics (v1.7.15 rev5)

- BR-Ref: BR-0012-0083
- Given a screen with 3 declared controls, 2 DOM-observed and wired, 5 findings
- When actionsWired is computed
- Then actionsWired=2 (not 5); findings do NOT contribute to actionsWired; actionCoverage.ts provides the result

## EX-0012-0101: runFullHarness() required fields fail-closed (v1.7.15 rev5)

- BR-Ref: BR-0012-0084
- Given runFullHarness() called without screenContracts
- When execution starts
- Then immediate throw: "screenContracts is required"; no partial execution occurs

## EX-0012-0102: calibration pack SSOT (v1.7.15 rev5)

- BR-Ref: BR-0012-0085
- Given valid calibration pack with maxIterations=10, plateauDelta=0.01 AND config with different maxIterations=20
- When runtime and validator resolve thresholds via packResolver.ts
- Then both use maxIterations=10 (pack wins); config override is ignored; l2Evidence.ts uses structuredArtifactReaders.ts for 04_Sources.md
