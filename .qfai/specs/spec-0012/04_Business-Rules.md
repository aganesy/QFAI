# 04 Business Rules

## BR-0012-0001: CLI Command Removed

- AC-Refs: AC-0012-0001

- The CLI command `qfai prototyping` has been REMOVED from the codebase.
- This spec covers the `/qfai-prototyping` SKILL only.

## BR-0012-0002: All-Spec Scope

- AC-Refs: AC-0012-0002

- Scope is fixed to ALL specs from `.qfai/specs/spec-*`; do not shrink to one spec.

## BR-0012-0003: Contracts Are Strict Inputs

- AC-Refs: AC-0012-0003

- Contracts are strict inputs in this stage. Do not create new files under `.qfai/contracts/**`.
- If any spec has zero resolved contracts, STOP and route back to `/qfai-discussion`.

## BR-0012-0004: Mode Precedence

- AC-Refs: AC-0012-0004

- Mode selection follows: user-specified > discussion recommendation > system default (standard).
- Full-harness is never auto-activated.

## BR-0012-0005: Fidelity DoD

- AC-Refs: AC-0012-0005

- L1 (skeleton): route-level rendering exists for declared primary screens.
- L2 (interactive, default): declared primary interactions wired with mockable behavior; mock path recorded.

## BR-0012-0006: Evidence Dual Artifacts

- AC-Refs: AC-0012-0006

- Both markdown and JSON evidence artifacts are mandatory under `.qfai/evidence/`.
- JSON must include `uiFidelity` for L2 reporting.

## BR-0012-0007: No ATDD/TDD in This Stage

- AC-Refs: AC-0012-0007

- Do not add ATDD or TDD automation in this stage.

## BR-0012-0008: No CLI Command References in Active Documents

- AC-Refs: AC-0012-0010

- No active document (spec, policy, README, SKILL.md, CHANGELOG) may reference `qfai prototyping` as a valid CLI command.
- Superseded content that mentions the CLI command must be clearly labelled as archived/superseded (e.g., `[SUPERSEDED v1.7.12]`).
- If a reference is found during review, it must be corrected before the spec is marked DONE.

## BR-0012-0009: Skill Contract Is SSOT

- AC-Refs: AC-0012-0011

- The prototyping skill contract (`SKILL.md`) is the single source of truth for the prototyping interface.
- No other document may define an alternative invocation path (CLI command, direct script, etc.) for prototyping.
- Responsibility boundary: the skill contract owns interface definition; policies own quality gates and NFRs.

## BR-0012-0010: Static-First Mode-Aware Contract

- AC-Refs: AC-0012-0012

- The skill contract must declare static-first (standard) as the default mode.
- All three modes (low-cost, standard, full-harness) must be documented in the contract with their obligations and triggers.
- Mode definitions must not be split across policies; the contract is self-contained for mode behavior.

## BR-0012-0011: Mode Resolution Precedence

- AC-Refs: AC-0012-0013

- Mode resolution follows strict precedence: explicit user request > discussion-pack recommendation > system default (standard)
- resolvePrototypingMode() implements this precedence chain
- If mode is outside allowed_modes, QFAI-PROT-236 warning is emitted but mode is still applied

## BR-0012-0012: Existence-Based Precedence (D-5)

- AC-Refs: AC-0012-0014, AC-0012-0023

- If the `prototyping` key exists at any level in prototyping.yaml (even as a scalar), the namespaced contract is authoritative
- hasNamespacedRecommendationBlock() checks key existence only, not value validity
- Non-object namespaced block is a hard error with no legacy fallback
- v1.7.14: Legacy top-level keys の存在自体が hard error（DR-0112）。QFAI-PROT-231/232 warning は廃止され、legacy keys は warning ではなく即座に reject される

## BR-0012-0013: Recommendation Artifact Resolution

- AC-Refs: AC-0012-0015

- resolveLatestRecommendationArtifact() returns { status, path, recommendation, warnings }
- status values: "valid" (parseable + required fields), "invalid" (exists but malformed), "missing" (pack exists but no file), "no-pack" (no discussion-pack)
- All consumers (report.ts, prototypingEvidence.ts) MUST use this resolver

## BR-0012-0014: Obligation Matrix Derivation

- AC-Refs: AC-0012-0016, AC-0012-0017

- derivePrototypingObligations(surface, mode) maps to boolean flags
- Non-UI surfaces skip: requireUiFidelity=false, requireRenderBundle=false, requireBrowserQaBundle=false
- Full-harness mode adds: requireFullHarness=true
- Low-cost mode reduces: requireRuntimeGate=false (static only)

## BR-0012-0015: Calibration Config Normalization

- AC-Refs: AC-0012-0018

- normalizePrototypingCalibration() provides defaults for all fields
- readRatio() for accept/refine (0.0-1.0), readPositiveInt() for maxIterations, readNonNegativeNumber() for plateauDelta/plateauLookback
- Invalid values are replaced with defaults (not errors)

