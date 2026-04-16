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


## BR-0012-0086: Full-Harness Only Enforcement (v1.7.15 rev6 WS-1)

- AC-Refs: AC-0012-0050-01, AC-0012-0050-02, AC-0012-0050-03, AC-0012-0050-04, AC-0012-0050-05
- Only `full-harness` mode is supported in packages/qfai v1.7.15; `standard` and `low-cost` are rejected at all layers
- CLI layer (`cli/commands/prototyping.ts`): reject `--mode standard` and `--mode low-cost` before any processing; error message MUST contain "full-harness mode only"
- execution.ts layer: reject `mode !== "full-harness"` as defense-in-depth after CLI; do not rely on CLI rejection
- prototypingEvidence.ts validator layer: reject recorded output containing `mode !== "full-harness"`
- Mode check MUST fire before calibration loading and before any iteration begins
- Case-sensitive: "FULL-HARNESS" and "" (empty) are also rejected

## BR-0012-0087: Surface Rejection at All Layers (v1.7.15 rev6 WS-1)

- AC-Refs: AC-0012-0051-01, AC-0012-0051-02, AC-0012-0051-03, AC-0012-0051-04, AC-0012-0051-05
- Non-UI surfaces (`cli`, `api`, `backend`, and any surface not in PROTOTYPING_SUPPORTED_SURFACES) are rejected at all layers
- CLI layer: reject `--surface cli`, `--surface api`, `--surface backend` before any processing; error MUST name the rejected surface
- execution.ts layer: calls `assertSupportedPrototypingSurface()` from `surfacePolicy.ts` as defense-in-depth
- prototypingEvidence.ts validator layer: rejects any surface not in `PROTOTYPING_SUPPORTED_SURFACES`
- Surface rejection fires before file I/O and before calibration load attempt
- Unknown surfaces (not in PROTOTYPING_SUPPORTED_SURFACES) are also rejected

## BR-0012-0088: surfacePolicy.ts as SSOT Standalone Module (v1.7.15 rev6 WS-2)

- AC-Refs: AC-0012-0052-01, AC-0012-0052-02
- `packages/qfai/src/core/prototyping/surfacePolicy.ts` is the single source of truth for surface allowlist
- Must export: `PROTOTYPING_SUPPORTED_SURFACES: readonly string[]`, `isSupportedPrototypingSurface(surface: string): boolean`, `assertSupportedPrototypingSurface(surface: string): void`
- `PROTOTYPING_SUPPORTED_SURFACES` value MUST be `["web", "mobile", "desktop", "mixed"]` exactly
- `mixed` is included as a legitimate cross-platform UI surface (OQ-0001 resolution)
- `cli`, `api`, `backend` are explicitly excluded
- No other module may define surface allowlist as SSOT; mode.ts must not duplicate these constants
- `assertSupportedPrototypingSurface()` throws immediately when surface is not in PROTOTYPING_SUPPORTED_SURFACES
- `isSupportedPrototypingSurface()` is a pure function (deterministic, no side effects)

## BR-0012-0089: runFullHarness CalibrationLoader Internal Resolution (v1.7.15 rev6 WS-3)

- AC-Refs: AC-0012-0053-01, AC-0012-0053-02, AC-0012-0053-03, AC-0012-0053-04, AC-0012-0053-05, AC-0012-0053-06
- `runFullHarness()` signature MUST NOT include scalar threshold parameters (e.g., passingThreshold, maxIterations as direct args)
- `runFullHarness()` accepts `calibrationRef: { packPath: string }` OR a pre-resolved `calibrationPack` object
- When `packPath` is provided, `CalibrationLoader` is invoked INTERNALLY to resolve the pack
- If `packPath` is missing or the file is not found, an `Error` is thrown IMMEDIATELY before any iteration begins; error message includes packPath
- If `packPath` points to malformed YAML, an `Error` is thrown at parse time before any iteration
- The resolved pack's path is recorded in the runtime summary's `calibrationRef.packPath`
- Validator checks that `calibrationRef.packPath` in the recorded output matches the pack used at runtime
- TypeScript: removing scalar params from the signature causes a compile error if caller tries to pass them (type safety enforced)
- Pack resolution error fires before `iteration[0]` begins; no partial iteration state in output on failure

## BR-0012-0090: Concrete evidenceRefs Enforcement (v1.7.15 rev6 WS-4)

