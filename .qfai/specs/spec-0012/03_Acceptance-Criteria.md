# 03 Acceptance Criteria

## AC-0012-0001: All Specs in Coverage Matrix

Given specs in `.qfai/specs/spec-*`, when prototyping runs, then every spec has a row in the Coverage Matrix.

## AC-0012-0002: 4-Source Diff Detection

Given changed spec files, when Spec Auto-Discovery runs, then changed specs are detected from branch diff, local changes, evidence mtime, and delta.md (union logic).

## AC-0012-0003: Default Mode Is Standard

Given no explicit mode selection, when prototyping runs, then standard mode is used (static + optional light validation, no runtime required).

## AC-0012-0004: Full-Harness Opt-In Only

Given no explicit mode selection, when prototyping runs, then full-harness mode is NOT activated. Full-harness requires explicit user opt-in.

## AC-0012-0005: API Gate Zero 404

Given declared API endpoints, when Runtime Gate v2 checks them, then zero 404 results are produced (stub handlers are acceptable).

## AC-0012-0006: Placeholder Pages Marked REVISE

Given a page with only placeholder content (lorem ipsum, single static string), when the reviewer evaluates, then it is marked REVISE.

## AC-0012-0007: Non-UI Skips UI Obligations

Given a project with `surface: non-ui`, when prototyping runs, then UI route checks, screen rendering, and visual fidelity gates are skipped.

## AC-0012-0008: Evidence Artifacts Produced

Given prototyping completion, when evidence is checked, then both markdown and JSON artifacts exist under `.qfai/evidence/` with uiFidelity for L2.

## AC-0012-0009: Full-Harness Loop Convergence

Given full-harness mode, when the workflow loop runs, then it converges when all dimension floors are met and aggregate score exceeds threshold, or terminates at max iterations.

## AC-0012-0010: No Active Document References CLI Command

Given active documents (specs, policies, README, SKILL.md, CHANGELOG), when searched for `qfai prototyping` as a valid CLI invocation, then zero matches are found. Archived/superseded content is exempt if clearly labelled.

## AC-0012-0011: Skill Contract Is SSOT for Prototyping Interface

Given the prototyping skill contract (`SKILL.md`), when its interface section is inspected, then it declares `/qfai-prototyping` as the sole invocation method and contains no CLI command fallback.

## AC-0012-0012: Static-First Mode-Aware Contract Normalized

Given the prototyping skill contract, when its mode section is inspected, then it declares static-first (standard) as default, documents all three modes with their obligations, and does not delegate mode definitions to external policies.

## AC-0012-0013: Mode Resolution Deterministic

Given a prototyping.yaml with `prototyping.recommended_mode: low-cost` and no user override, when mode resolution runs, then effectiveMode is "low-cost" and source is "discussion-recommendation".

## AC-0012-0014: Existence-Based Precedence Prevents Fallback

Given a prototyping.yaml with `prototyping:` key containing an invalid value (e.g., scalar instead of object), when mode resolution runs, then an error is emitted (not a silent fallback to legacy top-level keys).

## AC-0012-0015: Recommendation Artifact Status

Given a discussion-pack with a valid prototyping.yaml, when `resolveLatestRecommendationArtifact()` runs, then status is "valid" and the recommendation object is populated.

## AC-0012-0016: Obligation Matrix by Surface and Mode

Given surface="web" and mode="standard", when `derivePrototypingObligations()` runs, then requireRuntimeGate=true, requireUiFidelity=true, requireRenderBundle=false, requireBrowserQaBundle=false, requireFullHarness=false.

## AC-0012-0017: Obligation Matrix Non-UI

Given surface="non-ui" and mode="standard", when `derivePrototypingObligations()` runs, then requireUiFidelity=false, requireRenderBundle=false, requireBrowserQaBundle=false.

## AC-0012-0018: Calibration Config Defaults

Given qfai.config.yaml with no `prototyping` stanza, when config normalization runs, then prototyping.calibration uses defaults: accept=0.8, refine=0.5, maxIterations=15, plateauDelta=0.02, plateauLookback=3.

## AC-0012-0019: Report Prototyping Section

Given valid prototyping evidence, when qfai report runs, then the report includes a `## Prototyping` section with mode, obligations, evidence, harness, render, browserQa, calibration subsections.

## AC-0012-0020: Canonical Prototyping Surface Names