## BR-0012-0016: fullHarness Schema Contract

- AC-Refs: AC-0012-0019

- fullHarness セクションは以下のスキーマに準拠する:
  - enabled: boolean（mode が full-harness か）
  - available: boolean（full-harness infrastructure が利用可能か）
  - runId: string | null（一意の実行識別子）
  - iterationCount: number（実行された反復回数、v1.7.14: MIN_ITERATIONS=5 制約）
  - bestIteration: number | null（最高スコアの反復）
  - terminationReason: "converged" | "max-iterations" | "plateau" | "manual-stop" | null（v1.7.14 で "plateau"/"manual-stop" を追加。旧 "accepted" / "cap-reached" は使用禁止）
  - reviewerSignoff: { status: "approved" | "rejected", reviewer: string, timestamp: string }（v1.7.14: boolean から object に拡張）
  - scoringTrace: Array<{ iteration: number, weightedTotal: number, decision: string, evaluators?: string[], axisDelta?: Record<string, number>, maxDeltaCap?: number }>（v1.7.14: boolean から配列に拡張。各イテレーションの評価記録を保持）

## BR-0012-0017: Calibration Config Schema Fields

- AC-Refs: AC-0012-0018

- prototyping.calibration config の完全フィールドスキーマ:
  - packPath: string（デフォルト: ".qfai/evidence/calibration.yaml"）
  - thresholds.accept: number 0.0-1.0（デフォルト: 0.8）— accept 判定の閾値
  - thresholds.refine: number 0.0-1.0（デフォルト: 0.5）— refine 判定の閾値
  - maxIterations: positive integer（デフォルト: 15）— full-harness loop の最大反復回数
  - plateauDelta: non-negative number（デフォルト: 0.02）— plateau 検出の差分閾値
  - plateauLookback: non-negative number（デフォルト: 3）— plateau 検出の lookback 反復数
- 不正値は silent にデフォルト値で置換（エラーではない）
- readRatio() は 0.0-1.0 範囲チェック、readPositiveInt() は正整数チェック

## BR-0012-0018: Mode Provenance Tracking

- AC-Refs: AC-0012-0013

- mode resolution の結果は以下のフィールドで追跡される:
  - requested: ユーザー指定 mode（null if unspecified）
  - effective: 最終適用 mode
  - source: "explicit-request" | "discussion-recommendation" | "system-default"
  - rationale: discussion-pack の推奨理由テキスト
  - discussionRecommendation: discussion-pack からの完全な推奨オブジェクト
  - sourceSchema: "namespaced" | null（v1.7.14: "top-level" は廃止。namespaced-only schema のため常に "namespaced" または null）
- この追跡情報は report.ts と evidence 双方で利用される

## BR-0012-0019: Surface Inference from Evidence

- AC-Refs: AC-0012-0016, AC-0012-0017, AC-0012-0026

- inferSurfaceFromRecommendationAndEvidence() は以下の優先順位で surface を推定する:
  1. prototyping.yaml の surface フィールド（明示的）
  2. Evidence signals（uiRoutes > 0 → web 推定、等）
  3. v1.7.14: デフォルト: null（旧 "non-ui" デフォルトを廃止。明示的 surface 指定を促進）
- 推定結果は obligation matrix の入力として使用される

## BR-0012-0020: Canonical Prototyping Surfaces (v1.7.14)

- AC-Refs: AC-0012-0020

- PrototypingSurface は web/mobile/desktop/cli/mixed の 5 値のみ。旧 -ui suffix（web-ui 等）は不正値として reject
- "non-ui" は PrototypingSurface 外。execution.ts が non-ui を受け取った場合は prototyping 対象外として reject
- assertCanonicalPrototypingSurface() で型安全に検証

## BR-0012-0021: Execution Hard Gates (v1.7.14)

- AC-Refs: AC-0012-0021, AC-0012-0022

- execution.ts は以下の条件で即座に hard error を投げる:
  1. recommendation.status === "invalid" → "Invalid recommendation artifact"
  2. classification === null → "Classification block is required"
  3. !classification.ui_bearing || primary_surface === "non-ui" → "Non-UI classification is not a prototyping execution target"
- readValidatedClassification()（strict API）のみを使用し、readClassificationBlock()（non-strict）は禁止

## BR-0012-0022: Semantic Invariant Enforcement (v1.7.14)

- AC-Refs: AC-0012-0024

- validateRecommendationSemantics() が recommended_mode ∈ allowed_modes の不変条件を検証
- この helper は recommendationSemantics.ts に定義され、以下の全レイヤーから参照される:
  - extractRecommendation()（parser）: semantic mismatch → recommendation: null + warning
  - resolveLatestRecommendationArtifact()（resolver）: semantic-invalid → status: invalid
  - runPrototypingExecution()（execution）: invalid artifact → hard error
  - CLI: error propagation（permissive 変換なし）
  - prototypingRecommendation validator: semantic error issue
  - sddPreflight: preflight blocker
