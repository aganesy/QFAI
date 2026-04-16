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

## AC-0012-0038-01: derivePrototypingObligations Rejects cli + full-harness (v1.7.15 rev4)

- US-Ref: US-0012-0038
- REQ-Ref: REQ-0001
- `derivePrototypingObligations()` は surface が UI-bearing でない場合に `full-harness` mode を例外で拒否する

## AC-0012-0038-02: runFullHarness Pre-Execution Surface Check (v1.7.15 rev4)

- US-Ref: US-0012-0038
- REQ-Ref: REQ-0002
- `runFullHarness()` は実行開始前に surface が UI-bearing であることを検証し、非ビジュアルの場合ハードリジェクトする

## AC-0012-0038-03: CLI Rejects cli + full-harness (v1.7.15 rev4)

- US-Ref: US-0012-0038
- REQ-Ref: REQ-0003
- CLI (`cli/prototyping.ts`) は `surface: cli` + `mode: full-harness` の組み合わせを受け付けた場合、即座にエラー終了する

## AC-0012-0038-04: Validator Rejects cli + full-harness in prototyping.yaml (v1.7.15 rev4)

- US-Ref: US-0012-0038
- REQ-Ref: REQ-0004
- バリデータは `prototyping.yaml` において `surface: cli` + `allowed_modes: [full-harness]` の組み合わせを無効として拒否する

## AC-0012-0038-05: UI-bearing Surface Classification (v1.7.15 rev4)

- US-Ref: US-0012-0038
- REQ-Ref: REQ-0005
- UI-bearing surface は `web`, `mobile`, `desktop`, `mixed` を許可し、`cli` を非ビジュアルとして分類する

## AC-0012-0039-01: "/primary" Hardcode Removal (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0007
- `"/primary"` ハードコード参照をソースコードから完全に除去する

## AC-0012-0039-02: Browser QA Targets from Screen Contracts (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0006
- Browser QA ターゲット一覧は `40_screen_contracts.md` のスクリーン定義から導出する

## AC-0012-0039-03: screenContracts.ts Parser (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0008
- `screenContracts.ts` は `40_screen_contracts.md` をパースしスクリーン一覧を返却する関数を提供する

## AC-0012-0039-04: uiFidelityBuilder Per-Screen Targets (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0009
- `uiFidelityBuilder.ts` は画面契約から導出された各スクリーンに対して個別のフィデリティ測定ターゲットを生成する

## AC-0012-0039-05: Screen Count Match (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0010
- Browser QA 実行時、画面契約のスクリーン数と生成されたターゲット数が一致する

## AC-0012-0039-06: Per-Screen Evidence Records (v1.7.15 rev4)

- US-Ref: US-0012-0039
- REQ-Ref: REQ-0011
- 各スクリーンに対して個別のエビデンスレコードが生成される

## AC-0012-0040-01: Phase Refs in Summary (v1.7.15 rev4)

- US-Ref: US-0012-0040
- REQ-Ref: REQ-0012
- Browser QA 実行後、フェーズ参照 (`evidence_refs`) をサマリーレベルに含める

## AC-0012-0040-02: Findings Refs in Summary (v1.7.15 rev4)

- US-Ref: US-0012-0040
- REQ-Ref: REQ-0013
- Browser QA 実行後、ファインディング参照をサマリーレベルに含める

## AC-0012-0040-03: browserQa evidenceRefs Populated (v1.7.15 rev4)

- US-Ref: US-0012-0040
- REQ-Ref: REQ-0014
- `iterations[].evidenceRefs.browserQa` にフェーズ参照・ファインディング参照を格納する

## AC-0012-0040-04: Empty browserQa Hard Fail (v1.7.15 rev4)

- US-Ref: US-0012-0040
- REQ-Ref: REQ-0015
- `iterations[].evidenceRefs.browserQa` が空の場合、ハードフェイルとしてイテレーションを失敗させる

## AC-0012-0041-01: specCoverage Uses Canonical Path (v1.7.15 rev4)

- US-Ref: US-0012-0041
- REQ-Ref: REQ-0017
- `specCoverage.ts` はルート比較において canonical path（正規パス）を使用する

## AC-0012-0041-02: URL Not Treated as Route (v1.7.15 rev4)

- US-Ref: US-0012-0041
- REQ-Ref: REQ-0018
- URL（プロトコル、ホスト、クエリパラメータ、フラグメントを含む文字列）をルートとして扱わない

## AC-0012-0041-03: runtimeGateBuilder Canonical Normalization (v1.7.15 rev4)

- US-Ref: US-0012-0041
- REQ-Ref: REQ-0019
- `runtimeGateBuilder.ts` はルートを canonical path に正規化する処理を実装する

## AC-0012-0041-04: Missing Observation Report (v1.7.15 rev4)

- US-Ref: US-0012-0041
- REQ-Ref: REQ-0020
- 画面契約に存在するが対応するオブザベーションがないルートは `missing_observation` としてレポートする

## AC-0012-0042-01: Canonical Artifacts Required (v1.7.15 rev4)

- US-Ref: US-0012-0042
- REQ-Ref: REQ-0022
- L2 エビデンス収集は正規アーティファクト（20-23 系、`04_Sources.md`、`40_screen_contracts.md`）を必須とする

## AC-0012-0042-02: Structured Parse Priority (v1.7.15 rev4)

