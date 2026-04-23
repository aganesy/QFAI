# 02 Initiative

## エレベーターピッチ

**QFAI** は、AI コーディングエージェント向けの品質第一開発キットである。`npx qfai init` でプロジェクトに導入し、仕様駆動開発（SDD）、受入テスト駆動開発（ATDD）、テスト駆動開発（TDD）の統合ワークフローをバリデーションゲートで強制する。50以上のルールでスペック→コントラクト→テストのトレーサビリティを検証し、CI/CD パイプラインに組み込める。

## イニシアティブ概要

| Key                | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| プロダクト名       | QFAI (Quality-First AI)                                         |
| バージョン         | v1.8.0 実装進行中                                               |
| カテゴリ           | CLI ツール / 品質第一開発キット                                 |
| ターゲットユーザー | AI コーディングエージェント（Claude, GitHub Copilot, Codex 等） |
| 技術スタック       | TypeScript 5.6.3, Node.js >=18.0.0, pnpm monorepo, tsup, Vitest |
| 配布方法           | npm パッケージ（`npx qfai init` でプロジェクト初期化）          |
| ライセンス         | MIT                                                             |

## 優先順位

| Priority | Item                    | Rationale                          |
| -------- | ----------------------- | ---------------------------------- |
| 1        | 正確性（Correctness）   | 誤検知は信頼を損なうため最優先     |
| 2        | 網羅性（Completeness）  | トレーサビリティの穴は品質リスク   |
| 3        | 使いやすさ（Usability） | CLI の学習コストは低く保つ         |
| 4        | パフォーマンス          | 大規模プロジェクトでも実用的な速度 |
| 5        | 拡張性                  | プラグイン機構より安定性を優先     |

## マイルストーン

- 注記: この表は initiative 履歴を保持するため、旧 `qfai prototyping` / runtime / full-harness / sidecar-first wording を含みうる。
- 注記: それらは current public contract ではない。active execution contract は spec-0012 / spec-0013 / spec-0014 / `_policies/04_Business-Flow.md` / `_policies/05_Contracts.md` を優先する。
- 注記: downstream skill の current truth source は `specs + .qfai/contracts/**` であり、discussion direct-read や removed runtime surface は superseded である。