- 各レイヤーが独自に semantic check を実装することは禁止（SSOT 違反）

## BR-0012-0023: Classification Separation for Obligations (v1.7.14)

- AC-Refs: AC-0012-0025

- derivePrototypingObligations() は needsVisualBrowserEvidence フラグで evidence 義務を判定
- requiresVisualBrowserEvidenceSurface()（web/mobile/desktop/mixed）が true の場合のみ、requireRenderBundle と requireBrowserQaBundle を有効化
- isDiscussionUiBearingPrototypingSurface()（web/mobile/desktop/cli/mixed）は discussion pack の構造要件にのみ使用し、evidence 義務の判定には使用しない
- cli surface: discussion UI-bearing = true, visual/browser evidence = false

## BR-0012-0024: Full-Harness Iteration Protocol (v1.7.14)

- AC-Refs: AC-0012-0027

- full-harness mode は反復改善ループであり、単一パス evidence 生成ではない
- 各イテレーションは 4 ステップで構成: Evaluate → Identify → Fix → Re-evaluate
- calibration パラメータは `qfai.config.yaml > prototyping.calibration` から読み取る
- 終了条件:
  - converged: weightedTotal >= thresholds.accept AND iterationCount >= MIN_ITERATIONS(5)
  - max-iterations: iterationCount >= maxIterations(default 15)
  - plateau: score delta < plateauDelta(0.02) for plateauLookback(3) consecutive iterations
  - manual-stop: ユーザーの明示的な終了指示
- converged with iterationCount==1 は矛盾であり、QFAI-PROT-290 warning を発行

## BR-0012-0025: Independent Evaluator Panel (v1.7.14)

- AC-Refs: AC-0012-0028

- 自己評価バイアス防止のため、evaluator は generator から独立していなければならない
- 3 層構成:
  - L1（product-surface-reviewer）: UI/UX/ビジュアル一貫性のスコアリング。入力はスクリーンショット + 評価軸定義のみ
  - L2（product-experience-architect）: ユーザージャーニー/IA/画面遷移の一貫性。入力は L1 と同等 + screen contracts + selected anchor
  - L3（qa-gatekeeper）: iterationCount/scoringTrace/terminationReason の整合性検証。fullHarness evidence block のみ
- L1/L2 は `task` tool の `background` mode で起動し、改善履歴・前回スコア・generator 計画を渡さない
- イテレーションの weightedTotal は L1 と L2 の最小値。いずれかが thresholds.refine 未満なら decision=pivot
- product-experience-architect は `kind: worker` のため review-profiles.yml には登録せず、agent-routing.yml の evidence phase conditional_agents に配置

## BR-0012-0026: Score Scope Separation (v1.7.14)

- AC-Refs: AC-0012-0029

- discussion 3-layer scores は design direction quality（option 比較・選定）を測定する
- prototyping scoringTrace は implementation fidelity（selected anchor に対する実装品質）を測定する
- これらは異なる評価対象であり、discussion scores を scoringTrace にコピーすることは禁止
- SKILL.md と aggregate テンプレートに score scope limitation を明記

## BR-0012-0027: Evaluation Rigor Rules (v1.7.14)

- AC-Refs: AC-0012-0030

- 各評価軸は 3-tier rubric を使用:
  - existence_gate（0.0-0.3）: 要素が存在するか
  - quality_criteria（0.3-0.7）: 基準品質を満たすか
  - excellence_criteria（0.7-1.0）: 期待を超えるか
- existence_gate を失敗した軸は 0.3 を超えるスコアを付けてはならない
- Finding 分類: L1（構造的欠陥、agent-fixable、即修正）、L2（品質不足、条件付き修正）、L1-manual（人間判断必要）
- Lighthouse automated gate（SHOULD）: web surface + dev server 利用可能時、Performance/Accessibility/Best Practices/SEO で <70 は L1

## BR-0012-0028: Asset Acquisition Strategy (v1.7.14)

- AC-Refs: AC-0012-0031

- full-harness mode では professional-quality visual assets が必須
- free asset sources（Unsplash, Pexels, Google Fonts, Heroicons 等）の使用を MUST とし、ソース URL とライセンスを evidence に記録
- emoji 文字（U+1F000–U+1FAFF, U+2600–U+27BF）を UI の装飾要素として使用することを禁止。機能目的の Unicode シンボル（✓ 等）は許可
- placeholder コンテンツ（"Lorem ipsum", placeholder.com images, gray boxes）は full-harness 最終出力に不可
- accessibility checklist（WCAG 2.1 AA）: color contrast ≥4.5:1（通常テキスト）, keyboard navigable, alt attributes, form labels, focus indicators
- trust signal checklist（SHOULD）: typography hierarchy, spacing rhythm, professional color palette, loading/error states, no broken images