- US-Ref: US-0012-0042
- REQ-Ref: REQ-0023, REQ-0024, REQ-0025
- `l2Evidence.ts` は 20-23 系ファイルの構造化セクション、`04_Sources.md`、`40_screen_contracts.md` を優先的にパースする

## AC-0012-0042-03: No Heuristic When Structured Available (v1.7.15 rev4)

- US-Ref: US-0012-0042
- REQ-Ref: REQ-0026
- 構造化パースが利用可能な場合、ヒューリスティックフォールバックを実行しない

## AC-0012-0043-01: Stale Remediation Removed (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0028
- `prototypingEvidence.ts` から陳腐化した remediation セマンティクスを除去する

## AC-0012-0043-02: skip→reject Conversion (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0029
- テストファイルの `skip` フラグを `reject` に変換する

## AC-0012-0043-03: URL-as-route to Canonical Route (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0030
- テストファイルの URL-as-route 期待値を canonical route 期待値に変換する

## AC-0012-0043-04: "/primary" Removed from Tests (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0031
- テストファイルから `"/primary"` への参照を完全に除去する

## AC-0012-0043-05: README Updated (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0032
- `README.md` の陳腐化した記述を更新する

## AC-0012-0043-06: SKILL.md and evidence/README Updated (v1.7.15 rev4)

- US-Ref: US-0012-0043
- REQ-Ref: REQ-0033
- `SKILL.md` および `evidence/README.md` の陳腐化した記述を更新する


## AC-0012-0044-01: Non-UI Surface Rejects All Prototyping Modes (v1.7.15 rev5)

- US-Ref: US-0012-0044
- REQ-Ref: REQ-0001
- surface=cli/api/backend における low-cost・standard・full-harness の全 mode を mode.ts・execution.ts・runtime.ts・CLI・validator の全層で reject する

## AC-0012-0044-02: Non-UI Surface Rejection Reason Code Fixed (v1.7.15 rev5)

- US-Ref: US-0012-0044
- REQ-Ref: REQ-0002
- non-UI surface の reject 理由コードは `unsupported_non_ui_prototyping_surface` に固定される

## AC-0012-0044-03: Non-UI Surface Error Message Consistent Across Layers (v1.7.15 rev5)

- US-Ref: US-0012-0044
- REQ-Ref: REQ-0003
- エラーメッセージが mode.ts・execution.ts・runtime.ts・CLI・validator の全レイヤーで一致している

## AC-0012-0045-01: Unobserved Routes Not Added to Ledger (v1.7.15 rev5)

- US-Ref: US-0012-0045
- REQ-Ref: REQ-0008
- render/browserQA 観測なしで宣言された route は ledger に追加されない

## AC-0012-0045-02: runtimeGate Has No api/db Fields (v1.7.15 rev5)

- US-Ref: US-0012-0045
- REQ-Ref: REQ-0009
- runtimeGate.api および runtimeGate.db フィールドが型定義に存在しない

## AC-0012-0045-03: Synthetic Status 200 Generation Removed (v1.7.15 rev5)

- US-Ref: US-0012-0045
- REQ-Ref: REQ-0010
- synthetic status:200 の自動生成が完全に削除されている

## AC-0012-0045-04: specCoverage As Set Comparison (v1.7.15 rev5)

- US-Ref: US-0012-0045
- REQ-Ref: REQ-0011
- specCoverage は declaredUiRoutes と observed.ui[].route の集合比較として算出される

## AC-0012-0046-01: N Screens Require N Browser QA Executions (v1.7.15 rev5)

- US-Ref: US-0012-0046
- REQ-Ref: REQ-0016
- contract に N screen が存在する場合、N 個の Browser QA 実行が必須となる

## AC-0012-0046-02: Each Screen Has Non-Empty browserQaEvidenceRefs (v1.7.15 rev5)

- US-Ref: US-0012-0046
- REQ-Ref: REQ-0017
- 各 screen が ObservedUiRoute 内に空でない browserQaEvidenceRefs を持つ

## AC-0012-0046-03: Generic Phase-Level Ref Reuse Causes Hard Fail (v1.7.15 rev5)

- US-Ref: US-0012-0046
- REQ-Ref: REQ-0018
- generic phase-level の ref 再利用は validator で hard fail となる

## AC-0012-0046-04: Screen Without Unique Refs Marked evidenceMissing (v1.7.15 rev5)

- US-Ref: US-0012-0046
- REQ-Ref: REQ-0019
- 固有 refs を持たない screen は UIScreenObservation において observed=false / evidenceMissing=true となる

## AC-0012-0047-01: actionsWired Counting Rules (v1.7.15 rev5)

- US-Ref: US-0012-0047
- REQ-Ref: REQ-0026
- actionsWired は「declared action が存在し、DOM 上で control が観測され、interaction target として解決され、blocking error が無い」場合のみ加算される

## AC-0012-0047-02: Findings Do Not Increase actionsWired (v1.7.15 rev5)

- US-Ref: US-0012-0047
- REQ-Ref: REQ-0027
- findings を追加しても actionsWired は増加しない

## AC-0012-0047-03: actionsWired Exceeding actionsDeclared Is Validator Error (v1.7.15 rev5)

- US-Ref: US-0012-0047
- REQ-Ref: REQ-0028
- actionsWired > actionsDeclared の場合、validator error が発生する

## AC-0012-0047-04: Zero actionsWired With DOM Observations Is Validator Error (v1.7.15 rev5)