| Milestone                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 (完了)                              | 基本バリデーション・レポート                                                                                                                                                                                                                                                                                                                                                                                                                    |
| v1.3 (完了)                              | マルチツールラッパー                                                                                                                                                                                                                                                                                                                                                                                                                            |
| v1.4 (完了)                              | レイヤードスペック・ATDD トレーサビリティ                                                                                                                                                                                                                                                                                                                                                                                                       |
| v1.5 (完了)                              | 統合ディスカッションパック・ポリシー命名統一                                                                                                                                                                                                                                                                                                                                                                                                    |
| v1.6.0 (完了)                            | 実装フェーズ統一 — qfai-implement + test-list.md + Phase 1 Validator                                                                                                                                                                                                                                                                                                                                                                            |
| v1.6.1 (完了)                            | ガードレール強化 — Phase 2 Validator + Report Coverage + Template/Docs Update                                                                                                                                                                                                                                                                                                                                                                   |
| v1.6.2 (完了)                            | 開発ツールキット堅牢化 — Sub-agent Roster + Completion/Evidence/Parallel Contracts + Docs/Wrappers/Assets Sync                                                                                                                                                                                                                                                                                                                                  |
| v1.6.3 (完了)                            | Copilot レビューインストラクション配布 — qfai init にCopilotレビュー指示テンプレートを統合                                                                                                                                                                                                                                                                                                                                                      |
| v1.6.4 (完了)                            | Codex サブエージェント実装 — 39 TOML エージェント + config.toml の静的配置                                                                                                                                                                                                                                                                                                                                                                      |
| v1.6.5 (完了)                            | デザインディレクション＆UI品質強化 — Design Direction Pack + Navigation/Screen Flow + Render Critique Loop + Fidelity Evaluation                                                                                                                                                                                                                                                                                                                |
| v1.7.0 (進行中)                          | ディスカッション設計強化 — UI-bearing detection + DDS enforcement + competitive reference registry + error-severity structural validators                                                                                                                                                                                                                                                                                                       |
| v1.7.1 (SDD 更新完了 / prototyping 待ち) | Render Evidence Automation — `qfai prototyping` に render evidence capture / skipped / failed を追加し、validate/report が structured evidence を理解できるようにする                                                                                                                                                                                                                                                                           |
| v1.7.2 (SDD 更新完了)                    | Design Audit & Slop Guardrails — 静的 design audit 7 dimension + AI slop guardrails SLP-01〜SLP-06 + quality profile severity 制御                                                                                                                                                                                                                                                                                                              |
| v1.7.3 (完了)                            | Discussion/UIUX Authoring Foundation — qfai-discussion に uiux/ サイドカー（11ファイル）生成・SKILL.md UI-bearing フロー・テンプレート置換/拡張                                                                                                                                                                                                                                                                                                 |
| v1.7.4 (SDD 完了)                        | UIX-VAL/UIX-REV Validation, Review, and Migration Stabilization — UIX-VAL deterministic validators + UIX-REV semantic reviewers + verify-pack tests + migration support                                                                                                                                                                                                                                                                         |
| v1.7.5 (完了)                            | Runtime & Evidence Foundation — prototyping static-first default recovery + optional render evidence capture + backend provider abstraction + browser QA structured outputs                                                                                                                                                                                                                                                                     |
| v1.7.6 (完了)                            | Critique, Calibration & Full-Harness Expansion — External Critique Adapter + Calibration Pack + Full-Harness Premium Mode + Observability/Capability Profile + Handoff & Display/Stub Detection                                                                                                                                                                                                                                                 |
| v1.7.7 (完了)                            | Remediation & Prototyping Readiness — static-first prototyping default + full-harness entrypoint + 3-layer eval reconciliation + strategy/contract upgrade + UI-bearing detection fix + render evidence wiring + browser QA findings + mode exposure + doc normalization + migration support                                                                                                                                                    |
| v1.7.8 (SDD 進行中)                      | Canonical Convergence — design taste interview + trend research + 3-layer evaluation convergence + scoring-ready schema + strategy/screen contract upgrade + UI-bearing detection unification + static-first prototyping rewrite + full-harness entrypoint + render evidence wiring + browser QA MVP + reviewer extension + migration normalization + docs normalization                                                                        |
| v1.7.9 (完了)                            | Convergence Correction Release — validation truth path, discussion completion convergence, prototyping mode/public contract alignment, honest render evidence/browser QA reporting, reviewer/docs normalization                                                                                                                                                                                                                                 |
| v1.7.11 (SDD 進行中)                     | Completion / Correction / Integration Release — 全 surface (discussion / templates / validators / runtime / docs / tests) を canonical 3-layer evaluation model に収束。10 workstreams: discussion canonical (A), template replacement (B), sources schema (C), strategy strong schema (D), contracts strong schema (E), validator truth-path (F), render evidence (G), browser QA (H), prototyping contracts (I), docs/tests normalization (J) |
| v1.7.13 (SDD 進行中)                     | Canonical Sidecar Convergence — canonical/legacy validator separation, prototyping module (mode.ts, recommendationArtifact.ts), prototyping.yaml required side artifact, existence-based precedence, report prototyping observability, config prototyping.calibration, DDS→sidecar-first validator rewrite                                                                                                                                      |
| v1.7.15 (SDD 進行中)                     | packages/qfai single-PR completion — runtime truthfulness hardening: panel scoring from real evidence, converged>=2 iterations, reviewer/commitSha mandatory, specCoverage from real diffs, uiFidelity observation-only, CalibrationLoader wired, fail-fast on missing evidence, docs/SKILL/README reality sync                                                                                                                                 |
| v1.7.17 (SDD 進行中)                     | Design Guideline Traceability Hardening — `/qfai-discussion` に design guideline research 必須化、`04_Sources.md` canonical category 拡張、TRD `score_anchors` quantitative proxy 要求、`qfai validate` に warning-first validator 追加                                                                                                                                                                                                         |
| v1.7.18 (SDD 進行中)                     | Skill-First Prototyping Convergence — `/qfai-prototyping` を唯一の public interface に固定し、機械ゲートを `qfai validate` / `/qfai-verify` に移管。declared screen ごとに screenshot + HTML snapshot を mandatory evidence とし、旧 CLI/runtime/mode posture を superseded history に明示整理                                                                                                                                                  |
| v1.8.0 (実装進行中)                      | Web Research Enhancement — CLI エージェントの Web リサーチ強化（標準パイプライン・MCP 統合・セキュリティ・評価・HITL）                                                                                                                                                                                                                                                                                                                          |
| v1.8.1 (SDD 進行中)                      | Prototyping Evidence Model Sync — discussion/preflight の prototyping side artifact requiredness を撤廃し、full-harness evidence を reviewerScores/allItemsPass95 + snapshot scoringTrace + iterationBudget に再同期                                                                                                                                                                                                                            |