- AC-Refs: AC-0012-0054-01, AC-0012-0054-02, AC-0012-0054-03, AC-0012-0054-04, AC-0012-0054-05, AC-0012-0054-06
- `runtimeGate.evidenceRefs` MUST contain only concrete, resolvable artifact refs:
  - Render summary refs: e.g., `prototyping.json#/iterations/N/renderSummary`
  - Screenshot refs: e.g., `screenshots/iter-N-screen-login.png`
  - Browser QA phase/finding refs: e.g., `browserQa/iter-N-smoke.json#/findings/0`
- Self-references pointing to `prototyping.json#/runtimeGate` or similar are FORBIDDEN
- Synthetic free-text strings (e.g., `"specs: UI matches design"`) are FORBIDDEN
- Empty `evidenceRefs` array is forbidden; at least one concrete ref is required
- `specCoverage.evidenceRefs` MUST contain only `40_screen_contracts.md#<screen-id>` spec refs and concrete observation artifact refs
- `prototypingEvidence.ts` validator MUST reject self-references and synthetic strings with distinct error codes
- Validation must check all entries; any single invalid entry causes rejection
- Validator check is idempotent: same evidenceRefs validated twice returns same result

## BR-0012-0091: reviewerSignoff Semantics and screenId Matching (v1.7.15 rev6 WS-5/WS-6/WS-7)

- AC-Refs: AC-0012-0055-01, AC-0012-0055-02, AC-0012-0055-03, AC-0012-0055-04, AC-0012-0055-05, AC-0012-0055-06
- `reviewerSignoff.status` MUST be one of: `approved`, `rejected`, `abandoned`
- Mapping from `terminationReason`:
  - `terminationReason = "accepted"` → `status = "approved"`
  - `terminationReason = "rejected"` → `status = "rejected"`
  - `terminationReason = "plateau"`, `"maxIterations"`, or `"runtimeFailure"` → `status = "abandoned"`
- `isCompleted: true` alone MUST NOT produce `status = "approved"`; terminationReason is authoritative
- `reviewerLogs[].verdict` MUST use mapped vocabulary: `approve`, `revise`, `reject`, `abandon`
- Pre-mapping values (e.g., `accept`, `plateau-stop`) MUST NOT appear in recorded output (OQ-0004 resolution)
- Validator enforces that `status` and `terminationReason` are mutually consistent; inconsistency is an error
- Mapping is applied once at harness execution end; result is immutable after
- `uiFidelityBuilder.ts` MUST use `obs.screenId === screen.screenId` for observation-to-screen matching
- Old matching code `obs.screenId === screen.uiContractId` MUST be fully removed
- Observations with a `screenId` matching no screen contract produce no match (no uiContractId fallback)
- Any observation record containing a `uiContractId` field MUST be hard-errored by the validator (OQ-0005 resolution: backward compat abandoned)
- Stale semantics removal: shipped docs, SKILL.md, evidence/README.md, review/README.md, contracts/ui/README.md, packages/qfai/README.md must not contain `standard`, `low-cost`, `cli prototyping`, or `mockPaths.status=pass`
- Test fixtures must not assert `approved` for plateau/maxIterations termination, or allow `cli + standard` prototyping
## BR-0012-0092: CalibrationLoader Called in execution.ts Pre-Harness Phase

- AC-Refs: AC-0012-0056, AC-0012-0057, AC-0012-0058
- Rule: `runPrototypingExecution()` MUST call `CalibrationLoader` (or equivalent) in its pre-harness phase to obtain a resolved `CalibrationPack` object before invoking `runFullHarness()`. `runtime.ts` MUST NOT import `CalibrationLoader`.
- Source: REQ-0041, REQ-0042, REQ-0043

## BR-0012-0093: uiFidelity Guard Position — After buildUiFidelity, Before runFullHarness

- AC-Refs: AC-0012-0059, AC-0012-0060, AC-0012-0061, AC-0012-0062
- Rule: The uiFidelity guard MUST be evaluated after `buildUiFidelity()` returns and before `buildSpecCoverageSummary()`, `buildL2Evidence()`, and `runFullHarness()` are called. Any incomplete condition (status≠completed, missingRequired>0, missing screen) MUST throw `UiFidelityEvidenceError` immediately.
- Source: REQ-0044, REQ-0045, REQ-0046, REQ-0047

## BR-0012-0094: isConcreteArtifactRef Defines Forbidden Patterns

- AC-Refs: AC-0012-0063, AC-0012-0064, AC-0012-0065
- Rule: `isConcreteArtifactRef(ref)` MUST return `false` for: directory paths, pack root paths, `.qfai/evidence/prototyping.json#/...` self-refs, `specs:` prefix synthetic tokens, and extension-less paths without anchors. `specCoverage.evidenceRefs` and `runtimeGate.evidenceRefs` MUST pass all entries through this check.
- Source: REQ-0048, REQ-0049