Given prototyping configuration with surface "web", when execution validates the surface, then it is accepted. Given surface "web-ui", then it is rejected with an error indicating the canonical name.

## AC-0012-0021: Execution Rejects Invalid Classification

Given a discussion-pack with contradictory classification (ui_bearing=true but primary_surface=non-ui), when execution.ts runs, then a hard error is thrown immediately without fallback or continuation.

## AC-0012-0022: Execution Rejects Non-UI Packs

Given a discussion-pack classified as non-UI (ui_bearing=false, primary_surface=non-ui), when execution.ts runs, then it is rejected with "Non-UI classification is not a prototyping execution target".

## AC-0012-0023: Legacy Top-Level Keys Hard-Rejected

Given a prototyping.yaml with legacy top-level keys (recommended_mode at root level), when mode resolution runs, then a hard error is returned (not a warning or fallback to namespaced block).

## AC-0012-0024: Semantic Invariant Enforced at Parser

Given a prototyping.yaml where recommended_mode is "full-harness" but allowed_modes is ["low-cost", "standard"], when extractRecommendation() runs, then it returns null with a semantic mismatch warning.

## AC-0012-0025: CLI Surface Skips Browser Evidence

Given a discussion-pack with surface "cli" and mode "standard", when derivePrototypingObligations() runs, then requireRenderBundle=false and requireBrowserQaBundle=false, but requireRuntimeGate=true.

## AC-0012-0026: Surface Inference Returns Null

Given a prototyping.yaml with no surface field and no evidence signals, when inferSurfaceFromRecommendationAndEvidence() runs, then it returns null (not "non-ui").

## AC-0012-0027: Full-Harness Iteration Cycle

Given full-harness mode, when the iteration protocol runs, then each iteration executes exactly 4 steps (Evaluate→Identify→Fix→Re-evaluate) and records a scoringTrace entry with weightedTotal, decision, evaluators, and axisDelta.

## AC-0012-0028: Independent Evaluator Invocation

Given full-harness mode, when evaluation is performed, then product-surface-reviewer and product-experience-architect are launched via `task` tool in `background` mode
with separate contexts receiving only screenshots/HTML snapshots and evaluation axis definitions (no improvement history or previous scores).

## AC-0012-0029: Score Scope Enforcement

Given a prototyping skill execution in full-harness mode, when scoringTrace is recorded, then no entry contains scores copied from discussion 3-layer aggregate evaluation. Discussion scores measure design direction quality; prototyping scores measure implementation fidelity.

## AC-0012-0030: Evaluation Rigor Rubric

Given full-harness evaluation, when an evaluator scores an axis, then the score uses a 3-tier rubric: existence_gate (0-0.3), quality_criteria (0.3-0.7), excellence_criteria (0.7-1.0). An axis failing existence_gate cannot score above 0.3.

## AC-0012-0031: Asset Quality Gates

Given full-harness mode with surface=web, when final output is evaluated, then no emoji characters (U+1F000–U+1FAFF, U+2600–U+27BF) appear as decorative elements,
no placeholder content (lorem ipsum, placeholder.com images) exists, and color contrast ratios meet WCAG 2.1 AA (≥4.5:1 normal text, ≥3:1 large text).

## AC-0012-0032: Reviewer Gate Full-Harness Checks

Given full-harness evidence, when the reviewer evaluates, then it verifies: iterationCount>1 (or explicit justification), scoringTrace count matches iterationCount, scores show progression, terminationReason is consistent, independent evaluators were invoked, and a limitations section is present.

## AC-0012-0033: PROT-290~294 Validator Rules

Given full-harness evidence with iterationCount=1 and terminationReason=converged, when prototypingEvidence validator runs, then QFAI-PROT-290 warning is emitted.
Given scoringTrace.length≠iterationCount, then QFAI-PROT-291 warning. Given terminationReason=max-iterations but count<maxIterations, then QFAI-PROT-292 warning.
Given iterationCount>maxIterations, then QFAI-PROT-293 warning. Given non-increasing scoringTrace, then QFAI-PROT-294 info.

## AC-0012-0026-01: Real Panel Scoring from Evidence (v1.7.15)

Given a full-harness run with valid evidence inputs, when scoreL1() and scoreL2() execute, then both produce non-zero totals derived from actual evidence (not fixed l1/l2={total:0, axes:[]}).