## Historical Appendix: v1.7.15 Initiative — packages/qfai single-PR completion

- この節は historical implementation notes であり、current contract を上書きしない。

Source: SRC-0001 — QFAI v1.7.15 継続開発設計書

| WS   | Workstream                                 | Summary                                                                                                                                                                                                                                                                                                         | Discussion REQs |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| WS-1 | runFullHarness 契約改定                    | request 型から pre-scored l1/l2 を削除。scoring は runtime 内で一元実行。FullHarnessIteration / MeasurementResult を evidence-driven に再定義。evidenceRefs 8 カテゴリ必須化。validatePanelInputs 強化                                                                                                          | REQ-0027〜0032  |
| WS-2 | l2Evidence 実体化                          | l2Evidence.ts 新設。buildDiscussionAxisInputs / buildScreenContractInputs / buildTrendAlignmentInputs で実 artifact から導出。execution.ts の L2 dummy object 全廃。panelScore 二重防御                                                                                                                         | REQ-0033〜0037  |
| WS-3 | CalibrationLoader fail-closed 化           | CalibrationLoader fail-open 全廃（pack不在/YAML不正/version欠落/thresholds欠落で throw）。DEFAULT_PACK fallback 削除。config 側 fallback 弱体化。TerminationContext を CalibrationPack で受ける                                                                                                                 | REQ-0038〜0040  |
| WS-4 | Termination semantics 真正化               | count<plateauLookback で terminal にしない。validator termination 条件を runtime と同期                                                                                                                                                                                                                         | REQ-0041〜0042  |
| WS-5 | specCoverage 実測化                        | 全 spec 必須化。silent 空返却禁止。DB coverage 二択ポリシー（実観測 or failure）                                                                                                                                                                                                                                | REQ-0043〜0045  |
| WS-6 | UiObservation screen-level 再構築          | ScreenObservation 型導入。actionsWired を browser QA 由来に変更。mockPath findings semantics 同期。uiFidelityBuilder screen-level 化。insufficient-evidence 厳格化。auto-pass 完全廃止                                                                                                                          | REQ-0046〜0051  |
| WS-7 | reviewerLog / history / bundleWriter 整合  | reviewerLog に 8 カテゴリ evidenceRefs 保存。history 整合性 strict（4 配列長一致）。bundleWriter schema v2 追随                                                                                                                                                                                                 | REQ-0052〜0054  |
| WS-8 | Validator 14 項目 error 昇格               | prototypingEvidence.ts の 14 項目を error に昇格。packVersion hardcoded / calibrationRef 欠落 / count<plateauLookback / weightedTotal mismatch / evidenceRefs 欠落 / specCoverage fallback / DB 無観測 / uiFidelity 不足 / mockPaths.pass 無 QA / reviewerLogs length / iteration evidenceRefs / 旧 schema 検出 | REQ-0055        |
| WS-9 | Docs / SKILL / README / tests reality sync | docs 主張と runtime failure conditions の 1:1 対応保証。旧 fixture を異常系に移動/削除                                                                                                                                                                                                                          | REQ-0056〜0057  |