- US-Ref: US-0012-0047
- REQ-Ref: REQ-0029
- actionsDeclared>0 かつ DOM 観測ありかつ actionsWired=0 の場合、validator error が発生する（actionsDeclared=0 の screen は actionsWired=0 が正常）

## AC-0012-0048-01: Missing Surface Causes Immediate Throw (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0033
- request に surface が無い場合、runFullHarness() は即座に throw する

## AC-0012-0048-02: Missing Render Adapter Causes Throw (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0034
- render adapter が無い場合、runFullHarness() は throw する

## AC-0012-0048-03: Missing Browser QA Adapter Causes Throw (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0035
- browserQa adapter が無い場合、runFullHarness() は throw する

## AC-0012-0048-04: Empty screenContracts Causes Throw (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0036
- screenContracts が空/未定義の場合、runFullHarness() は throw する

## AC-0012-0048-05: browserQa Executed With Zero EvidenceRefs Causes Throw (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0037
- browserQa.executed=true かつ evidenceRefs=0 の場合、runFullHarness() は throw する

## AC-0012-0048-06: Adapter Error Propagated Not Swallowed (v1.7.15 rev5)

- US-Ref: US-0012-0048
- REQ-Ref: REQ-0038
- adapter error は飲み込まれず propagated される

## AC-0012-0049-01: packResolver Provides Shared Resolution Function (v1.7.15 rev5)

- US-Ref: US-0012-0049
- REQ-Ref: REQ-0041
- packResolver.ts が共有解決関数を提供している

## AC-0012-0049-02: prototypingEvidence Reads Thresholds from Pack (v1.7.15 rev5)

- US-Ref: US-0012-0049
- REQ-Ref: REQ-0042
- prototypingEvidence.ts が maxIterations/plateauDelta/plateauLookback を pack から読む

## AC-0012-0049-03: API/DB Coverage in Prototyping Artifact Is Hard Error (v1.7.15 rev5)

- US-Ref: US-0012-0049
- REQ-Ref: REQ-0043
- prototyping artifact に API/DB coverage が含まれている場合、hard error が発生する

## AC-0012-0049-04: l2Evidence Uses Structured Parser With Fallback Only On Failure (v1.7.15 rev5)

- US-Ref: US-0012-0049
- REQ-Ref: REQ-0044
- l2Evidence.ts が canonical artifacts の structured parser を使用し、parse が失敗した場合のみ fallback する

## AC-0012-0049-05: Docs Reflect New Contract (v1.7.15 rev5)

- US-Ref: US-0012-0049
- REQ-Ref: REQ-0045
- docs/README/SKILL が新しい contract を反映している


## AC-0012-0050-01: CLI Rejects --mode standard (v1.7.15 rev6)

- US-Ref: US-0012-0050
- REQ-Ref: REQ-0093
- `qfai prototyping --mode standard` exits non-zero with error message containing "full-harness mode only"

## AC-0012-0050-02: CLI Rejects --mode low-cost (v1.7.15 rev6)

- US-Ref: US-0012-0050
- REQ-Ref: REQ-0093
- `qfai prototyping --mode low-cost` exits non-zero with error message containing "full-harness mode only"

## AC-0012-0050-03: CLI Accepts --mode full-harness (v1.7.15 rev6)

- US-Ref: US-0012-0050
- REQ-Ref: REQ-0093
- `qfai prototyping --mode full-harness` with valid surface and calibration proceeds to execution

## AC-0012-0050-04: execution.ts Rejects non-full-harness Mode Independently (v1.7.15 rev6)

- US-Ref: US-0012-0050
- REQ-Ref: REQ-0093
- `execution.ts` rejects `mode !== "full-harness"` independently of CLI (defense in depth)

## AC-0012-0050-05: prototypingEvidence Validator Rejects non-full-harness Mode (v1.7.15 rev6)

- US-Ref: US-0012-0050
- REQ-Ref: REQ-0093
- `prototypingEvidence.ts` validator rejects `mode !== "full-harness"` in recorded output

## AC-0012-0051-01: CLI Rejects --surface cli (v1.7.15 rev6)

- US-Ref: US-0012-0051
- REQ-Ref: REQ-0094
- `qfai prototyping --surface cli` exits non-zero with error naming the rejected surface

## AC-0012-0051-02: CLI Rejects --surface api (v1.7.15 rev6)

- US-Ref: US-0012-0051
- REQ-Ref: REQ-0094
- `qfai prototyping --surface api` exits non-zero with error naming the rejected surface

## AC-0012-0051-03: CLI Rejects --surface backend (v1.7.15 rev6)

- US-Ref: US-0012-0051
- REQ-Ref: REQ-0094
- `qfai prototyping --surface backend` exits non-zero with error naming the rejected surface

## AC-0012-0051-04: execution.ts Calls assertSupportedPrototypingSurface() (v1.7.15 rev6)

- US-Ref: US-0012-0051
- REQ-Ref: REQ-0094
- `execution.ts` calls `assertSupportedPrototypingSurface()` from `surfacePolicy.ts`

## AC-0012-0051-05: prototypingEvidence Validator Rejects Non-Supported Surface (v1.7.15 rev6)

- US-Ref: US-0012-0051
- REQ-Ref: REQ-0094
- `prototypingEvidence.ts` validator rejects any surface not in `PROTOTYPING_SUPPORTED_SURFACES`

## AC-0012-0052-01: surfacePolicy.ts Exports Required Functions (v1.7.15 rev6)