## BR-0012-0029: Reviewer Gate Strengthening (v1.7.14)

- AC-Refs: AC-0012-0032

- full-harness evidence に対する reviewer は以下 6 項目を検証 MUST:
  1. iterationCount > 1（または single-iteration convergence の明示的正当化）
  2. scoringTrace のエントリ数が iterationCount と一致
  3. scoringTrace がスコア改善を示す（全同一スコアではない）
  4. terminationReason がスコア軌跡と整合
  5. 独立評価者が実際に起動された（fabricated names ではない）
  6. limitations セクションが存在し、既知の品質不足を正直に文書化
- Limitations section: full-harness MUST。未解決の品質不足、accept 未達の軸、agent 判断不足の領域、技術制約を文書化

## BR-0012-0030: Full-Harness Validator Rules QFAI-PROT-290~294 (v1.7.14)

- AC-Refs: AC-0012-0033

- prototypingEvidence.ts に 5 つの新規 validator rule を追加:
  - QFAI-PROT-290（warning）: iterationCount==1 + terminationReason=="converged" → single-iteration convergence は通常ありえない
  - QFAI-PROT-291（warning）: scoringTrace.length ≠ iterationCount → trace count 不整合
  - QFAI-PROT-292（warning）: terminationReason=="max-iterations" but iterationCount < config.maxIterations → 終了条件矛盾
  - QFAI-PROT-293（warning）: iterationCount > config.maxIterations → 上限超過
  - QFAI-PROT-294（info）: scoringTrace が non-increasing → 改善が見られない
- validator taxonomy 範囲: fullHarness reserved range 281-294（旧 281-283 から拡張）
- TAXONOMY_RANGE_MAX: 294（旧 283 から更新）
- scoringTrace の `scores[i-1]` アクセスは nullish coalescing で安全化

## BR-0012-0031: Maximum Delta Cap (v1.7.14)

- AC-Refs: AC-0012-0027

- 各評価軸のイテレーションあたりスコア改善上限: maxDeltaPerAxisPerIteration = 0.15
- この上限を超える delta は再評価または正当化を必須とする
- single-iteration score inflation を防止する仕組み

## BR-0012-0041: L1 Panel Scoring from Real Evidence (v1.7.15)

- AC-Refs: AC-0012-0026-01
- REQ-Refs: REQ-0041

- scoreL1(inputs) は runtime gate / render coverage / browser QA blocking findings / screen contract coverage / spec coverage を必須入力とする
- l1: { total: 0, axes: [] } の固定値生成を禁止する
- 入力のいずれかが欠落している場合は MeasurementError を投げる

## BR-0012-0042: L2 Panel Scoring from Real Evidence (v1.7.15)

- AC-Refs: AC-0012-0026-01
- REQ-Refs: REQ-0042

- scoreL2(inputs) は discussion 3-layer axes / screen contract fidelity / trend translation consistency / visual findings / browser QA experience findings を必須入力とする
- 全入力が実 evidence から供給されること

## BR-0012-0043: weightedTotal Always Minimum (v1.7.15)

- AC-Refs: AC-0012-0026-03
- REQ-Refs: REQ-0043

- computeWeightedTotal(l1, l2) は常に Math.min(l1.total, l2.total) を返す
- 平均、加重平均、または pre-scored 値の流用を禁止する

## BR-0012-0044: Converged Requires Two Iterations (v1.7.15)

- AC-Refs: AC-0012-0026-02
- REQ-Refs: REQ-0044

- converged は iterationCount >= 2 を必須とする
- 1 iteration 目で weightedTotal >= acceptThreshold であっても status は in-progress のまま
- converged には追加条件として plateauLookback >= 2 区間の score delta が plateauDelta 以下であることを要求

## BR-0012-0045: Plateau Requires Two Iterations (v1.7.15)

- AC-Refs: AC-0012-0026-02
- REQ-Refs: REQ-0045

- plateau は iterationCount >= 2 かつ plateau 条件成立だが accept threshold 未達の場合のみ設定
- single-iteration plateau は矛盾として reject

## BR-0012-0046: max-iterations Exact Match (v1.7.15)

- AC-Refs: AC-0012-0026-02
- REQ-Refs: REQ-0046

- terminationReason = max-iterations は iterationCount === calibration.maxIterations の場合のみ設定
- iterationCount < maxIterations で max-iterations を設定することは禁止

## BR-0012-0047: reviewerLogs Append-Only (v1.7.15)

- AC-Refs: AC-0012-0026-02
- REQ-Refs: REQ-0047

- reviewerLogs[] は iteration ごとに 1 エントリを append する
- 既存エントリの上書き・削除・単一要素置換を禁止
- reviewerLogs.length === iterationCount を常に満たす

## BR-0012-0048: Reviewer Placeholder Reject List (v1.7.15)

- AC-Refs: AC-0012-0027-01
- REQ-Refs: REQ-0048

