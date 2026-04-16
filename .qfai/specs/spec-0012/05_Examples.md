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

## EX-0012-0103: Full-Harness Only Mode Enforcement (v1.7.15 rev6)

- BR-Ref: BR-0012-0086
- Given CLI invoked with `--mode standard` with a valid surface and calibration pack
- When prototyping execution is attempted
- Then CLI exits non-zero with error containing "full-harness mode only"; execution.ts never reached; CalibrationLoader never invoked

## EX-0012-0104: Non-UI Surface Rejection at All Layers (v1.7.15 rev6)

- BR-Ref: BR-0012-0087
- Given CLI invoked with `--surface cli` with a valid mode (full-harness) and calibration pack
- When prototyping execution is attempted
- Then CLI exits non-zero naming "cli" as rejected surface; execution.ts assertSupportedPrototypingSurface("cli") throws independently; prototypingEvidence validator rejects recorded output; all three layers fail before any I/O

## EX-0012-0105: surfacePolicy.ts Standalone Module (v1.7.15 rev6)

- BR-Ref: BR-0012-0088
- Given `isSupportedPrototypingSurface("cli")` called from a context that does not import mode.ts
- When evaluated
- Then returns false; `isSupportedPrototypingSurface("web")` returns true; `assertSupportedPrototypingSurface("api")` throws immediately; `PROTOTYPING_SUPPORTED_SURFACES` contains exactly ["web", "mobile", "desktop", "mixed"]

## EX-0012-0106: CalibrationLoader Internal Resolution (v1.7.15 rev6)

- BR-Ref: BR-0012-0089
- Given runFullHarness() called with `calibrationRef: { packPath: "./calib/missing.yaml" }` (file not found)
- When execution starts
- Then immediate Error thrown with packPath in message; no iterations begin; iteration[0] does not exist in output

## EX-0012-0107: Concrete evidenceRefs Validation (v1.7.15 rev6)

- BR-Ref: BR-0012-0090
- Given runtimeGate.evidenceRefs = ["prototyping.json#/runtimeGate"] (self-reference)
- When validator runs on the recorded output
- Then validator rejects with self-reference error; if evidenceRefs = ["specs: UI matches design"] (synthetic) then validator rejects with synthetic-ref error; if evidenceRefs = ["prototyping.json#/iterations/0/renderSummary", "screenshots/iter-0.png"] then validator passes

## EX-0012-0108: reviewerSignoff Semantics and screenId Matching (v1.7.15 rev6)

- BR-Ref: BR-0012-0091
- Given execution terminates with `terminationReason = "plateau"` and `reviewerSignoff.status = "approved"`
- When validator runs
- Then validator rejects: inconsistent status/terminationReason; plateau → abandoned (not approved);
  Given obs.screenId = "screen-login" and screen.screenId = "screen-001", screen.uiContractId = "screen-login"
- When uiFidelityBuilder matches
- Then no match found (old uiContractId path removed); only exact screenId equality produces a match

## EX-0012-0109: CalibrationLoader Called Before runFullHarness — Happy Path

- BR-Ref: BR-0012-0092
- Input: execution.ts with CalibrationLoader wired; valid packPath resolves to CalibrationPack
- Expected: runFullHarness receives { calibrationPack, calibrationRef }; no I/O in runtime.ts

## EX-0012-0110: CalibrationLoader Missing Pack — Negative Path

- BR-Ref: BR-0012-0092
- Input: packPath does not exist at runtime
- Expected: CalibrationResolutionError thrown; runFullHarness never called

## EX-0012-0111: runtime.ts Still Imports CalibrationLoader — Boundary

- BR-Ref: BR-0012-0092
- Input: runtime.ts source contains `import { CalibrationLoader } from ...`
- Expected: TypeScript compile error or lint failure

## EX-0012-0112: uiFidelity Incomplete Status — Negative Path

- BR-Ref: BR-0012-0093
- Input: uiFidelity.status = "insufficient-evidence"
- Expected: UiFidelityEvidenceError thrown; runFullHarness not called

## EX-0012-0113: uiFidelity Missing Evidence — Negative Path