## AC-0012-0026-02: Converged Requires iterationCount >= 2 (v1.7.15)

Given a full-harness run where weightedTotal >= acceptThreshold at iteration 1, when termination logic runs, then status remains in-progress (not converged). Converged is only set when iterationCount >= 2 and plateau/threshold conditions are met.

## AC-0012-0026-03: weightedTotal = min(L1, L2) (v1.7.15)

Given L1.total=0.85 and L2.total=0.70, when computeWeightedTotal() runs, then weightedTotal === 0.70 (always the minimum).

## AC-0012-0027-01: Missing Reviewer Fails Fast (v1.7.15)

Given a full-harness run with no reviewer specified or reviewer set to a placeholder value (qfai/default/auto/system/unknown/""), when execution starts, then a runtime error is thrown before any measurement occurs.

## AC-0012-0027-02: Missing commitSha Fails Fast (v1.7.15)

Given a full-harness run where git commit SHA cannot be obtained, when execution starts, then a runtime error is thrown (no silent fallback to empty string or placeholder).

## AC-0012-0027-03: Missing Calibration Pack Fails Fast (v1.7.15)

Given a full-harness run where the calibration pack is absent, unreadable, or schema-invalid, when CalibrationLoader runs in execution.ts, then a runtime error is thrown.

## AC-0012-0027-04: Missing Render/BrowserQA/UiObservation/SpecCoverage Evidence Fails Fast (v1.7.15)

Given a full-harness run where any of render evidence, browser QA evidence, UI observation input, or spec coverage input is missing, when the measurement phase starts, then a runtime error is thrown for each missing piece.

## AC-0012-0028-01: specCoverage from Real Diffs (v1.7.15)

Given declared spec artifacts and observed runtime artifacts, when buildSpecCoverageSummary() runs, then specCoverage reflects actual coverage ratios for uiRoutes, apiEndpoints, and dbObjects. Zero-seeded output ({declared:0, observed:0, ratio:0} for all axes) is rejected.

## AC-0012-0028-02: uiFidelity Rejects Synthetic mockPaths (v1.7.15)

Given a full-harness run, when uiFidelity is built, then no mockPaths entry has status="pass" unless backed by actual browser QA findings. Auto-generated pass entries are rejected.

## AC-0012-0028-03: extractHtmlLabelsFromString Replaced (v1.7.15)

Given HTML capture input, when label extraction runs, then extractDomLabelsWithJsdom() in uiObservation.ts is used (the old empty-implementation extractHtmlLabelsFromString is removed).

## AC-0012-0029-01: Docs Claims Match Runtime Failures (v1.7.15)

Given SKILL.md / evidence README / discussion README, when their constraint claims are enumerated, then each claim maps 1:1 to a validator rule or runtime error condition in the codebase.

## AC-0012-0029-02: packVersion from Pack Metadata (v1.7.15)

Given a calibration pack with metadata, when packVersion is resolved, then it matches the pack metadata value (not hardcoded "1.0.0").

## AC-0012-0030-01: request.l1/l2 Removed from Type (v1.7.15 rev2)

Given runFullHarness() request type, when inspected, then l1 and l2 fields do not exist in the type definition.

## AC-0012-0030-02: panelInputs Required (v1.7.15 rev2)

Given a runFullHarness() call without panelInputs, when executed, then a runtime error is thrown immediately.

## AC-0012-0030-03: Scoring Pipeline Internal Only (v1.7.15 rev2)

Given runFullHarness() execution, when scoring runs, then validatePanelInputs → scorePanelsFromInputs → determineDecision executes in strict sequence within the runtime.

## AC-0012-0031-01: l2Evidence.ts Exists with 3 Builders (v1.7.15 rev2)

Given packages/qfai/src/core/prototyping/, when l2Evidence.ts is inspected, then buildDiscussionAxisInputs, buildScreenContractInputs, buildTrendAlignmentInputs are exported.

## AC-0012-0031-02: Discussion Axis Inputs from Real Artifact (v1.7.15 rev2)

Given a discussion pack with 3-layer evaluation files, when buildDiscussionAxisInputs runs, then axis counts are extracted from actual files and artifact evaluation values are not reused.

## AC-0012-0031-03: execution.ts L2 Dummy Objects Removed (v1.7.15 rev2)

Given execution.ts source, when grepped for `aggregateScore:0, evidenceRefs:[]` or `fidelityScore:0, evidenceRefs:[]` or `translationConsistency:0, evidenceRefs:[]`, then zero matches are found.