## BR-0012-0095: Validator Uses Real Pack Comparison — No Heuristics

- AC-Refs: AC-0012-0066, AC-0012-0067, AC-0012-0068
- Rule: `prototypingEvidence.ts` MUST resolve `evidence.fullHarness.calibrationRef.packPath`, read the actual pack, and compare `packPath` (normalized), `packVersion` (strict equality), and `configPath` (strict equality if present in summary). Any mismatch MUST be `issues.push(error(...))`. Hardcoded version heuristics (e.g., `packVersion === "1.0.0"` special-case) are forbidden.
- Source: REQ-0050, REQ-0051, REQ-0052

## BR-0012-0096: Six Error Classes — Co-Located in prototyping/errors.ts

- AC-Refs: AC-0012-0069, AC-0012-0070
- Rule: `packages/qfai/src/core/prototyping/errors.ts` MUST export exactly: `CalibrationResolutionError`, `UiFidelityEvidenceError`, `SpecCoverageBuildError`, `L2EvidenceBuildError`, `FullHarnessRuntimeError`, `EvidenceWriteError`. Each MUST extend `Error`. Each catch block in `execution.ts` MUST use only the appropriate error class for its phase.
- Source: REQ-0053, REQ-0054

## BR-0012-0097: Scalar Calibration Fields Removed — Obsolete Input Causes Error

- AC-Refs: AC-0012-0071, AC-0012-0072, AC-0012-0073
- Rule: `PrototypingCalibrationConfig` in `config.ts` MUST NOT contain `thresholds.accept`, `thresholds.refine`, `maxIterations`, `plateauDelta`, or `plateauLookback`. If any of these fields are present in a user's config input, the normalize step MUST throw an error naming the obsolete field(s). `qfai.config.yaml` template and `README.md` examples MUST use packPath-only.
- Source: REQ-0055, REQ-0056, REQ-0057

## BR-0012-0098: surfacePolicy Rejection Message — Derived, Never Hardcoded

- AC-Refs: AC-0012-0074, AC-0012-0075
- Rule: `assertSupportedPrototypingSurface()` in `surfacePolicy.ts` MUST generate its rejection message by joining `PROTOTYPING_SUPPORTED_SURFACES` (e.g., `.join(", ")`). The message MUST NOT hardcode any surface name. When `PROTOTYPING_SUPPORTED_SURFACES` changes, the message auto-updates.
- Source: REQ-0058

## BR-0012-0099: pathUtils.ts Is a Leaf Module — No Import from execution.ts or Its Transitive Importers (v1.7.15 rev8 WS-1)

- AC-Refs: AC-0012-0076, AC-0012-0080, AC-0012-0081, AC-0012-0082
- Rule: `packages/qfai/src/core/prototyping/pathUtils.ts` MUST NOT import from `execution.ts` or any module that transitively imports `execution.ts`. Circular import prevention is mandatory. Any type shared between pathUtils.ts and execution-layer modules MUST be defined in a neutral location (e.g., a shared types file).
- Source: REQ-0059, TC-2 (discussion constraints)

## BR-0012-0100: toRepoRelativeArtifactRef() Normalizes to POSIX Separator — Windows Backslash Forbidden (v1.7.15 rev8 WS-1)

- AC-Refs: AC-0012-0083
- Rule: `toRepoRelativeArtifactRef()` MUST normalize all path separators to POSIX `/` in its output regardless of the host OS. Windows `\\` separators in `absolutePath` input MUST be converted. The returned string MUST NOT contain `\\`.
- Source: REQ-0059, TC-1 (discussion constraints)

## BR-0012-0101: runtimeGate.evidenceRefs Absence or Empty Array Is Always a Validator Error (Fail-Closed) (v1.7.15 rev8 WS-2)

- AC-Refs: AC-0012-0087, AC-0012-0088
- Rule: `validatePrototypingEvidence()` MUST produce a validator error when `runtimeGate.evidenceRefs` is absent OR when it is an empty array `[]`. There is no valid use case for an absent or empty `runtimeGate.evidenceRefs` in full-harness UI-only output. This is a fail-closed rule (DR-0012-0048).
- Source: REQ-0066, REQ-0067

## BR-0012-0102: All Malformed Ref Forms in runtimeGate.evidenceRefs Are Individual Validator Errors (v1.7.15 rev8 WS-2)

