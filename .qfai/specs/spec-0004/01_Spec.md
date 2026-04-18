# 01 Spec

- Spec: spec-0004
- Parent: CAP-0004
- Consolidates: old spec-0002

## Consumer View

- Primary SSOT for execution: `spec-0004/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: validate コマンドの全機能（50+ バリデータ実行、--fail-on, --format, --phase, --platform, validate.json 出力、ランログ、ウェイバー適用、phase guard、canonical/legacy validator 分離、IssueCategory "canonical"、prototypingRecommendation バリデータ、Surface Type Detection による non-UI 安全スキップ、full-harness iteration integrity validators (PROT-290..306, PROT-308..309)）
- Out: report/init/doctor/guardrails

## Applicable NFR

- NFR-0001: バリデーション実行時間 - 中規模プロジェクト（spec 5個）で 10秒以内
- NFR-0002: 大規模プロジェクト対応 - spec 50個、テストファイル 1000個で 60秒以内
- NFR-0003: ファイル探索効率 - fast-glob によるストリーム処理、上限 10,000件
- NFR-0010: バリデーション正確性 - 誤検知率（False Positive）5% 未満
- NFR-0011: ウェイバー正確性 - ウェイバー適用による意図しない Issue 消失なし
- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証
- NFR-0061: 終了コード規約 - 0=成功, 1=失敗（failOn 基準）

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: validate.json 出力、ランログ（.qfai/report/run-\*/）

## Relevant Requirements

- REQ-0010: スペックバリデーション - `qfai validate` で全バリデータ（33+）を順次実行し、Issue[] を集約する
- REQ-0011: バリデーションフェーズ - `--phase full|atdd|tdd|refinement` でスコープ制御
- REQ-0012: 終了コード制御 - `--fail-on error|warning|never` で終了コード制御
- REQ-0013: GitHub Actions 出力 - `--format github` でアノテーション形式（最大100件、重複排除）
- REQ-0014: バリデーション結果 JSON 出力 - validate.json に構造化結果出力
- REQ-0015: ランログ生成 - `.qfai/report/run-*/` にタイムスタンプ付き実行ログ保存
- REQ-0100: スペック必須ファイル検証 - レイヤードスペックの必須ファイル存在チェック
- REQ-0101: ID フォーマット検証 - ID 形式・重複チェック
- REQ-0102: トレーサビリティエッジ検証 - AC->TC, BR->EX, EX->TC, Spec->CAP 参照整合性
- REQ-0103: ATDD コードアノテーション検証 - テストファイル内のアノテーション検証
- REQ-0104: ディスカッションパック検証 - 15ファイル存在、内容充足、blocking OQ 検出
- REQ-0105: コントラクト検証 - UI/API/DB コントラクト ID 整合性
- REQ-0108: Mermaid 図形式検証
- REQ-0110: ウェイバー適用 - waivers.yml に基づく suppress / downgrade
- REQ-0112: ビジネスフロー Mermaid 必須
- REQ-0113: Canonical/Legacy Validator 分離 — production path は runCanonicalUixValidators のみ登録、legacy path は migration tooling 専用
- REQ-0114: IssueCategory "canonical" — 全新規 canonical validator が category: "canonical" を emit
- REQ-0115: prototypingRecommendation バリデータ — prototyping.yaml schema validation を validate pipeline に登録
- REQ-0116: DDP バリデータ除去 — validateDdpFields を production path から削除（legacy namespace に移動）
- REQ-0117: 新規 UIX canonical バリデータ — 12 modular validators を production path に登録:
  classification.ts, foundation.ts, taste.ts, trend.ts, threeLayer.ts（validateThreeLayerModel / validateForbiddenLegacyFiles / validateThreeLayerFamilyCompleteness）, scoringReady.ts, strategy.ts, screenContract.ts, comparisonValidator.ts, oqClosure.ts。
  canonical.ts が各バリデータを順次実行し Issue[] を集約
- REQ-0118: Surface Type Detection Module — `detection/surfaceType.ts` が 01_Context.md の明示的分類ブロック（ui_bearing/primary_surface）を優先し、フォールバックとして surface_type フィールドを使用。非 UI プロジェクトでは UIX バリデータを安全にスキップ
- REQ-0119: Legacy Validator 完全削除 (v1.7.14, DR-0115) — legacy/ ディレクトリ（ddpCompatibility.ts, uixCompatibility.ts, index.ts）、legacyStatusDir.ts、migration/formatDetection.ts、uix/rollout.ts を production ソースツリーから完全削除。migration tooling パスも廃止
- REQ-0120: IssueCategory 簡素化 (v1.7.14, DR-0108) — IssueCategory union type から "compatibility" を削除し、"canonical" | "change" のみとする。全バリデータの category 出力を "canonical" に統一
- REQ-0121: Strict Classification Validation (v1.7.14, DR-0111) — classification.ts バリデータが分類ブロック内の意味的矛盾（ui_bearing=false + 空でない secondary_surfaces、ui_bearing=true + primary_surface=non-ui、invalid/duplicate secondary surfaces 等）を hard error として検出
- REQ-0122: Strategy Semantic Validation (v1.7.14, DR-0114) — strategy.ts バリデータが canonical strategy decision enum を強制。selection_required=true → ≥2 candidates + non-"none" decision、selection_required=false → decision="none" の状態機械を検証。invalid surface/decision/candidates を reject
- REQ-0123: Full-Harness Iteration Integrity Validators QFAI-PROT-290~294 (v1.7.14) —
  prototypingEvidence.ts に 5 つの full-harness iteration integrity validator を追加:
  PROT-290（iterationCount=1 + converged warning）、PROT-291（scoringTrace count mismatch warning）、
  PROT-292（terminationReason cross-check warning）、PROT-293（maxIterations 超過 warning）、
  PROT-294（non-increasing scoringTrace info）。fullHarness validator taxonomy reserved range: 281-294
- REQ-0124: Validator rule: terminationReason=max-iterations integrity (QFAI-PROT-292 severity upgrade to error) — terminationReason=max-iterations なのに iterationCount < maxIterations の場合を error とする（v1.7.15 で warning→error 昇格）。REQ-0015 対応
- REQ-0125: Validator rule: single-iteration converged reject (QFAI-PROT-290 error upgrade + QFAI-PROT-308 new) — terminationReason=converged なのに iterationCount < 2 の場合を error とする。PROT-290 は warning→error 昇格、PROT-308 は新規 error。REQ-0016 対応
- REQ-0126: Validator rule: weightedTotal mismatch reject (QFAI-PROT-296) — weightedTotal !== min(l1.total, l2.total) の場合を error とする。REQ-0017 対応
- REQ-0127: Validator rule: reviewer placeholder/missing reject (QFAI-PROT-295, QFAI-PROT-309) — reviewer placeholder または missing の場合を error とする。PROT-295 はトップレベル、PROT-309 は iteration レベル。REQ-0018 対応
- REQ-0128: Validator rule: zero-seeded specCoverage reject (QFAI-PROT-305) — zero-seeded specCoverage（全 declared/checked=0）を error とする。REQ-0019 対応
- REQ-0129: Validator rule: synthetic mockPaths pass reject (QFAI-PROT-306) — mockPaths に status=pass/auto/default の synthetic エントリがある場合を error とする。REQ-0020 対応
- REQ-0130: Validator rule: calibrationRef missing/mismatch reject (QFAI-PROT-301) — calibrationRef の configPath/packPath が空の場合を error とする。REQ-0021 対応
- REQ-0131: Validator rule: reviewerLogs count mismatch (QFAI-PROT-304) — reviewerLogs.length !== iterationCount の場合を error とする。REQ-0022a 対応
- REQ-0132: Validator rule: iterations/scoringTrace count mismatch (QFAI-PROT-291 severity upgrade) — iterations.length !== iterationCount または scoringTrace.length !== iterationCount の場合を error とする（v1.7.15 で warning→error 昇格）。REQ-0022b/c 対応
- REQ-0133: Validator rule: commitSha missing reject (QFAI-PROT-297) — iteration の commitSha 欠落を error とする。REQ-0023 対応
- REQ-0134: Validator rule: limitations missing reject (QFAI-PROT-298) — fullHarness.limitations 欠落を error とする。REQ-0024 対応
- REQ-0135: Validator rules: additional full-harness integrity checks (QFAI-PROT-299, PROT-300, PROT-302, PROT-303) — status=completed + terminationReason 欠落 (PROT-299 error)、plateau + insufficient iterations (PROT-300 error)、全 iteration 同一 commitSha (PROT-302 warning)、reviewerLog summary too short (PROT-303 warning)
- REQ-0136: Validator 14 項目 error 昇格 rev2 (v1.7.15 rev2; discussion REQ-0055) — 以下の追加/昇格: discussion/screenContract/trend の evidenceRefs===0 を error 化 / declared DB 無観測を error 化 / uiFidelity completed で screen-level 不足を error 化 / iterations[].evidenceRefs 必須カテゴリ欠落を error 化 / request.l1/l2 旧 schema 由来 evidence 検出を error 化。既存ルールのうち semantic 変更分は新 rule ID に分離
- REQ-0137: Validator tests fixture rev2 改定 (v1.7.15 rev2; discussion REQ-0057) — 正常系 fixture から旧前提を削除し異常系 fixture に新ケースを追加

## Entry points

- US range in this spec: US-0004-0001..US-0004-0027
- Primary actors: QA エンジニア / AI エージェント
- Notes: `qfai validate` でスペック・コントラクト・トレーサビリティを包括検証する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