- US-Ref: US-0012-0052
- REQ-Ref: REQ-0095
- `surfacePolicy.ts` exports `PROTOTYPING_SUPPORTED_SURFACES`, `isSupportedPrototypingSurface(surface)`, and `assertSupportedPrototypingSurface(surface)`

## AC-0012-0052-02: PROTOTYPING_SUPPORTED_SURFACES Is [web, mobile, desktop, mixed] (v1.7.15 rev6)

- US-Ref: US-0012-0052
- REQ-Ref: REQ-0095
- `PROTOTYPING_SUPPORTED_SURFACES` = `["web", "mobile", "desktop", "mixed"]` (no cli, api, backend)

## AC-0012-0053-01: runFullHarness Signature Has No Scalar Threshold Params (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- `runFullHarness()` signature does not include scalar threshold parameters (passingThreshold etc.)

## AC-0012-0053-02: runFullHarness Accepts calibrationRef.packPath (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- `runFullHarness()` accepts `calibrationRef: { packPath: string }` (or pre-resolved `calibrationPack` object)

## AC-0012-0053-03: CalibrationLoader Invoked Internally When packPath Provided (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- When `packPath` is provided, `CalibrationLoader` is invoked internally to resolve the pack

## AC-0012-0053-04: Missing packPath Throws Immediately (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- If `packPath` is missing or the file is not found, an `Error` is thrown immediately before any iteration

## AC-0012-0053-05: Resolved Pack Path Recorded in Runtime Summary (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- The resolved pack's path is recorded in the runtime summary's `calibrationRef.packPath`

## AC-0012-0053-06: Validator Checks calibrationRef.packPath (v1.7.15 rev6)

- US-Ref: US-0012-0053
- REQ-Ref: REQ-0096
- Validator checks that `calibrationRef.packPath` matches the pack used at runtime

## AC-0012-0054-01: runtimeGate.evidenceRefs Contains Render Summary Refs (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097
- `runtimeGate.evidenceRefs` contains render summary refs (e.g., `prototyping.json#/iterations/0/renderSummary`)

## AC-0012-0054-02: runtimeGate.evidenceRefs Contains Screenshot Refs (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097
- `runtimeGate.evidenceRefs` contains screenshot refs (e.g., `screenshots/iter-0-screen-login.png`)

## AC-0012-0054-03: runtimeGate.evidenceRefs Contains Browser QA Refs (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097
- `runtimeGate.evidenceRefs` contains Browser QA phase/finding refs

## AC-0012-0054-04: runtimeGate.evidenceRefs Has No Self-References (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097
- `runtimeGate.evidenceRefs` does NOT contain self-references (e.g., `prototyping.json#/runtimeGate`)

## AC-0012-0054-05: Validator Rejects Self-Reference evidenceRefs (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097, REQ-0098
- `prototypingEvidence.ts` validator rejects any evidenceRef that is a self-reference

## AC-0012-0054-06: Validator Rejects Synthetic Free-Text evidenceRefs (v1.7.15 rev6)

- US-Ref: US-0012-0054
- REQ-Ref: REQ-0097, REQ-0098
- `prototypingEvidence.ts` validator rejects any evidenceRef that is a synthetic free-text string

## AC-0012-0055-01: reviewerSignoff.status approved Only When Accepted (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0099
- `reviewerSignoff.status = "approved"` only when quality gate was met (`terminationReason = "accepted"`)

## AC-0012-0055-02: reviewerSignoff.status rejected When Explicitly Rejected (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0099
- `reviewerSignoff.status = "rejected"` only when explicitly rejected (`terminationReason = "rejected"`)

## AC-0012-0055-03: reviewerSignoff.status abandoned for Non-Accept Terminations (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0099
- `reviewerSignoff.status = "abandoned"` for `terminationReason = "plateau"`, `"maxIterations"`, or `"runtimeFailure"`

## AC-0012-0055-04: isCompleted Alone Does Not Produce approved Status (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0099
- `isCompleted: true` alone does NOT produce `status = "approved"`

## AC-0012-0055-05: uiFidelityBuilder Uses screenId for Matching (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0100
- `uiFidelityBuilder.ts` uses `obs.screenId === screen.screenId` for matching (not `screen.uiContractId`)

## AC-0012-0055-06: uiContractId in Observation Is Hard-Error (v1.7.15 rev6)

- US-Ref: US-0012-0055
- REQ-Ref: REQ-0100
- Validator hard-errors when observation record contains `uiContractId` field (backward compat abandoned)
## AC-0012-0056: CalibrationPack Resolved Before runFullHarness

Given execution.ts runs, when runPrototypingExecution is called, then CalibrationLoader is invoked before runFullHarness() and a resolved CalibrationPack object is passed.

## AC-0012-0057: FullHarnessRequest Includes calibrationPack Object

Given a valid pack path, when FullHarnessRequest is constructed, then it includes `calibrationPack: CalibrationPack` and `calibrationRef: { packPath, packVersion, configPath? }` with no scalar threshold parameters.

## AC-0012-0058: runtime.ts Has Zero CalibrationLoader Imports

Given runtime.ts, when its import statements are inspected, then zero imports of CalibrationLoader or any calibration resolution utility are found.

## AC-0012-0059: uiFidelity Status Failure Stops Execution

Given uiFidelity.status !== "completed", when execution.ts evaluates the guard, then UiFidelityEvidenceError is thrown before runFullHarness() is called.