## AC-0012-0032-01: CalibrationLoader Throws on Missing Pack (v1.7.15 rev2)

Given no calibration pack file, when CalibrationLoader runs, then it throws an error (not returns DEFAULT_PACK).

## AC-0012-0032-02: CalibrationLoader Throws on Schema Violation (v1.7.15 rev2)

Given a calibration pack YAML missing version/thresholds.accept/thresholds.refine/maxIterations/plateauDelta/plateauLookback, when CalibrationLoader runs, then it throws for each missing field.

## AC-0012-0032-03: Config Fallback Limited to packPath (v1.7.15 rev2)

Given execution.ts calibration resolution, when config provides thresholds/maxIterations/plateauDelta/plateauLookback, then those values are ignored (only packPath from config is used).

## AC-0012-0033-01: count < plateauLookback Returns In-Progress (v1.7.15 rev2)

Given history.ts with iterationCount < calibration.plateauLookback, when computeTerminationReason runs, then status="in-progress" and terminationReason=undefined.

## AC-0012-0033-02: Validator Rejects Premature Termination (v1.7.15 rev2)

Given terminationReason="plateau" with iterationCount < plateauLookback, when the validator runs, then an error is emitted.

## AC-0012-0034-01: specCoverage Missing Spec is Error (v1.7.15 rev2)

Given specNames containing "spec-0001" but perSpecMap lacking it, when buildPrototypingSummaryBundle runs, then an error is thrown (not zero-initialized).

## AC-0012-0034-02: specCoverage Silent Empty Prohibited (v1.7.15 rev2)

Given loadDeclaredSpecArtifacts returning empty declaration extraction despite readable spec dirs, when processing, then an error is thrown.

## AC-0012-0034-03: DB Coverage Binary Policy (v1.7.15 rev2)

Given declared DB objects > 0 and no observation, when coverage is evaluated, then full-harness failure occurs (not silent missing continuation).

## AC-0012-0035-01: ScreenObservation Array Returned (v1.7.15 rev2)

Given UiObservationSummary output, when inspected, then it contains screens: ScreenObservation[] (not flattened aggregates).

## AC-0012-0035-02: actionsWired from Browser QA (v1.7.15 rev2)

Given a screen with browser QA interaction data, when actionsWired is computed, then it reflects browser QA observation (not 0 fixed).

## AC-0012-0035-03: actionsWired Unknown for Unobservable (v1.7.15 rev2)

Given a screen without browser QA interaction data, when actionsWired is set, then it uses "unknown" (not 0).

## AC-0012-0035-04: uiFidelityBuilder Screen-Level Only (v1.7.15 rev2)

Given uiFidelityBuilder processing, when building observed values, then each screen uses only its own html capture DOM labels/actions (no cross-screen sharing).

## AC-0012-0035-05: uiFidelity Auto-Pass Abolished (v1.7.15 rev2)

Given uiFidelity processing, when mockPaths are built, then no status="pass" is auto-generated. Expected-to-observed copying is prohibited.

## AC-0012-0036-01: reviewerLog Contains 8 Categories (v1.7.15 rev2)

Given reviewerLog.evidenceRefs, when inspected, then all 8 evidence categories are present (not just render/browserQa).

## AC-0012-0036-02: History Array Length Strict (v1.7.15 rev2)

Given history reconstruction, when iterations.length !== iterationCount or scoringTrace.length !== iterationCount or reviewerLogs.length !== iterationCount, then a runtime error is thrown.

## AC-0012-0036-03: bundleWriter Schema v2 Only (v1.7.15 rev2)

Given bundleWriter output, when schema version is checked, then it outputs schema v2 format only (8-category evidenceRefs + FullHarnessIteration new fields). No v1 output path exists.

## AC-0012-0037-01: Normal Fixtures Rev2 Clean (v1.7.15 rev2)

Given normal-path test fixtures, when inspected, then l1/l2 direct pass, packVersion:"1.0.0", single-iteration converged, actionsWired=0, flattened DOM labels are absent.

## AC-0012-0037-02: Error Fixtures Rev2 Added (v1.7.15 rev2)

Given error-path test fixtures, when inspected, then missing pack, missing reviewer, missing discussion/trend/screenContract evidence, insufficient UI observation, per-spec coverage build failure are present.