- AC-Refs: AC-0012-0089, AC-0012-0090, AC-0012-0091, AC-0012-0092, AC-0012-0093
- Rule: Each of the following forms in `runtimeGate.evidenceRefs` MUST individually produce a validator error: (a) absolute path (starts with `/` or drive letter), (b) self-ref (`.qfai/evidence/prototyping.json#/...`), (c) synthetic token (non-path string like `"routes: all observed"`), (d) directory path (no file extension), (e) empty string `""`. Checks MUST be performed per-entry using `isConcreteArtifactRef()` from `pathUtils.ts`.
- Source: REQ-0068

## BR-0012-0103: Single Grammar SSOT — No Parallel Implementations of Concrete-Ref Grammar Outside pathUtils.ts (v1.7.15 rev8 WS-3)

- AC-Refs: AC-0012-0094, AC-0012-0096
- Rule: The concrete-ref grammar MUST have a single SSOT in `pathUtils.ts`. No module in `packages/qfai/src` may define an independent regex or pattern for "is concrete ref" outside of `pathUtils.ts`. All consumers MUST import and use the shared helpers. Violation is detectable by grep.
- Source: REQ-0069, NFR-0003

## BR-0012-0104: execution.ts Guards All Builder Outputs with assertConcreteArtifactRef() Before Bundle Write (v1.7.15 rev8 WS-3)

- AC-Refs: AC-0012-0098
- Rule: `execution.ts` MUST call `assertConcreteArtifactRef()` on builder outputs (at minimum specCoverage evidenceRefs and runtimeGate evidenceRefs) before writing the bundle to disk. An absolute path or invalid ref in any builder output MUST cause an assertion throw before bundle write, not a silent write of invalid data.
- Source: REQ-0069

## BR-0012-0105: Closure Test Required — Builder Output Must Pass Its Own Validator with Zero Errors (v1.7.15 rev8 WS-4)

- AC-Refs: AC-0012-0099, AC-0012-0100
- Rule: `prototypingExecution.productionPath.test.ts` MUST exist and MUST contain at least one test that calls `runPrototypingExecution()` end-to-end with valid inputs and passes its output to `validatePrototypingEvidence()`, asserting zero errors. This test prevents the class of regression where builders produce output that fails their own validator.
- Source: REQ-0073, NFR-0004

## BR-0012-0106: specCoverage.test.ts and prototypingEvidence.test.ts Must Include Negative Ref Cases (v1.7.15 rev8 WS-4)

- AC-Refs: AC-0012-0101, AC-0012-0102, AC-0012-0103
- Rule: `specCoverage.test.ts` MUST include negative cases: absolute path input → repo-relative output, outside-root path → throw, directory path → throw, `coverageRefs[].declaredRef` format verified. `prototypingEvidence.test.ts` MUST include negative cases for `runtimeGate.evidenceRefs`: absolute path → error, self-ref → error, synthetic token → error, absent → error, empty array → error.
- Source: REQ-0071, REQ-0072

## BR-0012-0107: runtimeGate.ui[].declaredRef Required Field Rule (v1.7.15 rev9 WS-1)

- AC-Refs: AC-0012-0104
- Rule: validatePrototypingEvidence() must check each runtimeGate.ui[] row for the presence of `declaredRef`. Absence of the field (undefined or null) produces a QFAI-PROT validator error. The field check must occur before the concrete-ref grammar check (fail fast on missing).

## BR-0012-0108: runtimeGate.ui[] Leaf Fields Concrete-Ref Grammar Rule (v1.7.15 rev9 WS-1)

- AC-Refs: AC-0012-0105, AC-0012-0107, AC-0012-0109
- Rule: For each `runtimeGate.ui[]` row, after presence checks pass, `isConcreteArtifactRef()` from `pathUtils.ts` is applied to `declaredRef` and every entry in `renderEvidenceRefs[]` and `browserQaEvidenceRefs[]`. Any value that fails `isConcreteArtifactRef()` produces an individual QFAI-PROT validator error. The helper is the single grammar SSOT; no parallel implementation may be introduced.

## BR-0012-0109: runtimeGate.ui[] Leaf Arrays Non-Empty Rule (v1.7.15 rev9 WS-1)

- AC-Refs: AC-0012-0106, AC-0012-0108
- Rule: `renderEvidenceRefs[]` and `browserQaEvidenceRefs[]` on each `runtimeGate.ui[]` row must be non-empty arrays. An empty array `[]` or absent field produces a QFAI-PROT validator error. This applies regardless of whether a browser QA run was performed — if the run cannot be completed, the builder must fail rather than emit an empty array.