- BR-Ref: BR-0012-0093
- Input: uiFidelity.missingRequiredEvidence = ["browser-qa"]
- Expected: UiFidelityEvidenceError thrown naming "browser-qa"

## EX-0012-0114: Required Screen Absent — Negative Path

- BR-Ref: BR-0012-0093
- Input: required screen "screen-checkout" absent from screenSummaries
- Expected: UiFidelityEvidenceError naming "screen-checkout"

## EX-0012-0115: Guard Fires After buildUiFidelity — State Transition

- BR-Ref: BR-0012-0093
- Input: guard position in execution.ts control flow
- Expected: guard fires after buildUiFidelity(), before buildSpecCoverageSummary() and runFullHarness()

## EX-0012-0116: Concrete Spec Anchor Ref — Happy Path

- BR-Ref: BR-0012-0094
- Input: evidenceRef = "40_screen_contracts.md#screen-login"
- Expected: isConcreteArtifactRef returns true; no validator error

## EX-0012-0117: Directory Path in evidenceRefs — Negative Path

- BR-Ref: BR-0012-0094
- Input: evidenceRef = "./evidence/prototyping/"
- Expected: isConcreteArtifactRef returns false; validator emits error

## EX-0012-0118: Self-Ref in evidenceRefs — Negative Path

- BR-Ref: BR-0012-0094
- Input: evidenceRef = ".qfai/evidence/prototyping.json#/specCoverage"
- Expected: isConcreteArtifactRef returns false; validator emits error

## EX-0012-0119: Synthetic Token in evidenceRefs — Negative Path

- BR-Ref: BR-0012-0094
- Input: evidenceRef = "specs: all screens covered"
- Expected: isConcreteArtifactRef returns false; validator emits error

## EX-0012-0120: Matching calibrationRef Metadata — Happy Path

- BR-Ref: BR-0012-0095
- Input: summary calibrationRef matches actual pack (packPath, packVersion, configPath all match)
- Expected: validator passes; no calibration mismatch error

## EX-0012-0121: packVersion Mismatch — Negative Path

- BR-Ref: BR-0012-0095
- Input: summary packVersion = "1.0.1", actual pack version = "1.0.2"
- Expected: validator emits error (not warning)

## EX-0012-0122: Hardcoded "1.0.0" Heuristic Removed — Boundary

- BR-Ref: BR-0012-0095
- Input: packVersion = "1.0.0" in summary but actual version = "1.0.2"
- Expected: validator emits error (heuristic removed; no special-case pass)

## EX-0012-0123: All 6 Error Classes Present — Happy Path

- BR-Ref: BR-0012-0096
- Input: prototyping/errors.ts file contents
- Expected: all 6 classes exported: CalibrationResolutionError, UiFidelityEvidenceError, SpecCoverageBuildError, L2EvidenceBuildError, FullHarnessRuntimeError, EvidenceWriteError

## EX-0012-0124: Bundle Write Failure Not Mapped to CalibrationResolutionError — Negative Path

- BR-Ref: BR-0012-0096
- Input: writeEvidenceBundle() throws
- Expected: EvidenceWriteError thrown (not CalibrationResolutionError)

## EX-0012-0125: packPath-Only Config — Happy Path

- BR-Ref: BR-0012-0097
- Input: config with only prototyping.calibration.packPath
- Expected: normalize succeeds; no error

## EX-0012-0126: Obsolete Scalar Field in Config — Negative Path

- BR-Ref: BR-0012-0097
- Input: config with thresholds.accept: 0.9
- Expected: normalize throws error naming "thresholds.accept" as obsolete

## EX-0012-0127: Rejection Message From Constant — Happy Path

- BR-Ref: BR-0012-0098
- Input: assertSupportedPrototypingSurface("cli") called
- Expected: error message contains current PROTOTYPING_SUPPORTED_SURFACES members (web, mobile, desktop, mixed); does not hardcode "cli"

## EX-0012-0128: Rejection Message Auto-Updates — Edge/Boundary

- BR-Ref: BR-0012-0098
- Input: PROTOTYPING_SUPPORTED_SURFACES extended with new value
- Expected: rejection message auto-includes the new value without code change