## AC-0012-0060: missingRequiredEvidence Failure Stops Execution

Given uiFidelity.missingRequiredEvidence.length > 0, when execution.ts evaluates the guard, then UiFidelityEvidenceError is thrown naming the missing evidence type(s).

## AC-0012-0061: Missing Required Screen Stops Execution

Given a required screen absent from uiFidelity.screenSummaries, when execution.ts evaluates the guard, then UiFidelityEvidenceError is thrown naming the missing screen(s).

## AC-0012-0062: uiFidelity Guard Precedes runFullHarness

Given the uiFidelity guard in execution.ts, when evaluated, then it fires after buildUiFidelity() and before buildSpecCoverageSummary(), buildL2Evidence(), and runFullHarness().

## AC-0012-0063: specCoverage.evidenceRefs Accepts Concrete Refs Only

Given specCoverage.evidenceRefs entries, when validated, then only spec anchor refs, render summary refs, screenshot refs, and browser QA artifact refs are accepted.

## AC-0012-0064: Validator Rejects Non-Concrete evidenceRefs

Given a directory path, self-ref, synthetic token, or extension-less path in evidenceRefs, when prototypingEvidence.ts validates, then it emits a validator error for each forbidden pattern.

## AC-0012-0065: isConcreteArtifactRef Helper Exported

Given prototypingEvidence.ts, when its exports are inspected, then `isConcreteArtifactRef(ref: string): boolean` is exported and available.

## AC-0012-0066: Validator Resolves calibrationRef.packPath

Given a prototyping evidence bundle with calibrationRef, when prototypingEvidence.ts validates, then it resolves calibrationRef.packPath and reads the actual calibration pack.

## AC-0012-0067: packPath and packVersion Mismatch Is Error

Given calibrationRef.packVersion in summary does not match the actual pack's version, when prototypingEvidence.ts validates, then it emits a validator error (not a warning).

## AC-0012-0068: Hardcoded "1.0.0" Heuristic Removed

Given packVersion = "1.0.0" in the summary but actual version differs, when prototypingEvidence.ts validates, then a validator error is emitted (heuristic removed; no special-case for "1.0.0").

## AC-0012-0069: Six Distinct Error Classes Exported from prototyping/errors.ts

Given packages/qfai/src/core/prototyping/errors.ts, when its exports are inspected, then exactly these 6 classes are exported: CalibrationResolutionError, UiFidelityEvidenceError, SpecCoverageBuildError, L2EvidenceBuildError, FullHarnessRuntimeError, EvidenceWriteError.

## AC-0012-0070: No Catch Block Maps Non-Calibration Failures to CalibrationResolutionError

Given execution.ts catch blocks, when a non-calibration phase throws, then no catch block wraps the error in CalibrationResolutionError or a message containing "Failed to load calibration pack".

## AC-0012-0071: Scalar Calibration Fields Absent from PrototypingCalibrationConfig

Given PrototypingCalibrationConfig in config.ts, when its type definition is inspected, then thresholds.accept, thresholds.refine, maxIterations, plateauDelta, and plateauLookback are absent.

## AC-0012-0072: Obsolete Scalar Fields in Config Input Cause Error

Given a config input containing any of thresholds.accept, thresholds.refine, maxIterations, plateauDelta, or plateauLookback, when config normalization runs, then an error is thrown naming the obsolete field(s).

## AC-0012-0073: Shipped Config Template Uses packPath-Only

Given packages/qfai/assets/init/root/qfai.config.yaml, when inspected, then it contains only prototyping.calibration.packPath under the calibration section with zero scalar calibration fields.

## AC-0012-0074: surfacePolicy Rejection Message Generated from Constant

Given assertSupportedPrototypingSurface() in surfacePolicy.ts, when called with an unsupported surface, then the rejection message is generated from PROTOTYPING_SUPPORTED_SURFACES constant (not hardcoded).

## AC-0012-0075: Stale CLI Surface Removed from Rejection Message

Given the rejection message for an unsupported surface, when inspected, then it lists "web, mobile, desktop, mixed" and does not hardcode "cli" or any other stale surface name.

## AC-0012-0076: toRepoRelativeArtifactRef() Exists in pathUtils.ts with Correct Signature (v1.7.15 rev8 WS-1)

Given `packages/qfai/src/core/prototyping/pathUtils.ts`, when imported, then `toRepoRelativeArtifactRef({ repoRoot, absolutePath, line?, anchor? })` exists and returns a string that is a POSIX repo-relative path.

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0059

## AC-0012-0077: parseSpecDeclaration() and extractUiRouteDeclarations() Do Not Return Raw Absolute Paths (v1.7.15 rev8 WS-1)

Given `parseSpecDeclaration()` and `extractUiRouteDeclarations()` in `specCoverage.ts`, when called, then all `declaredRef` values in their output pass through `toRepoRelativeArtifactRef()` and are never raw absolute path strings.

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0060

## AC-0012-0078: buildSpecCoverageSummary() Rejects Directory Paths and Outputs Only Concrete Refs (v1.7.15 rev8 WS-1)

Given `buildSpecCoverageSummary()`, when called, then it does not accept a directory path as a ref source and all `evidenceRefs` in its output are concrete artifact refs (not directory paths, pack root paths, or bare filenames without extension).

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0061

## AC-0012-0079: buildPerSpecCoverage() Outputs Concrete Artifact Refs in coverageRefs[].declaredRef (v1.7.15 rev8 WS-1)

