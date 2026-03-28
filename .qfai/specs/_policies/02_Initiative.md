# 02 Initiative

## エレベーターピッチ

**QFAI** は、AI コーディングエージェント向けの品質第一開発キットである。`npx qfai init` でプロジェクトに導入し、仕様駆動開発（SDD）、受入テスト駆動開発（ATDD）、テスト駆動開発（TDD）の統合ワークフローをバリデーションゲートで強制する。50以上のルールでスペック→コントラクト→テストのトレーサビリティを検証し、CI/CD パイプラインに組み込める。

## イニシアティブ概要

| Key                | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| プロダクト名       | QFAI (Quality-First AI)                                         |
| バージョン         | v1.7.4 SDD 進行中                                               |
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

| Milestone                                | Description                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 (完了)                              | 基本バリデーション・レポート                                                                                                                                          |
| v1.3 (完了)                              | マルチツールラッパー                                                                                                                                                  |
| v1.4 (完了)                              | レイヤードスペック・ATDD トレーサビリティ                                                                                                                             |
| v1.5 (完了)                              | 統合ディスカッションパック・ポリシー命名統一                                                                                                                          |
| v1.6.0 (完了)                            | 実装フェーズ統一 — qfai-implement + test-list.md + Phase 1 Validator                                                                                                  |
| v1.6.1 (完了)                            | ガードレール強化 — Phase 2 Validator + Report Coverage + Template/Docs Update                                                                                         |
| v1.6.2 (完了)                            | 開発ツールキット堅牢化 — Sub-agent Roster + Completion/Evidence/Parallel Contracts + Docs/Wrappers/Assets Sync                                                        |
| v1.6.3 (完了)                            | Copilot レビューインストラクション配布 — qfai init にCopilotレビュー指示テンプレートを統合                                                                            |
| v1.6.4 (完了)                            | Codex サブエージェント実装 — 39 TOML エージェント + config.toml の静的配置                                                                                            |
| v1.6.5 (完了)                            | デザインディレクション＆UI品質強化 — Design Direction Pack + Navigation/Screen Flow + Render Critique Loop + Fidelity Evaluation                                      |
| v1.7.0 (進行中)                          | ディスカッション設計強化 — UI-bearing detection + DDS enforcement + competitive reference registry + error-severity structural validators                             |
| v1.7.1 (SDD 更新完了 / prototyping 待ち) | Render Evidence Automation — `qfai prototyping` に render evidence capture / skipped / failed を追加し、validate/report が structured evidence を理解できるようにする |
| v1.7.2 (SDD 更新完了)                    | Design Audit & Slop Guardrails — 静的 design audit 7 dimension + AI slop guardrails SLP-01〜SLP-06 + quality profile severity 制御                                    |
| v1.7.3 (完了)                             | Discussion/UIUX Authoring Foundation — qfai-discussion に uiux/ サイドカー（11ファイル）生成・SKILL.md UI-bearing フロー・テンプレート置換/拡張                        |
| v1.7.4 (SDD 進行中)                       | UIX-VAL/UIX-REV Validation, Review, and Migration Stabilization — UIX-VAL deterministic validators + UIX-REV semantic reviewers + verify-pack tests + migration support |

## リスク

| Risk                                 | Probability | Impact | Mitigation                                 |
| ------------------------------------ | ----------- | ------ | ------------------------------------------ |
| バリデーションルールの誤検知         | Medium      | High   | ウェイバーシステムで例外管理               |
| 新しい AI ツールへの対応遅延         | Medium      | Medium | ラッパー生成の抽象化（init コマンド）      |
| レイヤードスペック移行の互換性問題   | Low         | High   | レガシー形式のフォールバック検出           |
| DOM クローリングの不安定性           | Medium      | Low    | jsdom のバージョン固定・テスト             |
| 大規模プロジェクトでのパフォーマンス | Low         | Medium | fast-glob のストリーム処理・ファイル数制限 |