## リスク

| Risk                                 | Probability | Impact | Mitigation                                 |
| ------------------------------------ | ----------- | ------ | ------------------------------------------ |
| バリデーションルールの誤検知         | Medium      | High   | ウェイバーシステムで例外管理               |
| 新しい AI ツールへの対応遅延         | Medium      | Medium | ラッパー生成の抽象化（init コマンド）      |
| レイヤードスペック移行の互換性問題   | Low         | High   | レガシー形式のフォールバック検出           |
| DOM クローリングの不安定性           | Medium      | Low    | jsdom のバージョン固定・テスト             |
| 大規模プロジェクトでのパフォーマンス | Low         | Medium | fast-glob のストリーム処理・ファイル数制限 |

### Historical Appendix: v1.7.15 rev4 — Single-PR Completion (5 Audit Issues)

- この節は audit remediation 履歴であり、current public prototyping/runtime contract を定義しない。

**Discussion Pack**: `discussion-20260414195449523`
**Classification**: non-ui

v1.7.15-04 監査レポートで検出された 5 件の残留齟齬を 1 PR で是正する。

| WS   | Title                                     | Description                                                                                                                                                                                  | REQs           |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| WS-1 | full-harness mode/surface 契約厳格化      | `derivePrototypingObligations()` / `runFullHarness()` / CLI / バリデータの 4 層で cli + full-harness を拒否。UI-bearing surface 判定を web/mobile/desktop/mixed に限定                       | REQ-0001〜0005 |
| WS-2 | render/Browser QA ターゲット画面契約準拠  | `"/primary"` ハードコード除去。`40_screen_contracts.md` パーサー (`screenContracts.ts`) 新設。各スクリーンに対して個別のフィデリティ測定ターゲットと個別エビデンスを生成                     | REQ-0006〜0011 |
| WS-3 | Browser QA エビデンスチェーン完全性       | `iterations[].evidenceRefs.browserQa` にフェーズ参照・ファインディング参照を格納。空の場合ハードフェイル。`uiObservation.ts` で収集、`runtime.ts` でイテレーション記録に格納                 | REQ-0012〜0016 |
| WS-4 | runtimeGate/specCoverage 正規ルート意味論 | `specCoverage.ts` / `runtimeGateBuilder.ts` で canonical path 比較。URL をルートとして扱わない。画面契約のルートに対応するオブザベーションがない場合は `missing_observation` としてレポート  | REQ-0017〜0021 |
| WS-5 | L2 エビデンス構造化パース優先             | 正規アーティファクト（20-23 系、`04_Sources.md`、`40_screen_contracts.md`）を必須とし構造化パースを優先。ヒューリスティックフォールバックは構造化ソース不在時のみ                            | REQ-0022〜0027 |
| WS-6 | validator/docs/tests 陳腐化整理           | `prototypingEvidence.ts` 陳腐化 remediation 除去。テストの `skip` → `reject` 変換。URL-as-route 期待値を canonical route に変換。`"/primary"` 参照除去。README/SKILL.md/evidence README 更新 | REQ-0028〜0033 |

#### 実装順序

Step 1 (WS-2 基盤: 契約ソース確立) → Step 2 (WS-2: 画面レベルターゲット) → Step 3 (WS-3: Browser QA エビデンス) → Step 4 (WS-4: ルート/カバレッジ) → Step 5 (WS-5: L2 構造化パース) → Step 6 (WS-6: Docs/Tests 整理)。WS-1 は独立で並行可能。