## EX-0012-0129: toRepoRelativeArtifactRef() Happy Path — POSIX Relative Output (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0100
- Input: `repoRoot = "/repo"`, `absolutePath = "/repo/.qfai/evidence/prototyping-iter0/run-report.md"`, `line = 12`
- Expected: `.qfai/evidence/prototyping-iter0/run-report.md#L12` (POSIX separator, repo-relative, with line anchor)

## EX-0012-0130: toRepoRelativeArtifactRef() with anchor Parameter (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0100
- Input: `repoRoot = "/repo"`, `absolutePath = "/repo/.qfai/evidence/iter-0/screenshot.png"`, `anchor = "finding-1"`
- Expected: `.qfai/evidence/iter-0/screenshot.png#finding-1` (anchor appended)

## EX-0012-0131: toRepoRelativeArtifactRef() Outside repoRoot — Throws (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0099
- Input: `repoRoot = "/repo"`, `absolutePath = "/other-repo/file.md"` (outside repoRoot)
- Expected: `toRepoRelativeArtifactRef()` throws (path is outside the repository root)

## EX-0012-0132: toRepoRelativeArtifactRef() Directory Path — Throws (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0099
- Input: `repoRoot = "/repo"`, `absolutePath = "/repo/.qfai/evidence/prototyping-iter0/"` (directory path, no file extension)
- Expected: `toRepoRelativeArtifactRef()` throws (directory paths are not valid artifact refs)

## EX-0012-0133: toRepoRelativeArtifactRef() Both line and anchor Specified — Throws (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0099
- Input: `repoRoot = "/repo"`, `absolutePath = "/repo/file.md"`, `line = 5`, `anchor = "section-a"` (both specified)
- Expected: `toRepoRelativeArtifactRef()` throws (line and anchor are mutually exclusive)

## EX-0012-0134: runtimeGate.evidenceRefs Valid Array — Validator Passes (v1.7.15 rev8 WS-2)

- BR-Ref: BR-0012-0101
- Input: `runtimeGate.evidenceRefs = [".qfai/evidence/iter-0/browser-qa.json#/finding-1"]`
- Expected: `validatePrototypingEvidence()` passes; no errors for the runtimeGate.evidenceRefs field

## EX-0012-0135: runtimeGate.evidenceRefs Absent — Validator Error (v1.7.15 rev8 WS-2)

- BR-Ref: BR-0012-0101
- Input: evidence summary where `runtimeGate.evidenceRefs` field is absent
- Expected: `validatePrototypingEvidence()` returns at least one error citing `runtimeGate.evidenceRefs` absence

## EX-0012-0136: runtimeGate.evidenceRefs Empty Array — Validator Error (v1.7.15 rev8 WS-2)

- BR-Ref: BR-0012-0101
- Input: `runtimeGate.evidenceRefs = []`
- Expected: `validatePrototypingEvidence()` returns at least one error; empty array is not valid

## EX-0012-0137: runtimeGate.evidenceRefs Absolute Path Entry — Validator Error (v1.7.15 rev8 WS-2)

- BR-Ref: BR-0012-0102
- Input: `runtimeGate.evidenceRefs = ["/abs/path/file.json"]`
- Expected: `validatePrototypingEvidence()` returns validator error for absolute path

## EX-0012-0138: runtimeGate.evidenceRefs Self-Ref Entry — Validator Error (v1.7.15 rev8 WS-2)

- BR-Ref: BR-0012-0102
- Input: `runtimeGate.evidenceRefs = [".qfai/evidence/prototyping.json#/runtimeGate"]`
- Expected: `validatePrototypingEvidence()` returns validator error for self-referential entry

## EX-0012-0139: All 5 Ref Sites Populated with Shared Helpers — Consistent Validation (v1.7.15 rev8 WS-3)

- BR-Ref: BR-0012-0103
- Input: evidence with all 5 ref sites populated using shared helpers from `pathUtils.ts`
- Expected: all 5 ref sites pass validator; no grammar mismatch between builder output and validator expectations

## EX-0012-0140: No Parallel Grammar Definition Outside pathUtils.ts — Grep Returns 0 Matches (v1.7.15 rev8 WS-3)