- 以下の placeholder 値を reject する（frozen list）: "qfai", "default", "auto", "system", "unknown", "" (空文字)
- CLI 引数未指定時は CLI レベルで失敗させる
- runtime 内の resolvedReviewer ?? "qfai" 的フォールバックを禁止する

## BR-0012-0049: commitSha Mandatory in Full-Harness (v1.7.15)

- AC-Refs: AC-0012-0027-02
- REQ-Refs: REQ-0049

- full-harness 実行時に commit SHA 取得が必須
- 取得不能時は runtime error で失敗させる（空文字やプレースホルダーへのフォールバック禁止）

## BR-0012-0050: specCoverage from Real Diffs Only (v1.7.15)

- AC-Refs: AC-0012-0028-01
- REQ-Refs: REQ-0050

- specCoverage は loadDeclaredSpecArtifacts() と collectObservedRuntimeArtifacts() の実差分から生成
- uiRoutes, apiEndpoints, dbObjects の 3 系統を最低限扱う
- 全軸 {declared:0, observed:0, ratio:0} の zero-seeded 出力を禁止

## BR-0012-0051: uiFidelity Observation-Only (v1.7.15)

- AC-Refs: AC-0012-0028-02
- REQ-Refs: REQ-0051

- uiFidelity は DOM parse (jsdom) / browser QA / render evidence からのみ構成する
- mockPaths.status = "pass" の自動生成を禁止
- evidence 不足時は status = "insufficient-evidence" を返す

## BR-0012-0052: extractHtmlLabelsFromString Removal (v1.7.15)

- AC-Refs: AC-0012-0028-03
- REQ-Refs: REQ-0052

- extractHtmlLabelsFromString() の空実装を削除する
- label extraction は uiObservation.ts の extractDomLabelsWithJsdom() が担う

## BR-0012-0053: CalibrationLoader Wired in execution.ts (v1.7.15)

- AC-Refs: AC-0012-0027-03
- REQ-Refs: REQ-0053

- CalibrationLoader は execution.ts で loadConfig() 後に呼び出す（config.ts ではない）
- pack 不在・読取不可・schema 不整合時は runtime error で失敗させる

## BR-0012-0054: packVersion from Pack Metadata Only (v1.7.15)

- AC-Refs: AC-0012-0029-02
- REQ-Refs: REQ-0054

- packVersion は CalibrationLoader 経由で pack metadata から動的に取得する
- packVersion: "1.0.0" のハードコードを禁止する

## BR-0012-0055: Docs Reality Sync (v1.7.15)

- AC-Refs: AC-0012-0029-01
- REQ-Refs: REQ-0055

- SKILL.md / evidence README / discussion README の各制約主張は validator rule または runtime error condition に 1:1 対応する
- runtime 未実装の機能を docs で主張してはならない

## BR-0012-0056: Fail-Fast No Silent Fallback (v1.7.15)

- AC-Refs: AC-0012-0027-01, AC-0012-0027-02, AC-0012-0027-03, AC-0012-0027-04
- REQ-Refs: REQ-0056

- full-harness で必須 evidence (calibration / reviewer / commitSha / render / browserQa / uiObservation / specCoverage) のいずれかが欠落した場合は runtime error で即座に失敗させる
- デフォルト値での補完・silent fallback・graceful degradation を禁止する

## BR-0012-0057: Pre-Scored Path Prohibition (v1.7.15 rev2)

- AC-Refs: AC-0012-0030-01, AC-0012-0030-02, AC-0012-0030-03
- REQ-Refs: REQ-0057, REQ-0058

- runFullHarness() request 型に l1/l2 フィールドを含めない
- panelInputs が request に存在しない場合は即 throw
- scoring は validatePanelInputs → scorePanelsFromInputs → determineDecision の直列実行のみ

## BR-0012-0058: FullHarnessIteration Evidence-Driven Type (v1.7.15 rev2)

- AC-Refs: AC-0012-0030-03
- REQ-Refs: REQ-0059, REQ-0060, REQ-0061

- FullHarnessIteration の全必須フィールド: l1, l2, weightedTotal, commitSha, reviewerId, limitations, evidenceRefs
- MeasurementResult は panelInputs と 8 カテゴリ evidenceRefs を同時に返す
- evidenceRefs の 8 カテゴリ（runtimeGate/render/browserQa/uiObservation/specCoverage/discussion/screenContract/trend）は全て非空必須

## BR-0012-0059: validatePanelInputs 10-Check Gate (v1.7.15 rev2)

- AC-Refs: AC-0012-0030-02
- REQ-Refs: REQ-0062

- 以下の 10 条件で throw: renderEvidence.totalScreens===0 / renderEvidence.evidenceRefs.length===0 / browserQa.executed===false / browserQa.evidenceRefs.length===0 / specCoverage.evidenceRefs.length===0 / uiObservation.htmlCaptureRefs.length===0 / discussionAxes.evidenceRefs.length===0 / screenContract.evidenceRefs.length===0 / trendAlignment.evidenceRefs.length===0 / screenContract.totalContracts>0 && fidelityScore===0