Given `buildPerSpecCoverage()`, when called, then `coverageRefs[].declaredRef` values are concrete artifact refs using the same grammar as summary `evidenceRefs`; no absolute paths appear in `declaredRef`.

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0062

## AC-0012-0080: toRepoRelativeArtifactRef() Throws for Outside-Root Path (v1.7.15 rev8 WS-1)

Given `toRepoRelativeArtifactRef({ repoRoot, absolutePath })`, when `absolutePath` is outside `repoRoot` (e.g., `/other-repo/file.md` when repoRoot is `/repo`), then the function throws.

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0059

## AC-0012-0081: toRepoRelativeArtifactRef() Throws for Directory Path (v1.7.15 rev8 WS-1)

Given `toRepoRelativeArtifactRef({ repoRoot, absolutePath })`, when `absolutePath` has no file extension (i.e., it is a directory path), then the function throws.

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0059

## AC-0012-0082: toRepoRelativeArtifactRef() Throws When Both line and anchor Are Specified (v1.7.15 rev8 WS-1)

Given `toRepoRelativeArtifactRef({ repoRoot, absolutePath, line, anchor })`, when both `line` and `anchor` are specified simultaneously, then the function throws (they are mutually exclusive).

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0059

## AC-0012-0083: toRepoRelativeArtifactRef() Output Uses POSIX Separator Regardless of Host OS (v1.7.15 rev8 WS-1)

Given `toRepoRelativeArtifactRef()` called on a Windows host with backslash-separated paths, when called, then the output uses POSIX `/` separator (no `\\` in any returned ref).

- US-Ref: US-0012-0063
- REQ-Ref: REQ-0059

## AC-0012-0084: PrototypingEvidence["runtimeGate"] Type Includes evidenceRefs: string[] (v1.7.15 rev8 WS-2)

Given the TypeScript type for `PrototypingEvidence["runtimeGate"]`, when inspected, then `evidenceRefs: string[]` is a formal required field in the type definition used by both parser and validator.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0063

## AC-0012-0085: parseEvidence() Reads runtimeGate.evidenceRefs; Non-Array Is Parse Error (v1.7.15 rev8 WS-2)

Given `parseEvidence()` in `prototypingEvidence.ts`, when called with evidence input containing `runtimeGate.evidenceRefs`, then the field is read; a non-array value for this field is a parse error; absence of the field is detectable for subsequent validation.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0064

## AC-0012-0086: validatePrototypingEvidence() Applies isConcreteArtifactRef() to runtimeGate.evidenceRefs Entries (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()`, when called with evidence containing `runtimeGate.evidenceRefs`, then `isConcreteArtifactRef()` checks are applied to each entry with the same or stricter strictness as `iterations[].evidenceRefs.runtimeGate`.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0065

## AC-0012-0087: Absence of runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` called with evidence where `runtimeGate.evidenceRefs` is absent, when validated, then at least one error is added to the issues list; the field is not silently skipped.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0066

## AC-0012-0088: Empty Array runtimeGate.evidenceRefs: [] Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` called with evidence where `runtimeGate.evidenceRefs` is an empty array, when validated, then at least one error is returned; an empty array is not a valid evidenceRefs value.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0067

## AC-0012-0089: Absolute Path in runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = ["/abs/path/file.json"]`, when validated, then a validator error is returned for the absolute path entry.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0068

## AC-0012-0090: Self-Ref in runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = [".qfai/evidence/prototyping.json#/runtimeGate"]` (self-ref), when validated, then a validator error is returned for the self-referential entry.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0068

## AC-0012-0091: Synthetic Token in runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = ["routes: all observed"]` (synthetic token), when validated, then a validator error is returned for the synthetic token entry.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0068

## AC-0012-0092: Directory Path (No Extension) in runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = [".qfai/evidence/iter-0/"]` (directory path, no extension), when validated, then a validator error is returned for the directory path entry.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0068

## AC-0012-0093: Empty String in runtimeGate.evidenceRefs Is a Validator Error (v1.7.15 rev8 WS-2)

Given `validatePrototypingEvidence()` with `runtimeGate.evidenceRefs = [""]` (empty string entry), when validated, then a validator error is returned for the empty string entry.

- US-Ref: US-0012-0064
- REQ-Ref: REQ-0068

## AC-0012-0094: toRepoRelativeArtifactRef, assertConcreteArtifactRef, isConcreteArtifactRef Are the Single Shared Helpers (v1.7.15 rev8 WS-3)