- BR-Ref: BR-0012-0103
- Input: grep for independent regex/pattern definitions for concrete-ref grammar outside `pathUtils.ts` in `packages/qfai/src`
- Expected: 0 matches; all ref grammar is sourced from `pathUtils.ts`

## EX-0012-0141: iterations[].evidenceRefs.runtimeGate Absolute Path Rejected — Same Grammar (v1.7.15 rev8 WS-3)

- BR-Ref: BR-0012-0103
- Input: evidence with `iterations[0].evidenceRefs.runtimeGate = ["/abs/path/file.json"]`
- Expected: validator error; same `isConcreteArtifactRef()` check applies as for top-level `runtimeGate.evidenceRefs`

## EX-0012-0142: specs[].coverageRefs[].declaredRef Absolute Path Throws at Generation (v1.7.15 rev8 WS-3)

- BR-Ref: BR-0012-0104
- Input: `buildPerSpecCoverage()` called with absolute path as input
- Expected: `toRepoRelativeArtifactRef()` throws before the absolute path reaches `declaredRef`

## EX-0012-0143: execution.ts assertConcreteArtifactRef() Blocks Absolute Builder Output (v1.7.15 rev8 WS-3)

- BR-Ref: BR-0012-0104
- Input: a builder producing absolute path in specCoverage evidenceRefs before bundle write
- Expected: `assertConcreteArtifactRef()` throws before bundle is written to disk

## EX-0012-0144: Closure Test Positive Path — runPrototypingExecution() Output Passes validatePrototypingEvidence() (v1.7.15 rev8 WS-4)

- BR-Ref: BR-0012-0105
- Input: `runPrototypingExecution()` called with valid inputs in `prototypingExecution.productionPath.test.ts`
- Expected: `validatePrototypingEvidence(output)` returns 0 errors; closure test passes

## EX-0012-0145: Closure Test Negative Injection — Absolute Path in specCoverage Causes Validator Error (v1.7.15 rev8 WS-4)

- BR-Ref: BR-0012-0105
- Input: fixture with `specCoverage.evidenceRefs[0] = "/abs/path/file.md"` passed to `validatePrototypingEvidence()`
- Expected: validation returns at least 1 error for the absolute path

## EX-0012-0146: specCoverage.test.ts Negative — Outside-Root Path Throws (v1.7.15 rev8 WS-4)

- BR-Ref: BR-0012-0106
- Input: `toRepoRelativeArtifactRef()` called from specCoverage with path outside repo root
- Expected: function throws; outside-root path is rejected at generation time

## EX-0012-0147: prototypingEvidence.test.ts Negative — Absent runtimeGate.evidenceRefs Causes Error (v1.7.15 rev8 WS-4)

- BR-Ref: BR-0012-0106
- Input: evidence fixture with `runtimeGate.evidenceRefs` field absent
- Expected: `validatePrototypingEvidence()` returns error for absent required field

## EX-0012-0148: prototypingEvidence.test.ts Negative — Empty Array runtimeGate.evidenceRefs Causes Error (v1.7.15 rev8 WS-4)

- BR-Ref: BR-0012-0106
- Input: evidence fixture with `runtimeGate.evidenceRefs = []`
- Expected: `validatePrototypingEvidence()` returns error; empty array is not valid

## EX-0012-0149: pathUtils.ts Import Isolation — Zero Imports from execution.ts Transitive Graph (v1.7.15 rev8 WS-1)

- BR-Ref: BR-0012-0099
- Input: `packages/qfai/src/core/prototyping/pathUtils.ts` source text
- Expected: static analysis (grep or AST) finds 0 import specifiers matching `execution`, `specCoverage`, `l2evidence`, or `harness/runtime`; the leaf module constraint is structurally enforced

## EX-0012-0150: runtimeGate.ui[] Row — Happy Path (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0107, BR-0012-0108, BR-0012-0109
- Input: `ui[0].declaredRef = ".qfai/contracts/ui/ui-0001-home.yaml#/screens/0"`, `renderEvidenceRefs = [".qfai/evidence/render/home.png"]`, `browserQaEvidenceRefs = [".qfai/evidence/browser-qa/home.json#/checks/0"]`
- Expected: Validator passes for this row