## BR-0012-0060: l2Evidence Builder Contract (v1.7.15 rev2)

- AC-Refs: AC-0012-0031-01, AC-0012-0031-02, AC-0012-0031-03
- REQ-Refs: REQ-0063, REQ-0064, REQ-0065, REQ-0066

- buildDiscussionAxisInputs(root): 実 discussion artifact から invariant/trend-derived/product-specific 軸数を抽出。artifact 内評価値の再利用禁止。不足時 throw
- buildScreenContractInputs: fidelityScore の 0 初期化禁止。contract ありで coveredContracts=0 は evidence failure
- buildTrendAlignmentInputs: trendSourcesChecked===0 で必ず失敗
- execution.ts の L2 dummy object（aggregateScore:0/fidelityScore:0/translationConsistency:0 + evidenceRefs:[]）を全廃し builder 呼び出しに差し替え

## BR-0012-0061: panelScore Double Defense (v1.7.15 rev2)

- AC-Refs: AC-0012-0030-03
- REQ-Refs: REQ-0067

- discussionAxes.aggregateScore は 0〜1 の範囲必須
- trendSourcesChecked===0 は validator でも reject
- screenContract.totalContracts>0 && fidelityScore===0 は runtime fail（rationale 埋めで通さない）

## BR-0012-0062: CalibrationLoader Fail-Closed (v1.7.15 rev2)

- AC-Refs: AC-0012-0032-01, AC-0012-0032-02, AC-0012-0032-03
- REQ-Refs: REQ-0068, REQ-0069, REQ-0070

- pack 不在 → throw / YAML parse 不正 → throw / version 欠落 → throw / thresholds.accept|refine 欠落 → throw / maxIterations|plateauDelta|plateauLookback 欠落 → throw
- DEFAULT_PACK fallback 削除 / version="1.0.0" 補完削除
- config 側は packPath 解決用のみ。thresholds/maxIterations/plateauDelta/plateauLookback の config 補完を削除
- TerminationContext は { calibration: CalibrationPack; history: FullHarnessHistory } のみ受け入れ

## BR-0012-0063: Termination Guard (v1.7.15 rev2)

- AC-Refs: AC-0012-0033-01, AC-0012-0033-02
- REQ-Refs: REQ-0071, REQ-0072

- count < plateauLookback の場合: status="in-progress", terminationReason=undefined
- plateau/converged 判定は count >= plateauLookback の後でのみ
- validator: terminationReason=plateau|converged && iterationCount<plateauLookback は error

## BR-0012-0064: specCoverage Strict (v1.7.15 rev2)

- AC-Refs: AC-0012-0034-01, AC-0012-0034-02, AC-0012-0034-03
- REQ-Refs: REQ-0073, REQ-0074, REQ-0075

- specNames に存在する spec が perSpecMap に無い場合は error（0 初期化禁止）
- loadDeclaredSpecArtifacts の宣言抽出結果完全空 / evidenceRefs 作成不可 / DB 未実装通過を error 化
- declared DB objects > 0 で観測無し → full-harness failure

## BR-0012-0065: Screen-Level UiObservation (v1.7.15 rev2)

- AC-Refs: AC-0012-0035-01, AC-0012-0035-02, AC-0012-0035-03, AC-0012-0035-04, AC-0012-0035-05
- REQ-Refs: REQ-0076, REQ-0077, REQ-0078, REQ-0079, REQ-0080, REQ-0081

- UiObservationSummary は screens: ScreenObservation[] を返す（flatten 廃止）
- actionsWired: browser QA interaction phase 由来。0 固定廃止。観測不能は "unknown"
- mockPath.pass は明示的成功導線観測がある時のみ
- uiFidelityBuilder: screen 単位で html capture → DOM labels / actions / mockPaths を構築（cross-screen 共有禁止）
- uiFidelity insufficient-evidence: html capture 無/render evidence 無/browser QA 無/action 観測不可のいずれかで status="insufficient-evidence" or error
- mockPaths status="pass" 自動生成禁止 / expected→observed コピー禁止

## BR-0012-0066: ReviewerLog and History Integrity (v1.7.15 rev2)

- AC-Refs: AC-0012-0036-01, AC-0012-0036-02, AC-0012-0036-03
- REQ-Refs: REQ-0082, REQ-0083, REQ-0084

- reviewerLog.evidenceRefs は 8 カテゴリ全体を含む（render/browserQa のみ不可）
- reviewerLog.summary に decision / weightedTotal / limitations summary を含む
- iterations.length === iterationCount === scoringTrace.length === reviewerLogs.length（ズレで throw）
- bundleWriter は schema v2（8 カテゴリ evidenceRefs + FullHarnessIteration 新型）のみ出力

