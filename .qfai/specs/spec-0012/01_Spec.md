# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- NOTE: The CLI command `qfai prototyping` has been REMOVED. This spec covers the SKILL (`/qfai-prototyping`) only.

## Scope

- In:
  - NOTE: v1.7.15 adds runtime truthfulness hardening — panel scoring from real evidence, converged requires iterationCount>=2, reviewer/commitSha mandatory, specCoverage from real diffs, uiFidelity observation-only, CalibrationLoader wired into execution.ts, fail-fast on missing evidence
  - `/qfai-prototyping` skill workflow (SKILL only, no CLI command) — skill-centered truth: the skill is the sole interface for prototyping
  - All-spec stage: scope is ALL specs from `.qfai/specs/spec-*`
  - Spec Auto-Discovery Protocol (4-source unified diff detection: branch diff, local changes, evidence mtime, delta.md parse)
  - Prototyping modes: low-cost (static only), standard (static + optional light validation, default), full-harness (runtime-heavy, opt-in)
  - Mode selection protocol: user-specified > discussion recommendation > system default (standard)
  - Definition of Done by fidelity level: L1 (skeleton), L2 (interactive, default)
  - Coverage Matrix for all specs (uiRoutes, apiEndpoints, dbObjects)
  - Runtime Interaction Gate v2 (UI route checks, API endpoint checks, DB object checks, mock path checks)
  - Full-harness workflow loop (Planner -> Generator -> Evaluator -> Decision Gate)
  - Non-UI project handling (surface: non-ui skips UI-specific obligations)
  - Visual Review Guard (DDP -> Design Token -> UI Contract -> HTML Mock -> Flow)
  - Evidence production: markdown + JSON artifacts under `.qfai/evidence/`
  - `prototyping.json` with `uiFidelity` for L2 reporting
  - Browser QA 4-phase model（smoke → interaction → visual → accessibility）: `browserQa/runner.ts` が順次実行し `BrowserQaRunResult` を集約
  - Evidence bundling system（`evidence/bundleWriter.ts`, `evidence/fsEvidenceWriter.ts`）: render + Browser QA 結果を `.qfai/evidence/` に JSON バンドルとして永続化
  - Render evidence capture（`evidence/renderRunner.ts`, `evidence/playwrightRenderAdapter.ts`）: Playwright アダプタ経由で PNG + HTML キャプチャ
  - Provider registry pattern（`providers/registry.ts`, `providers/types.ts`）: config → concrete provider の依存逆転
  - Full-harness runtime（`harness/runtime.ts`, `harness/adapters.ts`, `harness/resultWriter.ts`）: Planner→Generator→Evaluator ループの本番パス実装
  - UI fidelity builder（`prototyping/uiFidelityBuilder.ts`）: render evidence + Browser QA から UI fidelity artifact を合成し QFAI-PROT-270/271/272 で欠落を検出
  - Prototyping execution orchestrator（`prototyping/execution.ts`）: mode resolution → evidence → Browser QA → full-harness の本番パスエントリポイント
  - Full-harness iteration protocol: 4-step cycle（Evaluate→Identify→Fix→Re-evaluate）, MIN_ITERATIONS=5, termination conditions（converged/max-iterations/plateau/manual-stop）
  - Independent evaluator panel: product-surface-reviewer (L1: design quality), product-experience-architect (L2: product experience), qa-gatekeeper (L3: process audit)
  - Score scope separation: discussion 3-layer scores（design direction quality）≠ prototyping scoringTrace（implementation fidelity）
  - Evaluation rigor rules: 3-tier rubric（existence_gate/quality_criteria/excellence_criteria）, L1/L2/L1-manual finding classification
  - Asset acquisition strategy: free asset MUST, emoji prohibition, placeholder prohibition, accessibility checklist（WCAG 2.1 AA）
  - Reviewer gate strengthening: 6 full-harness-specific checks, Limitations section obligation
  - Full-harness validator rules: QFAI-PROT-290~294（iteration integrity validators）
  - Full-harness review profile（`review-profiles.yml`）: always_required=[completion-reviewer, product-surface-reviewer, qa-gatekeeper]
  - Agent routing evidence phase: product-experience-architect added to prototyping conditional_agents
  - Prototyping mode module (`prototyping/mode.ts`): mode resolution engine with existence-based precedence
  - Recommendation artifact resolver (`prototyping/recommendationArtifact.ts`): single source of truth for recommendation status
  - Recommendation schema (`prototyping/recommendationSchema.ts`): key existence checks for precedence decisions
  - Prototyping types (`prototyping/types.ts`): canonical type set (PrototypingMode, PrototypingSurface, PrototypingObligations, etc.)
  - prototyping.calibration config block (`qfai.config.yaml` の prototyping stanza)
  - Report prototyping observability integration (mode, obligations, evidence, harness, render, browserQa, calibration)