## EX-0012-0151: runtimeGate.ui[] — declaredRef Absent — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0107
- Input: `ui[0].declaredRef` field missing entirely
- Expected: Validator error: required field missing

## EX-0012-0152: runtimeGate.ui[] — declaredRef Absolute Path — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- Input: `ui[0].declaredRef = "/abs/path/spec.md"`
- Expected: Validator error: absolute path forbidden

## EX-0012-0153: runtimeGate.ui[] — renderEvidenceRefs Empty Array — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0109
- Input: `ui[0].renderEvidenceRefs = []`
- Expected: Validator error: non-empty required

## EX-0012-0154: runtimeGate.ui[] — renderEvidenceRefs Synthetic Token — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- Input: `ui[0].renderEvidenceRefs = ["a"]`
- Expected: Validator error: synthetic token is not a concrete artifact ref

## EX-0012-0155: runtimeGate.ui[] — browserQaEvidenceRefs Bare Filename — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- Input: `ui[0].browserQaEvidenceRefs = ["home.json"]`
- Expected: Validator error: bare filename without directory is not a concrete artifact ref

## EX-0012-0156: runtimeGate.ui[] — browserQaEvidenceRefs Windows Separator — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- Input: `ui[0].browserQaEvidenceRefs = [".qfai\\evidence\\home.json"]`
- Expected: Validator error: Windows separator forbidden

## EX-0012-0157: runtimeGate.ui[] — declaredRef Self-Ref — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- Input: `ui[0].declaredRef = ".qfai/evidence/prototyping.json#/runtimeGate/ui/0"`
- Expected: Validator error: self-ref forbidden

## EX-0012-0158: axes[] — l1 Axis evidenceRefs Synthetic Token — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l1.axes[0].evidenceRefs = ["a"]`
- Expected: Validator error: synthetic token is not a concrete artifact ref

## EX-0012-0159: axes[] — l2 Axis evidenceRefs Synthetic Token — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l2.axes[0].evidenceRefs = ["b"]`
- Expected: Validator error: synthetic token is not a concrete artifact ref

## EX-0012-0160: axes[] — l1 Axis evidenceRefs Absolute Path — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l1.axes[0].evidenceRefs = ["/abs/path/eval.md"]`
- Expected: Validator error: absolute path forbidden

## EX-0012-0161: axes[] — l2 Axis evidenceRefs Self-Ref — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l2.axes[0].evidenceRefs = [".qfai/evidence/prototyping.json#/iterations/0"]`
- Expected: Validator error: self-ref forbidden

## EX-0012-0162: axes[] — l1 Axis evidenceRefs Empty Array — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l1.axes[0].evidenceRefs = []`
- Expected: Validator error: non-empty required

## EX-0012-0163: axes[] — Per-Axis Isolation — Error for One Axis Does Not Suppress Another (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- Input: `l1.axes[0].evidenceRefs = [".qfai/evidence/iter-0/good.md"]`, `l1.axes[1].evidenceRefs = ["a"]`
- Expected: Validator error for axes[1]; no suppression due to axes[0] being valid

## EX-0012-0164: reviewerLogs[] — Synthetic Token "reviewer:1" — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- Input: `reviewerLogs[0].evidenceRefs = ["reviewer:1"]`
- Expected: Validator error: synthetic token is not a concrete artifact ref

## EX-0012-0165: reviewerLogs[] — Absolute Path — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- Input: `reviewerLogs[0].evidenceRefs = ["/abs/path/reviewer.md"]`
- Expected: Validator error: absolute path forbidden

## EX-0012-0166: reviewerLogs[] — Empty Array — Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- Input: `reviewerLogs[0].evidenceRefs = []`
- Expected: Validator error: non-empty required

## EX-0012-0167: bundleWriter.ts — declaredRef Required — TypeScript Compile Error on Omit (v1.7.15 rev9 WS-2)

