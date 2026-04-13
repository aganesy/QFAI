# 02 Initiative

## エレベーターピッチ

**QFAI** は、AI コーディングエージェント向けの品質第一開発キットである。`npx qfai init` でプロジェクトに導入し、仕様駆動開発（SDD）、受入テスト駆動開発（ATDD）、テスト駆動開発（TDD）の統合ワークフローをバリデーションゲートで強制する。50以上のルールでスペック→コントラクト→テストのトレーサビリティを検証し、CI/CD パイプラインに組み込める。

## イニシアティブ概要

| Key                | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| プロダクト名       | QFAI (Quality-First AI)                                         |
| バージョン         | v1.7.13 Canonical Sidecar Convergence SDD 進行中                |
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
| v1.7.15 (SDD 進行中)                     | packages/qfai single-PR completion — runtime truthfulness hardening: panel scoring from real evidence, converged>=2 iterations, reviewer/commitSha mandatory, specCoverage from real diffs, uiFidelity observation-only, CalibrationLoader wired, fail-fast on missing evidence, docs/SKILL/README reality sync                                                                                                                               |

## v1.7.15 Initiative — packages/qfai single-PR completion

Source: SRC-0001 — QFAI v1.7.15 継続開発設計書

| WS | Workstream | Summary |
|---|---|---|
| WS-1 | Full-harness scoring 実体化 | scoreL1/scoreL2 を実 evidence から算出。weightedTotal = min(L1, L2)。固定値生成禁止 |
| WS-2 | History / convergence / reviewer log 真正化 | converged requires iterationCount>=2, reviewerLogs append-only, reviewer CLI mandatory |
| WS-3 | Spec coverage 実測化 | specCoverage を宣言/実測差分から導出。zero-seeded 禁止 |
| WS-4 | uiFidelity observation-only 化 | DOM parse + browserQa + render evidence のみ。synthetic mockPaths pass 禁止。extractHtmlLabelsFromString 空実装廃止 |
| WS-5 | Calibration wiring 本接続 | CalibrationLoader を execution.ts に接続。packVersion を pack metadata から解決 |
| WS-6 | Validator hardening 完遂 | prototypingEvidence.ts に reviewer/commitSha/specCoverage/mockPaths/calibrationRef/array length validator rules 追加 |
| WS-7 | Docs / SKILL / README reality sync | docs 主張と runtime failure conditions の 1:1 対応を保証 |

## リスク

| Risk                                 | Probability | Impact | Mitigation                                 |
| ------------------------------------ | ----------- | ------ | ------------------------------------------ |
| バリデーションルールの誤検知         | Medium      | High   | ウェイバーシステムで例外管理               |
| 新しい AI ツールへの対応遅延         | Medium      | Medium | ラッパー生成の抽象化（init コマンド）      |
| レイヤードスペック移行の互換性問題   | Low         | High   | レガシー形式のフォールバック検出           |
| DOM クローリングの不安定性           | Medium      | Low    | jsdom のバージョン固定・テスト             |
| 大規模プロジェクトでのパフォーマンス | Low         | Medium | fast-glob のストリーム処理・ファイル数制限 |