## BR-0012-0067: Tests Fixture Rev2 (v1.7.15 rev2)

- AC-Refs: AC-0012-0037-01, AC-0012-0037-02
- REQ-Refs: REQ-0085, REQ-0086

- 正常系 fixture から削除: l1/l2 直渡し / packVersion:"1.0.0" / single-iteration converged / actionsWired=0 / flattened DOM labels
- 異常系 fixture に追加: missing pack / missing reviewer / missing discussion|trend|screenContract evidence / insufficient ui observation / per-spec coverage build failure

## BR-0012-0068: UI-bearing Surface Classification (v1.7.15 rev4)

- AC-Refs: AC-0012-0038-05
- UI-bearing surface は `web`, `mobile`, `desktop`, `mixed` に限定される
- `cli` は非ビジュアルとして分類され、full-harness mode との組み合わせは無効

## BR-0012-0069: 4-Layer full-harness Reject Guard (v1.7.15 rev4)

- AC-Refs: AC-0012-0038-01, AC-0012-0038-02, AC-0012-0038-03, AC-0012-0038-04
- CLI / derivePrototypingObligations / runFullHarness / バリデータの 4 層すべてで cli + full-harness を拒否
- 1 層でもバイパスされた場合、次の層で拒否が発動する（多層防御）

## BR-0012-0070: Screen Contract Target Derivation (v1.7.15 rev4)

- AC-Refs: AC-0012-0039-02, AC-0012-0039-03
- Browser QA ターゲットは `40_screen_contracts.md` のスクリーン定義から動的に導出する
- `"/primary"` ハードコードの使用を禁止する

## BR-0012-0071: Screen Count Consistency (v1.7.15 rev4)

- AC-Refs: AC-0012-0039-05, AC-0012-0039-06
- 画面契約のスクリーン数とターゲット数は必ず一致する
- 各スクリーンに対して個別のエビデンスレコードを生成する

## BR-0012-0072: Browser QA Evidence Chain Non-Empty (v1.7.15 rev4)

- AC-Refs: AC-0012-0040-03, AC-0012-0040-04
- `iterations[].evidenceRefs.browserQa` は非空であることが必須
- 空の場合はハードフェイルとし、サイレントパスを禁止する

## BR-0012-0073: Evidence Refs Summary Inclusion (v1.7.15 rev4)

- AC-Refs: AC-0012-0040-01, AC-0012-0040-02
- フェーズ参照とファインディング参照はサマリーレベルに必ず含める

## BR-0012-0074: Canonical Path Comparison (v1.7.15 rev4)

- AC-Refs: AC-0012-0041-01, AC-0012-0041-02, AC-0012-0041-03
- ルート比較は canonical path で行い、URL をルートとして扱わない
- 末尾スラッシュの有無に関わらず一貫した結果を返す

## BR-0012-0075: Missing Observation Reporting (v1.7.15 rev4)

- AC-Refs: AC-0012-0041-04
- 画面契約に存在するがオブザベーションにないルートは `missing_observation` としてレポートする
- レポートには対象ルート名を具体的に列挙する

## BR-0012-0076: Structured Parse Priority (v1.7.15 rev4)

- AC-Refs: AC-0012-0042-01, AC-0012-0042-02, AC-0012-0042-03
- L2 エビデンス収集では構造化パースを優先する
- ヒューリスティックフォールバックは構造化ソースが不在の場合のみ許可

## BR-0012-0077: Stale Semantics Cleanup Rules (v1.7.15 rev4)

- AC-Refs: AC-0012-0043-01, AC-0012-0043-02, AC-0012-0043-03, AC-0012-0043-04
- 陳腐化 remediation は除去する
- `skip` → `reject` 変換、URL-as-route → canonical route 変換、`"/primary"` 除去を実施

## BR-0012-0078: Docs Reality Sync (v1.7.15 rev4)

- AC-Refs: AC-0012-0043-05, AC-0012-0043-06
- README / SKILL.md / evidence README は runtime / validator / tests の実体と一致させる

## BR-0012-0079: Parameterized Route Pattern Matching (v1.7.15 rev4)

- AC-Refs: AC-0012-0041-01
- パラメタライズドルート（e.g., `/orders/:id`）はパターンベースマッチングで Browser QA エビデンスチェーンと照合する
- OQ-0004 resolution: DR-0012-0027 / DR-0222

## BR-0012-0080: All-Mode Non-UI Surface Rejection (v1.7.15 rev5 WS-1)

- AC-Refs: AC-0012-0044-01, AC-0012-0044-02, AC-0012-0044-03
- derivePrototypingObligations() returns invalidCombination=true for non-UI surface regardless of mode (low-cost/standard/full-harness)
- reason code is unsupported_non_ui_prototyping_surface across all rejection layers
- UI-bearing allowlist: web, mobile-web, desktop-web, native-mobile (requiresVisualBrowserEvidence===true)
- execution.ts rejects non-UI surface immediately after classification; runtime.ts runFullHarness() throws on non-UI surface; CLI rejects at entry point; prototypingEvidence.ts validator hard-errors non-UI evidence