- BR-Ref: BR-0012-0112
- Input: TypeScript code that constructs a `runtimeGate.ui[]` row without `declaredRef`
- Expected: TypeScript compile error (not a runtime error)

## EX-0012-0168: bundleWriter.ts — All Leaf Arrays Required — TypeScript Compile Error on Null (v1.7.15 rev9 WS-2)

- BR-Ref: BR-0012-0112
- Input: TypeScript code that assigns `null` to `renderEvidenceRefs`
- Expected: TypeScript compile error (type disallows null)

## EX-0012-0169: Runtime Builder — Cannot Populate Leaf Array — Throws (v1.7.15 rev9 WS-2)

- BR-Ref: BR-0012-0113
- Input: Runtime builder in a state where `browserQaEvidenceRefs` cannot be populated
- Expected: Runtime error thrown before bundle write

## EX-0012-0170: Fixture Replacement — Synthetic Token Removed, Concrete Ref Added (v1.7.15 rev9 WS-3)

- BR-Ref: BR-0012-0114
- Input: Existing fixture with `evidenceRefs = ["a"]`
- Expected: Fixture updated to `evidenceRefs = [".qfai/evidence/iter-0/fidelity-eval.md#finding-1"]`; `pnpm vitest run --project validators` passes

## EX-0012-0171: All 15 Negative Cases Present and Passing (v1.7.15 rev9 WS-3)

- BR-Ref: BR-0012-0115
- Input: prototypingEvidence.test.ts after WS-3 + `pnpm vitest run --project validators`
- Expected: All 15 negative cases (7 ui[] + 5 axis + 3 reviewer) present, named, and passing

## EX-0012-0172: README Enumerates All Leaf Fields — No Partial Coverage Claim (v1.7.15 rev9 WS-4)

- BR-Ref: BR-0012-0116
- Input: packages/qfai/README.md after WS-4 with all leaf fields enumerated
- Expected: README explicitly lists all concrete-ref contract fields; no language implying only top-level fields are validated

## EX-0012-0150: ui[] Row — declaredRef Absent is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0107
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].declaredRef` field is missing entirely from the bundle
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; error identifies missing `declaredRef` on `ui[]` row

## EX-0012-0151: ui[] Row — declaredRef Absolute Path is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].declaredRef = "/abs/path/spec.md"` (absolute path)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; absolute path rejected by `isConcreteArtifactRef()`

## EX-0012-0152: ui[] Row — declaredRef Synthetic Token is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].declaredRef = "spec"` (synthetic token / bare filename)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; synthetic token rejected

## EX-0012-0153: ui[] Row — declaredRef Concrete Ref Passes (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0107, BR-0012-0108
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].declaredRef = ".qfai/contracts/ui/ui-0001-home.yaml#/screens/0"`
- When: `validatePrototypingEvidence()` processes this bundle (all other fields valid)
- Then: no validation error for this field

## EX-0012-0154: ui[] Row — renderEvidenceRefs[] Empty Array is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0109
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].renderEvidenceRefs = []` (empty array)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; non-empty required

## EX-0012-0155: ui[] Row — renderEvidenceRefs[] Synthetic Token is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].renderEvidenceRefs = ["a"]` (synthetic token)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; synthetic token `"a"` rejected by `isConcreteArtifactRef()`