## BR-0012-0110: axes[].evidenceRefs[] Per-Axis Validation Rule (v1.7.15 rev9 WS-1)

- AC-Refs: AC-0012-0111, AC-0012-0112, AC-0012-0113, AC-0012-0114, AC-0012-0115, AC-0012-0116
- Rule: For each axis in `l1.axes[]` and `l2.axes[]` across all iterations, `evidenceRefs[]` must be non-empty and every entry must pass `isConcreteArtifactRef()`. Validation is per-axis: a single axis with a malformed or empty evidenceRefs[] produces a QFAI-PROT error regardless of other axes. Self-refs (pointing to prototyping.json) are explicitly forbidden.

## BR-0012-0111: reviewerLogs[].evidenceRefs[] Non-Empty and Concrete Rule (v1.7.15 rev9 WS-1)

- AC-Refs: AC-0012-0117, AC-0012-0118, AC-0012-0119, AC-0012-0120, AC-0012-0121
- Rule: For each entry in `reviewerLogs[]`, `evidenceRefs[]` must be non-empty and every entry must pass `isConcreteArtifactRef()`. Synthetic tokens (e.g., "reviewer:1"), absolute paths, self-refs, empty strings — all produce individual QFAI-PROT validator errors.

## BR-0012-0112: bundleWriter.ts Strict Schema Rule (v1.7.15 rev9 WS-2)

- AC-Refs: AC-0012-0122, AC-0012-0123, AC-0012-0126
- Rule: The TypeScript type in `bundleWriter.ts` (or the shared type it uses) must mark `runtimeGate.ui[].declaredRef` as required (not optional `?`). All leaf array fields (`renderEvidenceRefs[]`, `browserQaEvidenceRefs[]`, `l1/l2.axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`) must be typed as required non-nullable arrays (not `T | undefined | null`). Any code omitting these fields must be a TypeScript compile error.

## BR-0012-0113: Runtime Builder Null-Emission Prevention Rule (v1.7.15 rev9 WS-2)

- AC-Refs: AC-0012-0124, AC-0012-0125
- Rule: Runtime builders (`runtimeObservation.ts`, `runtimeGateBuilder.ts`) must not emit null, undefined, or omitted values for any required leaf field. If a builder cannot populate a required leaf array, it must throw a runtime error before the bundle is written. Silent null/empty pass-through is prohibited.

## BR-0012-0114: Synthetic Token Fixture Replacement Rule (v1.7.15 rev9 WS-3)

- AC-Refs: AC-0012-0130
- Rule: All test fixtures in `packages/qfai/tests/core/` that use synthetic tokens ("a", "b", "reviewer:1", or similar non-path strings) as `evidenceRefs` values must be replaced with repo-root relative concrete artifact refs (e.g., `.qfai/evidence/iter-0/fidelity-eval.md#finding-1`). The replacement values do not need to point to existing files on disk; they must only satisfy `isConcreteArtifactRef()` grammar.

## BR-0012-0115: Leaf-Field Negative Test Coverage Rule (v1.7.15 rev9 WS-3)

- AC-Refs: AC-0012-0127, AC-0012-0128, AC-0012-0129, AC-0012-0131
- Rule: `prototypingEvidence.test.ts` must include the full set of negative cases: (a) 7 cases for `runtimeGate.ui[]` (declaredRef absent, absolute path, self-ref, synthetic token, bare filename, directory path, Windows `\\` separator); (b) 5 cases for axis-level `evidenceRefs[]` (l1 synthetic token, l2 synthetic token, absolute path, self-ref, empty array); (c) 3 cases for reviewer-level `evidenceRefs[]` (synthetic token "reviewer:1", absolute path, empty array). `prototypingExecution.productionPath.test.ts` must include at least 1 positive closure assertion and 1 negative injection for a leaf field.

## BR-0012-0116: README Leaf-Field Enumeration Rule (v1.7.15 rev9 WS-4)

- AC-Refs: AC-0012-0132
- Rule: `packages/qfai/README.md` must explicitly list all fields under the concrete artifact ref contract after WS-4. The list must include all rev9 leaf fields: `runtimeGate.ui[].declaredRef`, `runtimeGate.ui[].renderEvidenceRefs[]`, `runtimeGate.ui[].browserQaEvidenceRefs[]`, `fullHarness.iterations[].l1/l2.axes[].evidenceRefs[]`, `fullHarness.reviewerLogs[].evidenceRefs[]`. The description must not use language that implies only top-level fields are under the strict ref contract.