## BR-0012-0081: Observed-Only RuntimeGate Ledger (v1.7.15 rev5 WS-2)

- AC-Refs: AC-0012-0045-01, AC-0012-0045-02, AC-0012-0045-03, AC-0012-0045-04
- runtimeObservation.ts defines ObservedUiRoute (screenId, route, url, rendered, browserVisited, httpStatus?, renderEvidenceRefs[], browserQaEvidenceRefs[]) and RuntimeObservation (ui: ObservedUiRoute[])
- RuntimeObservation builder includes ONLY routes with successful observations; unobserved routes are excluded
- runtimeGate.api and runtimeGate.db fields are removed from type definitions
- synthetic status:200 generation is completely removed from runtimeGateBuilder.ts
- specCoverage calculation: set-compare declaredUiRoutes vs observed.ui[].route

## BR-0012-0082: Per-Screen Browser QA Mandatory (v1.7.15 rev5 WS-3)

- AC-Refs: AC-0012-0046-01, AC-0012-0046-02, AC-0012-0046-03, AC-0012-0046-04
- browserQaPerScreen.ts generates one Browser QA input per canonical screen contract
- capturedHtmlPath single-file representing all screens is prohibited
- generic phaseLevelRefs fallback from uiObservation.ts is removed
- Screen without its own refs: UIScreenObservation (in uiObservation.ts) sets observed=false / evidenceMissing=true
- NOTE: observed=false belongs to UIScreenObservation in uiObservation.ts; ObservedUiRoute in runtimeObservation.ts is observed-only (never contains unobserved entries)
- runtime.ts iterations[].evidenceRefs.browserQa stores runtime-collected refs only; request.panelInputs.browserQa.evidenceRefs fallback is removed
- browserQa executed with 0 refs → hard fail

## BR-0012-0083: actionsWired = Action Coverage Semantics (v1.7.15 rev5 WS-4)

- AC-Refs: AC-0012-0047-01, AC-0012-0047-02, AC-0012-0047-03, AC-0012-0047-04
- actionCoverage.ts computes: actionsDeclared, actionsObserved, actionsWired, missingActions[]
- actionsWired += 1 ONLY when: declared action exists AND DOM control observed AND resolved as interaction target AND no blocking error
- finding count MUST NOT contribute to actionsWired
- uiObservation.ts removes finding-count-to-action-count conversion
- uiFidelityBuilder.ts actionsWired derives from ActionCoverageResult only
- Validator: actionsWired > actionsDeclared → error; actionsDeclared>0 + DOM observed + actionsWired=0 → error
- Exception: actionsDeclared=0 screen → actionsWired=0 is normal (OQ-0003 resolved)

## BR-0012-0084: runFullHarness() Required Fields Contract (v1.7.15 rev5 WS-5)

- AC-Refs: AC-0012-0048-01, AC-0012-0048-02, AC-0012-0048-03, AC-0012-0048-04, AC-0012-0048-05, AC-0012-0048-06
- FullHarnessRequest.adapters.surface is required (not optional)
- FullHarnessRequest.adapters.render is required
- FullHarnessRequest.adapters.browserQa is required
- screenContracts is promoted to required field in FullHarnessRequest
- panelInputs.browserQa.evidenceRefs fallback is removed
- Adapter failures are propagated, not caught-and-continued
- browserQa.executed === true with 0 evidenceRefs → throw
- execution.ts passes surface/adapters/screenContracts/calibration pack ref explicitly to runFullHarness()

## BR-0012-0085: Calibration Pack as SSOT (v1.7.15 rev5 WS-6)

- AC-Refs: AC-0012-0049-01, AC-0012-0049-02, AC-0012-0049-03, AC-0012-0049-04, AC-0012-0049-05
- packResolver.ts provides shared calibration pack resolution for both runtime and validator
- Input: calibrationRef.packPath; Output: pack body + canonical thresholds
- prototypingEvidence.ts reads maxIterations/plateauDelta/plateauLookback from pack (not from config)
- Config calibration override (thresholds/maxIterations/plateauDelta/plateauLookback) is ignored; only packPath from config is used
- API/DB coverage declaration in prototyping artifact → hard error in validator
- structuredArtifactReaders.ts provides structured section parsers for 20-23 files, 04_Sources.md, 40_screen_contracts.md
- l2Evidence.ts keyword/bullet fallback downgraded to last-resort (only on complete parse failure)
- l2Evidence.ts: failure to parse 04_Sources.md structured section → fail
- docs/README/SKILL updated to remove non-UI prototyping language, API/DB coverage from prototyping contract, and reflect new contracts (OQ-0002 resolved: validator reject only, no schema change)