## EX-0012-0156: ui[] Row — browserQaEvidenceRefs[] Empty Array is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0109
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].browserQaEvidenceRefs = []` (empty array)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; non-empty required

## EX-0012-0157: ui[] Row — browserQaEvidenceRefs[] Windows Separator is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- US-Ref: US-0012-0067
- Given: `runtimeGate.ui[0].browserQaEvidenceRefs = [".qfai\\evidence\\home.json"]` (Windows `\\`)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; Windows separator rejected

## EX-0012-0158: ui[] Row — All Leaf Fields Valid Passes (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0107, BR-0012-0108, BR-0012-0109
- US-Ref: US-0012-0067
- Given: `ui[0].declaredRef = ".qfai/contracts/ui/ui-0001-home.yaml#/screens/0"`, `renderEvidenceRefs = [".qfai/evidence/render/home.png"]`, `browserQaEvidenceRefs = [".qfai/evidence/browser-qa/home.json#/checks/0"]`
- When: `validatePrototypingEvidence()` processes this bundle
- Then: no validation error for this ui[] row

## EX-0012-0159: ui[] Row — isConcreteArtifactRef() Reused (No Parallel Grammar) (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0108
- US-Ref: US-0012-0067
- Given: `prototypingEvidence.ts` source is inspected after WS-1
- When: static analysis searches for concrete-ref validation patterns outside `isConcreteArtifactRef()` calls
- Then: no parallel regex or pattern definitions exist; all leaf validation routes through `pathUtils.ts`

## EX-0012-0160: Axis L1 — evidenceRefs[] Synthetic Token "a" is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `iterations[0].l1.axes[0].evidenceRefs = ["a"]` (synthetic token)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; `"a"` rejected by `isConcreteArtifactRef()`

## EX-0012-0161: Axis L2 — evidenceRefs[] Synthetic Token "b" is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `iterations[0].l2.axes[0].evidenceRefs = ["b"]` (synthetic token)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; `"b"` rejected

## EX-0012-0162: Axis — evidenceRefs[] Per-Axis: One Good Axis, One Bad Axis (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `l1.axes[0].evidenceRefs = [".qfai/evidence/iter-0/axis-0.md#finding-1"]`; `l1.axes[1].evidenceRefs = ["a"]`
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error for axis 1 regardless of axis 0 being valid (per-axis granularity)

## EX-0012-0163: Axis L1 — evidenceRefs[] Empty Array is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `iterations[0].l1.axes[0].evidenceRefs = []` (empty)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; non-empty required per axis

## EX-0012-0164: Axis — evidenceRefs[] Absolute Path is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `l2.axes[0].evidenceRefs = ["/abs/path/eval.md"]` (absolute path)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced

## EX-0012-0165: Axis — evidenceRefs[] Self-Ref to prototyping.json is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0110
- US-Ref: US-0012-0068
- Given: `l2.axes[0].evidenceRefs = [".qfai/evidence/prototyping.json#/iterations/0"]` (self-ref)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; self-ref rejected

## EX-0012-0166: reviewerLogs — evidenceRefs[] Synthetic Token "reviewer:1" is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- US-Ref: US-0012-0069
- Given: `reviewerLogs[0].evidenceRefs = ["reviewer:1"]` (synthetic token)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; `"reviewer:1"` rejected

## EX-0012-0167: reviewerLogs — evidenceRefs[] Absolute Path is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- US-Ref: US-0012-0069
- Given: `reviewerLogs[0].evidenceRefs = ["/abs/path/reviewer.md"]` (absolute path)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced

## EX-0012-0168: reviewerLogs — evidenceRefs[] Empty Array is Validator Error (v1.7.15 rev9 WS-1)

- BR-Ref: BR-0012-0111
- US-Ref: US-0012-0069
- Given: `reviewerLogs[0].evidenceRefs = []` (empty)
- When: `validatePrototypingEvidence()` processes this bundle
- Then: validation error produced; non-empty required

## EX-0012-0169: bundleWriter.ts declaredRef Required — Type Error for Omitted Field (v1.7.15 rev9 WS-2)

- BR-Ref: BR-0012-0112
- US-Ref: US-0012-0070
- Given: TypeScript code builds a `ui[]` row without `declaredRef` field after WS-2
- When: `pnpm check-types` runs
- Then: TypeScript type error; `declaredRef` is required not optional

## EX-0012-0170: bundleWriter.ts Leaf Arrays Required Non-Nullable — Null Emission Prevented (v1.7.15 rev9 WS-2)

- BR-Ref: BR-0012-0112, BR-0012-0113
- US-Ref: US-0012-0070
- Given: `runtimeObservation.ts` or `runtimeGateBuilder.ts` attempted to emit `null` for `renderEvidenceRefs`
- When: `pnpm check-types` runs after WS-2
- Then: TypeScript type error; null emission is prevented by required non-nullable schema

## EX-0012-0171: 15 Negative Cases Present in prototypingEvidence.test.ts (v1.7.15 rev9 WS-3)

- BR-Ref: BR-0012-0115
- US-Ref: US-0012-0071
- Given: `tests/core/prototypingEvidence.test.ts` is inspected after WS-3
- When: test suite runs with `pnpm vitest run --project validators --project core`
- Then: 7 ui[] negative cases + 5 axis negative cases + 3 reviewer negative cases all present and failing on invalid input

## EX-0012-0172: README Enumerates All Concrete-Ref Leaf Fields (v1.7.15 rev9 WS-4)

- BR-Ref: BR-0012-0116
- US-Ref: US-0012-0071
- Given: `packages/qfai/README.md` is inspected after WS-4
- When: README content is reviewed
- Then: `ui[].declaredRef`, `ui[].renderEvidenceRefs[]`, `ui[].browserQaEvidenceRefs[]`, `axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]` are all explicitly listed as concrete-ref fields; no partial-strictness gap

## EX-0012-0173: in-progress terminationReason violation (BR-0012-0117)

- Happy path: status=in-progress, terminationReason absent → validator PASS
- Negative path: status=in-progress, terminationReason="abandoned" → validator ERROR
- Edge/boundary: terminationReason="" (empty string) → validator ERROR (empty string is treated as PRESENT but invalid; a key must be absent, not empty, to satisfy "must be absent" constraint of BR-0012-0117)

BR-Ref: BR-0012-0117

## EX-0012-0174: in-progress field constraint violations (BR-0012-0118)

- Happy path: status=in-progress, finalDecision=pending, reviewerSignoff.status=pending → PASS
- Negative path A: status=in-progress, finalDecision=abandoned → ERROR
- Negative path B: status=in-progress, reviewerSignoff.status=abandoned → ERROR

BR-Ref: BR-0012-0118

## EX-0012-0175: completed terminationReason required (BR-0012-0119)

- Happy path A: status=completed, terminationReason=abandoned → PASS
- Happy path B: status=completed, terminationReason=max-iterations → PASS
- Happy path C: status=completed, terminationReason=plateau → PASS
- Negative path: status=completed, terminationReason absent → ERROR
- Negative path: status=completed, terminationReason="unknown-value" → ERROR

BR-Ref: BR-0012-0119

## EX-0012-0176: terminationReason mapping consistency (BR-0012-0120)

- Happy path: completed+abandoned, finalDecision=abandoned, reviewerSignoff.status=abandoned → PASS
- Negative path A: completed+abandoned, finalDecision=pending → ERROR
- Negative path B: completed+max-iterations, reviewerSignoff.status=pending → ERROR

BR-Ref: BR-0012-0120

## EX-0012-0177: canonical sourceRef usage (BR-0012-0121)

- Happy path: buildScreenContractInputs() output ref = readCanonicalScreenContracts() sourceRef → PASS
- Negative path: output ref contains slug-derived anchor (e.g., "#home") vs sourceRef ("#home-screen") → FAIL
- Idempotency: calling twice with same input produces same output ref

BR-Ref: BR-0012-0121

## EX-0012-0178: evidenceRefs 8-category completeness (BR-0012-0122)

- Happy path: all 8 categories non-empty with concrete artifact refs → PASS
- Negative path A: render=[] (empty array) → ERROR
- Negative path B: runtimeGate=["TODO"] (placeholder) → ERROR
- Negative path C: specCoverage=[""] (empty string) → ERROR
- Edge: all 8 categories have exactly 1 valid concrete ref → PASS

BR-Ref: BR-0012-0122

## EX-0012-0179: declaredRef semantic validation (BR-0012-0123)

- Happy path A: ".qfai/specs/spec-XXXX/01_Spec.md#L42" → PASS
- Happy path B: ".qfai/specs/spec-XXXX/01_Spec.md#US-0012-0001" → PASS
- Negative path A: ".qfai/specs/spec-XXXX/01_Spec.md" (bare path, no anchor) → ERROR
- Negative path B: ".qfai/discussion/discussion-xxx/06_REQ.md#REQ-0001" → ERROR
- Negative path C: "packages/qfai/src/core/prototyping/runtime.ts#L42" → ERROR

BR-Ref: BR-0012-0123