Given the `packages/qfai/src` source tree, when inspected, then `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, and `isConcreteArtifactRef` are the only implementations of ref grammar; validators and builders have no separate parallel implementations.

- US-Ref: US-0012-0065
- REQ-Ref: REQ-0069

## AC-0012-0095: All 5 Traceability Ref Sites Use the Same Grammar (v1.7.15 rev8 WS-3)

Given the 5 ref sites (`runtimeGate.evidenceRefs`, `iterations[].evidenceRefs.runtimeGate`, `iterations[].evidenceRefs.specCoverage`, `specCoverage.evidenceRefs`, `specs[].coverageRefs[].declaredRef`), when each is validated, then all use the same ref grammar enforced by shared helpers from `pathUtils.ts`.

- US-Ref: US-0012-0065
- REQ-Ref: REQ-0070

## AC-0012-0096: No Parallel Regex or Pattern Definition for Concrete Ref Outside pathUtils.ts (v1.7.15 rev8 WS-3)

Given a grep for independent regex or pattern definitions for concrete-ref grammar outside `pathUtils.ts` in `packages/qfai/src`, when run, then 0 matches are found.

- US-Ref: US-0012-0065
- REQ-Ref: REQ-0069

## AC-0012-0097: measurement.ts Checked; Updated to Shared Helpers if Using Absolute Paths (v1.7.15 rev8 WS-3)

Given `measurement.ts`, when inspected during rev8 implementation, then if it uses absolute paths in ref output it is updated to use shared helpers from `pathUtils.ts`; otherwise it is left unchanged (DR-0012-0047 conditional scope).

- US-Ref: US-0012-0065
- REQ-Ref: REQ-0069

## AC-0012-0098: execution.ts Calls assertConcreteArtifactRef() on Builder Outputs Before Bundle Write (v1.7.15 rev8 WS-3)

Given `execution.ts`, when it produces bundle output, then `assertConcreteArtifactRef()` is called on builder outputs (e.g., specCoverage evidenceRefs) before the bundle is written to disk.

- US-Ref: US-0012-0065
- REQ-Ref: REQ-0069

## AC-0012-0099: prototypingExecution.productionPath.test.ts File Exists (v1.7.15 rev8 WS-4)

Given the repository after rev8 implementation, when `packages/qfai/tests/core/` is listed, then `prototypingExecution.productionPath.test.ts` exists as a file.

- US-Ref: US-0012-0066
- REQ-Ref: REQ-0073

## AC-0012-0100: At Least One Positive Closure Test — runPrototypingExecution() Output Passes validatePrototypingEvidence() (v1.7.15 rev8 WS-4)

Given `prototypingExecution.productionPath.test.ts`, when the positive closure test is executed, then `runPrototypingExecution()` succeeds and its output passes `validatePrototypingEvidence()` with zero errors.

- US-Ref: US-0012-0066
- REQ-Ref: REQ-0073

## AC-0012-0101: At Least One Negative Injection Test — Absolute Path Causes Validator Error (v1.7.15 rev8 WS-4)

Given `prototypingExecution.productionPath.test.ts`, when the negative injection test is executed with a fixture containing an absolute path in `specCoverage.evidenceRefs` or `runtimeGate.evidenceRefs`, then `validatePrototypingEvidence()` returns at least one error.

- US-Ref: US-0012-0066
- REQ-Ref: REQ-0073

## AC-0012-0102: specCoverage.test.ts Includes Negative Cases for Ref Normalization (v1.7.15 rev8 WS-4)

Given `specCoverage.test.ts`, when run, then it includes: (a) absolute path input → repo-relative output; (b) outside-root path → throw; (c) directory path → throw; (d) `coverageRefs[].declaredRef` format verified as concrete artifact ref.

- US-Ref: US-0012-0066
- REQ-Ref: REQ-0071

## AC-0012-0103: prototypingEvidence.test.ts Includes runtimeGate.evidenceRefs Negative Cases (v1.7.15 rev8 WS-4)

Given `prototypingEvidence.test.ts`, when run, then it includes test cases for: `runtimeGate.evidenceRefs` with absolute path → error; self-ref → error; synthetic token → error; field absent → error; empty array → error.

- US-Ref: US-0012-0066
- REQ-Ref: REQ-0072

## AC-0012-0104: runtimeGate.ui[].declaredRef Required (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given any `runtimeGate.ui[]` row without `declaredRef`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0105: runtimeGate.ui[].declaredRef Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given `runtimeGate.ui[].declaredRef` with an absolute path, self-ref, synthetic token, bare filename, directory path, or Windows separator, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0106: runtimeGate.ui[].renderEvidenceRefs[] Must Be Non-Empty (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given `runtimeGate.ui[].renderEvidenceRefs[]` absent or empty, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0107: Each runtimeGate.ui[].renderEvidenceRefs[i] Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given any malformed entry in `renderEvidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0108: runtimeGate.ui[].browserQaEvidenceRefs[] Must Be Non-Empty (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given `runtimeGate.ui[].browserQaEvidenceRefs[]` absent or empty, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0109: Each runtimeGate.ui[].browserQaEvidenceRefs[i] Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067
- Given any malformed entry in `browserQaEvidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0110: Leaf Validation Reuses isConcreteArtifactRef() from pathUtils.ts (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0067, US-0012-0068, US-0012-0069
- Given the source code of prototypingEvidence.ts after WS-1, when scanned for concrete-ref validation logic, then no parallel grammar implementation exists outside pathUtils.ts.

## AC-0012-0111: l1.axes[].evidenceRefs[] Must Be Non-Empty Per-Axis (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given any `l1.axes[]` axis with empty or absent `evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced for that axis.

## AC-0012-0112: Each l1.axes[].evidenceRefs[i] Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given any malformed entry (synthetic token, absolute path, self-ref, empty string) in `l1.axes[].evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0113: l2.axes[].evidenceRefs[] Must Be Non-Empty Per-Axis (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given any `l2.axes[]` axis with empty or absent `evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced for that axis.

## AC-0012-0114: Each l2.axes[].evidenceRefs[i] Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given any malformed entry in `l2.axes[].evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0115: Self-Ref Forbidden in Any Axis evidenceRefs[] (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given a self-reference (pointing to prototyping.json) in any axis `evidenceRefs[]` entry, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0116: Per-Axis Validation — Not Aggregate (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0068
- Given one axis with valid refs and a later axis with a synthetic token, when validatePrototypingEvidence() is called, then a validator error is produced for the later axis regardless of the valid axis.

## AC-0012-0117: reviewerLogs[].evidenceRefs[] Must Be Non-Empty Per-Entry (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0069
- Given any `reviewerLogs[]` entry with empty or absent `evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0118: Each reviewerLogs[].evidenceRefs[i] Must Be Concrete Artifact Ref (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0069
- Given any malformed entry in `reviewerLogs[].evidenceRefs[]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0119: Synthetic Token "reviewer:1" in reviewerLogs[].evidenceRefs[] Is a Validator Error (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0069
- Given `reviewerLogs[0].evidenceRefs = ["reviewer:1"]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0120: Absolute Path in reviewerLogs[].evidenceRefs[] Is a Validator Error (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0069
- Given `reviewerLogs[0].evidenceRefs = ["/abs/path/reviewer.md"]`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0121: Self-Ref in reviewerLogs[].evidenceRefs[] Is a Validator Error (v1.7.15 rev9 WS-1)

- US-Ref: US-0012-0069
- Given a self-reference in `reviewerLogs[0].evidenceRefs`, when validatePrototypingEvidence() is called, then a validator error is produced.

## AC-0012-0122: bundleWriter.ts Schema Marks runtimeGate.ui[].declaredRef as Required (v1.7.15 rev9 WS-2)

- US-Ref: US-0012-0070
- Given the bundleWriter.ts TypeScript type definition, when inspected, then `declaredRef` is not optional (no `?` suffix).

## AC-0012-0123: bundleWriter.ts Schema Marks All Leaf Array Fields as Required Non-Nullable (v1.7.15 rev9 WS-2)

- US-Ref: US-0012-0070
- Given the bundleWriter.ts TypeScript type definitions, when inspected, then `renderEvidenceRefs[]`, `browserQaEvidenceRefs[]`, `l1/l2.axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]` are required non-nullable arrays.

## AC-0012-0124: Runtime Builders Cannot Emit Null or Omitted Leaf Fields (v1.7.15 rev9 WS-2)

- US-Ref: US-0012-0070
- Given runtimeObservation.ts and runtimeGateBuilder.ts after WS-2, when invoked, then null, undefined, or omitted leaf fields are not emitted; a runtime error is thrown instead.

## AC-0012-0125: Runtime Error on Unpopulatable Leaf Array — Not Silent Pass-Through (v1.7.15 rev9 WS-2)

- US-Ref: US-0012-0070
- Given a runtime builder that cannot populate a required leaf array, when it runs, then a runtime error is thrown before the bundle is written.

## AC-0012-0126: No Optional Mismatch Between Bundle Schema and Validator Contract (v1.7.15 rev9 WS-2)

- US-Ref: US-0012-0070
- Given the bundle schema and validator together, when analyzed for field-level agreement, then every field the validator requires as non-empty is typed as required in the bundle schema.

## AC-0012-0127: prototypingEvidence.test.ts Includes All 7 ui[] Negative Cases (v1.7.15 rev9 WS-3)

- US-Ref: US-0012-0071
- Given the prototypingEvidence.test.ts file after WS-3, when run, then all 7 negative cases for runtimeGate.ui[] (declaredRef absent, absolute, self-ref, synthetic token, bare filename, directory path, Windows separator) exist and pass.

## AC-0012-0128: prototypingEvidence.test.ts Includes All 5 Axis-Level Negative Cases (v1.7.15 rev9 WS-3)

- US-Ref: US-0012-0071
- Given the prototypingEvidence.test.ts file after WS-3, when run, then all 5 axis-level evidenceRefs[] negative cases (l1 synthetic, l2 synthetic, absolute, self-ref, empty) exist and pass.

## AC-0012-0129: prototypingEvidence.test.ts Includes All 3 Reviewer-Level Negative Cases (v1.7.15 rev9 WS-3)

- US-Ref: US-0012-0071
- Given the prototypingEvidence.test.ts file after WS-3, when run, then all 3 reviewer-level evidenceRefs[] negative cases (synthetic token, absolute path, empty array) exist and pass.

## AC-0012-0130: tests/core/ Fixtures Replace All Synthetic Token evidenceRefs (v1.7.15 rev9 WS-3)

- US-Ref: US-0012-0071
- Given all test fixture files in packages/qfai/tests/core/ after WS-3, when scanned for synthetic tokens ("a", "b", "reviewer:1") in evidenceRefs contexts, then 0 occurrences are found.

## AC-0012-0131: prototypingExecution.productionPath.test.ts Closure Test Asserts Leaf Refs Are Concrete (v1.7.15 rev9 WS-3)

- US-Ref: US-0012-0071
- Given prototypingExecution.productionPath.test.ts after WS-3, when run, then the closure test asserts that leaf refs in the execution output (ui[].declaredRef, ui[].renderEvidenceRefs[], ui[].browserQaEvidenceRefs[], reviewerLogs[].evidenceRefs[], axes[].evidenceRefs[]) are concrete, and at least one negative injection test for a leaf field is present.

## AC-0012-0132: README.md Enumerates All Concrete-Ref Leaf Fields (v1.7.15 rev9 WS-4)

- US-Ref: US-0012-0071
- Given packages/qfai/README.md after WS-4, when read, then all fields under the concrete artifact ref contract are listed including rev9 leaf fields, and the description does not imply that only top-level fields are validated.