- Out:
  - CLI command `qfai prototyping` (REMOVED — no active document may reference it as a valid interface)
  - Acceptance test automation (belongs to `/qfai-atdd`)
  - Unit/component tests (belongs to `/qfai-implement`)
  - Contract redesign during prototyping

## Applicable NFR

- NFR-0001: All-spec coverage -- every spec from `.qfai/specs/spec-*` must be covered in Coverage Matrix
- NFR-0002: Static-first default -- standard mode requires no browser or server process
- NFR-0003: API runtime gate -- zero 404 results in API endpoint checks
- NFR-0004: No placeholder pages -- placeholder-only pages are marked REVISE, not accepted
- NFR-0005: L2 fidelity default -- declared primary interactions wired with mockable behavior

## Applicable Policy

- Policy: Drift Protocol mandatory
- Contracts are strict inputs; do not create new files under `.qfai/contracts/**`
- Full-harness mode must be explicitly opted in (never auto-activated)

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`
- Consolidates: old spec-0006 (prototyping CLI), spec-0024 (render evidence), spec-0028-0033 (runtime/harness), spec-0035 (canonical), spec-0036 (foundation)
- NOTE: CLI command `qfai prototyping` has been removed from codebase

## Relevant Requirements

- REQ-0001: All-spec prototyping -- scope fixed to ALL specs from `.qfai/specs/spec-*`
- REQ-0002: Spec Auto-Discovery -- 4-source unified diff detection (branch, local, evidence mtime, delta.md)
- REQ-0003: Mode definitions -- low-cost (static), standard (default), full-harness (opt-in)
- REQ-0004: Mode selection protocol -- user > discussion recommendation > system default
- REQ-0005: L1/L2 fidelity DoD -- skeleton (L1) vs interactive (L2 default)
- REQ-0006: Coverage Matrix -- uiRoutes, apiEndpoints, dbObjects per spec
- REQ-0007: Runtime Gate v2 -- UI/API/DB/mock path checks
- REQ-0008: Full-harness loop -- Planner -> Generator -> Evaluator -> Decision Gate
- REQ-0009: Non-UI handling -- non-ui surface skips UI obligations
- REQ-0010: Evidence artifacts -- markdown + JSON with uiFidelity for L2
- REQ-0011: Visual Review Guard -- DDP-first reading for UI-affecting slices
- REQ-0012: Resolve prototyping truth -- spec, policies, docs, code must agree skill is the only interface (v1.7.12, from D-003)
- REQ-0013: Archive/label superseded spec content that references CLI command (v1.7.12)
- REQ-0014: Eliminate responsibility leakage between skill and CLI (v1.7.12)
- REQ-0015: Normalize static-first/mode-aware prototyping contract (v1.7.12)
- REQ-0016: Prototyping Mode Module — `prototyping/mode.ts` に mode resolution engine を実装。parseDiscussionModeRecommendationWithWarnings(), resolvePrototypingMode(), derivePrototypingObligations(), inferSurfaceFromRecommendationAndEvidence() を提供
- REQ-0017: Existence-Based Precedence (D-5) — prototyping.yaml 内の `prototyping` key の存在自体で namespaced contract を権威的とする。値の妥当性ではなく key の有無で判定し、legacy fallback を防止
- REQ-0018: Recommendation Artifact Resolver — `resolveLatestRecommendationArtifact()` が recommendation artifact の status（valid/invalid/missing/no-pack）を一元管理。report.ts と prototypingEvidence.ts が共有
- REQ-0019: Recommendation Schema Validation — `validatePrototypingRecommendation()` が prototyping.yaml の schema を検証（必須フィールド、mode 妥当性、allowed_modes 整合性）し、SDD preflight blocker として機能
- REQ-0020: Prototyping Calibration Config — `qfai.config.yaml` に prototyping.calibration stanza を追加。accept: 0.8, refine: 0.5, maxIterations: 15 のデフォルト値。プロジェクト固有のチューニング可能
- REQ-0021: Report Prototyping Integration — report.ts に ReportPrototypingSummary 型で prototyping data を収集。recommendationArtifact, mode, evidence, fullHarness, render, browserQa, calibration を含む。v1.7.13 では foundation-only
- REQ-0022: Browser QA 4-Phase Model — `browserQa/runner.ts` が smoke→interaction→visual→accessibility の 4 フェーズを順次実行。各フェーズは独立した `BrowserQaPhaseResult` を返し、runner が `BrowserQaRunResult` に集約。Playwright provider 経由で実行
- REQ-0023: Evidence Bundle Persistence — `evidence/bundleWriter.ts` が render capture + Browser QA 結果 + prototyping summary を `.qfai/evidence/` に JSON バンドルとして永続化。full-harness correlation ID を含む
- REQ-0024: Render Evidence Capture — `evidence/renderRunner.ts` が `RenderCaptureAdapter`（Playwright 実装: `playwrightRenderAdapter.ts`）経由で各 route の PNG + HTML をキャプチャ。キャプチャ結果は `RenderRunnerResult` 型で返却
- REQ-0025: Provider Registry — `providers/registry.ts` が `QfaiPrototypingConfig` から concrete provider（Playwright/custom）を解決。依存逆転パターンで harness・runner が provider 実装に依存しない
- REQ-0026: UI Fidelity Builder — `prototyping/uiFidelityBuilder.ts` が render evidence + Browser QA 結果から UI fidelity artifact を合成。required evidence 欠落時は QFAI-PROT-270（render missing）, QFAI-PROT-271（browserQa missing）, QFAI-PROT-272（both missing）を emit
- REQ-0027: Prototyping Execution Orchestrator — `prototyping/execution.ts` が mode resolution → evidence capture → Browser QA → full-harness の本番パスを統合実行。mode=low-cost/standard/full-harness の各パスを mode.ts の obligation matrix に基づいて制御
- REQ-0028: Canonical Prototyping Surfaces (v1.7.14, DR-0109) — PrototypingSurface を web/mobile/desktop/cli/mixed の 5 値に正規化。旧 web-ui/mobile-ui/desktop-ui の -ui suffix を廃止。"non-ui" は prototyping surface 外の分類として明示的に分離
- REQ-0029: Execution Hard Gates (v1.7.14, DR-0111) — execution.ts が readValidatedClassification() を使用し、invalid/矛盾した classification を即座に reject。non-UI classification は「prototyping execution の対象外」として明示的に拒否。invalid recommendation artifact も hard error
- REQ-0030: Namespaced-Only Schema (v1.7.14, DR-0112) — prototyping.yaml の legacy top-level recommendation keys の存在を hard error とする。namespaced `prototyping:` ブロックのみを受け付け、legacy keys との共存を禁止
- REQ-0031: Semantic Invariant SSOT (v1.7.14, DR-0113) — validateRecommendationSemantics() を recommendationSemantics.ts に集約し、recommended_mode ∈ allowed_modes の不変条件を parser/resolver/execution/CLI/validator/preflight の全レイヤーで共有
- REQ-0032: Classification Separation (v1.7.14, DR-0110) — "discussion UI-bearing"（web/mobile/desktop/cli/mixed）と "visual/browser evidence required"（web/mobile/desktop/mixed、cli 除外）を独立した判定関数に分離。derivePrototypingObligations() は後者のみで evidence 義務を判定
- REQ-0033: Surface Inference Nullable (v1.7.14) — inferSurfaceFromRecommendationAndEvidence() が surface 推定不能時に null を返す（旧: "non-ui" デフォルト）。明示的な surface 指定を促進し、silent default を排除
- REQ-0034: Full-Harness Iteration Protocol (v1.7.14) — full-harness mode を単一パス evidence 生成から反復改善ループに拡張。4-step cycle（Evaluate→Identify→Fix→Re-evaluate）を定義。MIN_ITERATIONS=5, 終了条件テーブル（converged/max-iterations/plateau/manual-stop）。calibration config 参照で閾値を外部化
- REQ-0035: Independent Evaluator Panel (v1.7.14) — full-harness の自己評価バイアスを防止するため、3 層独立評価パネルを導入。L1: product-surface-reviewer（UI/UX 品質）、L2: product-experience-architect（プロダクト体験）、L3: qa-gatekeeper（プロセス監査）。L1/L2 は `task` tool の `background` mode で個別コンテキスト起動必須。イテレーションの weightedTotal は L1/L2 の最小値
- REQ-0036: Score Scope Separation (v1.7.14) — discussion 3-layer scores（design direction quality）と prototyping scoringTrace（implementation fidelity）を明確に分離。discussion aggregate scores の scoringTrace へのコピーを禁止。SKILL.md と aggregate テンプレートに score scope limitation を明記
- REQ-0037: Evaluation Rigor Rules (v1.7.14) — 3-tier rubric（existence_gate 0-0.3, quality_criteria 0.3-0.7, excellence_criteria 0.7-1.0）を全評価軸に義務化。L1/L2/L1-manual の finding 分類体系。Lighthouse automated gate（SHOULD: scores <70 = L1 finding）
- REQ-0038: Asset Acquisition Strategy (v1.7.14) — full-harness mode で professional-quality visual assets を必須化。free asset sources MUST, emoji prohibition（U+1F000–U+1FAFF, U+2600–U+27BF）, placeholder prohibition,
  accessibility checklist（WCAG 2.1 AA）, trust signal checklist（SHOULD）, dev server management protocol
- REQ-0039: Reviewer Gate Strengthening (v1.7.14) — full-harness 専用の 6 項目検証（iterationCount>1, scoringTrace count 一致, score progression, terminationReason 整合, 独立評価者実行確認, limitations セクション存在）。Limitations section の full-harness MUST 義務化
- REQ-0040: Full-Harness Validator Rules QFAI-PROT-290~294 (v1.7.14) — 5 つの新規 validator rule を prototypingEvidence.ts に追加。PROT-290（iterationCount=1+converged warning）、PROT-291（scoringTrace count mismatch warning）、
  PROT-292（terminationReason cross-check warning）、PROT-293（maxIterations 超過 warning）、PROT-294（non-increasing scoringTrace info）
- REQ-0041: Panel scoring L1 実 evidence 算出 (v1.7.15; discussion REQ-0001) — scoreL1(inputs) は runtime gate / render coverage / browser QA blocking findings / screen contract coverage / spec coverage を必須入力とし、実 evidence から L1 total を算出する。l1: { total: 0, axes: [] } の固定値生成を禁止
- REQ-0042: Panel scoring L2 実 evidence 算出 (v1.7.15; discussion REQ-0002) — scoreL2(inputs) は discussion 3-layer axes / screen contract fidelity / trend translation consistency / visual findings / browser QA experience findings を必須入力とし、実 evidence から L2 total を算出する
- REQ-0043: weightedTotal = min(l1.total, l2.total) (v1.7.15; discussion REQ-0003) — computeWeightedTotal(l1, l2) は常に Math.min(l1.total, l2.total) を返す。pre-scored 値の流用を禁止
- REQ-0044: converged 判定: iterationCount >= 2 必須 (v1.7.15; discussion REQ-0004) — converged は iterationCount >= 2 かつ weightedTotal >= acceptThreshold かつ plateau 条件を満たす場合のみ成立。1 iteration 目 accept でも converged にしない
- REQ-0045: plateau 判定 (v1.7.15; discussion REQ-0005) — plateau は iterationCount >= 2 かつ plateau 条件成立だが accept threshold 未達の場合に設定
- REQ-0046: max-iterations 判定 (v1.7.15; discussion REQ-0006) — terminationReason = max-iterations は iterationCount === calibration.maxIterations の場合のみ設定
- REQ-0047: reviewerLogs[] append-only 累積 (v1.7.15; discussion REQ-0007) — reviewerLogs[] は iteration ごとに append-only で累積。既存ログの上書き・単一要素置換を禁止
- REQ-0048: reviewer CLI 引数必須・placeholder 拒否 (v1.7.15; discussion REQ-0008) — reviewerId は CLI 引数で必須。placeholder 値 (qfai, default, auto, system, unknown, 空文字) を reject。resolvedReviewer ?? "qfai" フォールバックを禁止
- REQ-0049: commitSha full-harness 必須 (v1.7.15; discussion REQ-0009) — full-harness 実行時に commit SHA 取得失敗を許可しない。取得不能時は runtime error で失敗
- REQ-0050: specCoverage 実測導出 (v1.7.15; discussion REQ-0010) — specCoverage は loadDeclaredSpecArtifacts() と collectObservedRuntimeArtifacts() の実差分から buildSpecCoverageSummary() で生成。zero-seeded 固定出力を禁止
- REQ-0051: uiFidelity observation-only 化 (v1.7.15; discussion REQ-0011) — uiFidelity は DOM parse (jsdom) / browser QA / render evidence からのみ構成。mockPaths.status = "pass" の自動生成を禁止。evidence 不足時は status = "insufficient-evidence"
- REQ-0052: extractHtmlLabelsFromString 空実装廃止 (v1.7.15; discussion REQ-0012) — extractHtmlLabelsFromString() の空実装を削除し、uiObservation.ts の extractDomLabelsWithJsdom() へ責務移管
- REQ-0053: CalibrationLoader execution path 本接続 (v1.7.15; discussion REQ-0013) — CalibrationLoader を execution.ts で loadConfig() 後に呼び出し、full-harness の実行パスに接続。pack 不在・読取不可・schema 不整合時は失敗
- REQ-0054: packVersion pack metadata 解決 (v1.7.15; discussion REQ-0014) — packVersion は CalibrationLoader 経由で pack metadata から動的に取得。packVersion: "1.0.0" のハードコードを禁止
- REQ-0055: Docs / SKILL / README reality sync (v1.7.15; discussion REQ-0025) — docs の主張が runtime 実体を超えないこと。full-harness 入力要件、reviewer 必須、convergence rule、specCoverage 実測要件、uiFidelity observation-only rule、calibration 必須性を runtime と一致させる
- REQ-0056: missing evidence fail-fast (v1.7.15; discussion REQ-0026) — full-harness で calibration pack / reviewer / commit SHA / render evidence / browser QA evidence / ui observation input / spec coverage input が欠けた場合、補完せず runtime error で失敗
- REQ-0057: runFullHarness 契約から pre-scored l1/l2 削除 (v1.7.15 rev2; discussion REQ-0027) — request 型から l1/l2 を削除。panelInputs 欠如時は即 throw
- REQ-0058: scoring runtime 内一元実行 (v1.7.15 rev2; discussion REQ-0028) — validatePanelInputs → scorePanelsFromInputs → determineDecision を必ず直列実行。外部 pre-scored 値の採用経路を削除
- REQ-0059: FullHarnessIteration evidence-driven 再定義 (v1.7.15 rev2; discussion REQ-0029) — l1/l2/weightedTotal/commitSha/reviewerId/limitations/evidenceRefs を必須化
- REQ-0060: MeasurementResult strict 再定義 (v1.7.15 rev2; discussion REQ-0030) — panelInputs と 8 カテゴリ evidenceRefs を同時に返す。空カテゴリ許容 NG
- REQ-0061: evidenceRefs 8 カテゴリ必須化 (v1.7.15 rev2; discussion REQ-0031) — runtimeGate/render/browserQa/uiObservation/specCoverage/discussion/screenContract/trend の 8 カテゴリを必ず非空で保持
- REQ-0062: validatePanelInputs 欠落チェック強化 (v1.7.15 rev2; discussion REQ-0032) — 10 種類の silent pass を error に昇格
- REQ-0063: l2Evidence.ts 新設 (v1.7.15 rev2; discussion REQ-0033) — buildDiscussionAxisInputs(root) で実 discussion artifact から軸数を抽出。artifact 内評価値の再利用禁止
- REQ-0064: buildScreenContractInputs (v1.7.15 rev2; discussion REQ-0034) — totalContracts/coveredContracts/fidelityScore を算出。fidelityScore の 0 初期化禁止
- REQ-0065: buildTrendAlignmentInputs (v1.7.15 rev2; discussion REQ-0035) — trendSourcesChecked===0 で必ず失敗
- REQ-0066: execution.ts L2 dummy object 全廃 (v1.7.15 rev2; discussion REQ-0036) — 0 埋め literal を削除し l2Evidence builder 呼び出しに差し替え
- REQ-0067: panelScore 二重防御 (v1.7.15 rev2; discussion REQ-0037) — aggregateScore 0〜1 必須、trendSourcesChecked===0 reject、fidelityScore===0 with contracts reject
- REQ-0068: CalibrationLoader fail-open 全廃 (v1.7.15 rev2; discussion REQ-0038) — pack 不在/YAML 不正/version 欠落/thresholds 欠落/maxIterations 欠落で throw。DEFAULT_PACK fallback 削除
- REQ-0069: calibrationConfig fallback 弱体化 (v1.7.15 rev2; discussion REQ-0039) — config 側は packPath 解決用のみ。thresholds/maxIterations/plateauDelta/plateauLookback を config から補う処理を削除
- REQ-0070: TerminationContext を CalibrationPack で受ける (v1.7.15 rev2; discussion REQ-0040) — history.ts が CalibrationPack のみ受け入れる
- REQ-0071: count<plateauLookback で terminal にしない (v1.7.15 rev2; discussion REQ-0041) — status="in-progress", terminationReason: undefined を返す
- REQ-0072: validator termination 条件同期 (v1.7.15 rev2; discussion REQ-0042) — plateau/converged + iterationCount<plateauLookback を error
- REQ-0073: specCoverage 全 spec 必須化 (v1.7.15 rev2; discussion REQ-0043) — specNames にある spec が perSpecMap に無い場合は error
- REQ-0074: specCoverage.ts silent 空返却禁止 (v1.7.15 rev2; discussion REQ-0044) — 宣言抽出結果完全空/evidenceRefs 作れない/DB 未実装通過を error 化
- REQ-0075: DB coverage 二択ポリシー (v1.7.15 rev2; discussion REQ-0045) — 実 DB 観測 or full-harness failure。missing 続行禁止
- REQ-0076: UiObservationSummary screen-level 再構築 (v1.7.15 rev2; discussion REQ-0046) — ScreenObservation 型導入。flatten 廃止
- REQ-0077: actionsWired browser QA 由来 (v1.7.15 rev2; discussion REQ-0047) — 0 固定廃止。観測不能は unknown
- REQ-0078: mockPath findings semantics 同期 (v1.7.15 rev2; discussion REQ-0048) — pass は明示的成功導線観測のみ
- REQ-0079: uiFidelityBuilder screen-level 化 (v1.7.15 rev2; discussion REQ-0049) — screen 共通 DOM labels 流用廃止
- REQ-0080: uiFidelity insufficient-evidence 厳格化 (v1.7.15 rev2; discussion REQ-0050) — html capture 無し/render evidence 無し/browser QA 無し/action 観測不可で insufficient-evidence or error
- REQ-0081: uiFidelity auto-pass 完全廃止 (v1.7.15 rev2; discussion REQ-0051) — mockPaths status=pass 自動生成禁止
- REQ-0082: reviewerLog 8 カテゴリ evidenceRefs 保存 (v1.7.15 rev2; discussion REQ-0052) — render/browserQa のみでは不可
- REQ-0083: history 整合性 strict (v1.7.15 rev2; discussion REQ-0053) — iterations.length===iterationCount===scoringTrace.length===reviewerLogs.length。ズレで throw
- REQ-0084: bundleWriter schema v2 追随 (v1.7.15 rev2; discussion REQ-0054) — 8 カテゴリ evidenceRefs + FullHarnessIteration 新型。v1 非並存
- REQ-0085: docs/SKILL/README reality sync rev2 (v1.7.15 rev2; discussion REQ-0056) — 独立 evaluator 自動複数起動/Evaluate→Fix loop 内包/evidence 自動補完の主張を削除
- REQ-0086: tests fixture rev2 改定 (v1.7.15 rev2; discussion REQ-0057) — 正常系から旧前提を削除し異常系に新 fixture 追加

## Entry points

- US range in this spec: US-0012-0001..US-0012-0037
- Primary actors: Developer, AI Agent (FullStackEngineer, RuntimeGatekeeper), CI/CD pipeline
- Notes: No CLI command exists. This is a skill-only spec for `/qfai-prototyping`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: fidelity depth vs execution speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
