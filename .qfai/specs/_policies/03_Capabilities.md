# 03 Capabilities

## Capability order rule

- Capabilities are listed in execution order.
- Spec directories are generated from this order (`spec-0001`, `spec-0002`, ...).
- Keep IDs stable once published.

## CAP Catalog

| CAP ID   | Statement (what)                                                                       | Success metrics (optional)                                                                                                                                | Notes (optional)                         |
| -------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| CAP-0001 | プロジェクト初期化 (qfai init)                                                         | .qfai/ 構造・ラッパー・設定が正常に生成される                                                                                                             | ワークスペースの初期セットアップ         |
| CAP-0002 | スペックバリデーション (qfai validate)                                                 | 50以上のルールで全検証パス、exit code 制御が正確                                                                                                          | コアバリデーション機能                   |
| CAP-0003 | レポート生成 (qfai report)                                                             | Markdown/JSON 形式でレポートが正確に出力される                                                                                                            | バリデーション結果の可視化               |
| CAP-0004 | 診断ツール (qfai doctor)                                                               | 設定・構造の問題を正確に検出・報告する                                                                                                                    | バリデーション前の事前診断               |
| CAP-0005 | ガードレール抽出 (qfai guardrails)                                                     | ガードレール一覧・フィルタ・整合性チェックが動作する                                                                                                      | ドリフト防止のための意思決定ガードレール |
| CAP-0006 | プロトタイピング検証 (qfai prototyping)                                                | UI フィデリティ自動生成・検証が正確に動作する                                                                                                             | DOM クローリングによる UI 整合性検証     |
| CAP-0007 | Skill Orchestration                                                                    | 9 Skill のカタログ・依存関係・完了契約・Evidence 要件が spec で定義される                                                                                 | フレームワーク設計仕様                   |
| CAP-0008 | Agent Delegation                                                                       | 39 エージェントのカタログ・標準契約・Orchestrator Protocol・Work Orders が spec で定義される                                                              | フレームワーク設計仕様                   |
| CAP-0009 | Traceability & Spec Architecture                                                       | トレーサビリティ連鎖・Layered Spec Architecture・参照方向ルール・Escalation Hook・Drift Protocol が spec で定義される                                     | フレームワーク設計仕様                   |
| CAP-0010 | Steering & Governance                                                                  | Steering/Instructions 文書構造・Review Roster & RCP・Constitution・Canonical Workflow Stages が spec で定義される                                         | フレームワーク設計仕様                   |
| CAP-0011 | Spec Diff Protocol (SDP) - インクリメンタル実行                                        | 下流スキルが spec 差分を自動検出し、`changed_specs` のみをインクリメンタルに処理する                                                                      | SKILL.md プロンプト改修による機能追加    |
| CAP-0012 | レビューエージェント拡張（全否定＋パターン倍増）                                       | review-roster.yml に12名全員登録、全9スキル統合、qfai validate パス                                                                                       | v1.5.6 新機能                            |
| CAP-0013 | UI/UX 定義・レビュー体系                                                               | Design Token + HTML Mock + Mermaid Flow の 3 点セットで UI 定義を保持し、ベストプラクティス/アンチパターンに基づく自動+手動ハイブリッドレビューを実現する | v1.5.7 新機能                            |
| CAP-0014 | 実装フェーズ統一 (qfai-implement)                                                      | 旧3TDDスキル廃止、単一qfai-implement導入、test-list.md実行台帳、Phase 1バリデータが全て動作する                                                           | v1.6.0 新機能                            |
| CAP-0015 | ガードレール強化 (Guardrail Hardening)                                                 | test-list.md Phase 2 バリデータ（5新規エラーチェック）、レポート coverage 可視化、テンプレ/ドキュメント更新が全て動作する                                 | v1.6.1 新機能                            |
| CAP-0016 | 開発ツールキット堅牢化 (Development Toolkit Hardening)                                 | サブエージェントロスター形式化、完了/エビデンス/並列コントラクト、ドキュメント/ラッパー/アセットテスト同期が全て動作する                                  | v1.6.2 新機能                            |
| CAP-0017 | Copilot レビューインストラクション配布 (Copilot Review Instructions)                   | qfai init が .github/instructions/ に汎用コードレビュー指示を配置、既存ファイル保護                                                                       | v1.6.3 新機能                            |
| CAP-0018 | Codex サブエージェント実装 (Codex Sub-Agent TOML Support)                              | 39 TOML エージェント + config.toml が正常に生成・パースされる                                                                                             | Unreleased                               |
| CAP-0019 | Design Direction Pack（デザインディレクションパック）                                  | UI 仕様に DDP（ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層）が必須入力として定義される                             | v1.6.5 新機能                            |
| CAP-0020 | ナビゲーション＆スクリーンフロー設計                                                   | 画面遷移・ナビゲーション・エラーリカバリーフローが Mermaid SSOT として定義される                                                                          | v1.6.5 新機能                            |
| CAP-0021 | レンダークリティークループ                                                             | 初回レンダー→デスクトップ/モバイル批評→反復改善のループが必須プロセスとして定義される                                                                     | v1.6.5 新機能                            |
| CAP-0022 | デザインフィデリティ評価                                                               | 階層・明確性・アクセシビリティ・レスポンシブのスコアカードが必須レビューとして定義される                                                                  | v1.6.5 新機能                            |
| CAP-0023 | ディスカッション設計強化 (Discussion Design Hardening)                                 | UI-bearing packs にDDS必須化・新構造バリデータ7本（QFAI-DDP-019..025）がエラー出力される                                                                  | v1.7.0 新機能                            |
| CAP-0024 | レンダー証跡自動化 (Render Evidence Automation)                                        | `qfai prototyping` が screenshot / HTML snapshot を構造化証跡として収集し、captured / skipped / failed を検証できる                                       | v1.7.1 新機能                            |
| CAP-0025 | Design Audit & Slop Guardrails（設計監査・AI slop ガードレール）                       | 静的 design audit 7 dimension + slop guardrails SLP-01〜SLP-06 が validate でエラー/警告出力される                                                        | v1.7.2 新機能                            |
| CAP-0026 | Discussion/UIUX Authoring Foundation（ディスカッション UIUX オーサリング基盤）         | qfai-discussion に uiux/ サイドカー（11ファイル）生成・SKILL.md UI-bearing フロー・テンプレート置換/拡張が動作する                                        | v1.7.3 新機能                            |
| CAP-0027 | UIX-VAL/UIX-REV バリデーション・レビュー・マイグレーション安定化                       | UIX-VAL deterministic validators + UIX-REV semantic reviewers + verify-pack tests + migration support が全て動作する                                      | v1.7.4 新機能                            |
| CAP-0028 | Runtime & Evidence Foundation（ランタイム＆エビデンス基盤）                            | prototyping static-first default recovery、optional render evidence capture、backend provider abstraction、browser QA structured outputs が全て動作する   | v1.7.5 新機能                            |
| CAP-0029 | External Critique Adapter（外部批評アダプター）                                        | critique provider interface が fail-open で動作し、構造化批評を返す                                                                                       | v1.7.6 新機能                            |
| CAP-0030 | Harness Contracts & Calibration Pack（ハーネスコントラクト＆キャリブレーションパック） | calibration assets がスコアリング整合性を保証し、accept/refine/pivot ポリシーが動作する                                                                   | v1.7.6 新機能                            |
| CAP-0031 | Full-Harness Premium Mode（フルハーネスプレミアムモード）                              | `/qfai-prototyping-full-harness` が 5-15 反復ループで planner/generator/evaluator 分離により高品質出力を生成する                                          | v1.7.6 新機能                            |
| CAP-0032 | Observability & Capability Profile（オブザーバビリティ＆キャパビリティプロファイル）   | premium run のコスト/時間メトリクスが 100% emit され、モード選択ガイダンスが動作する                                                                      | v1.7.6 新機能                            |
| CAP-0033 | Handoff & Display/Stub Detection（ハンドオフ＆ディスプレイ/スタブ検出）                | long-running handoff artifacts が resumable で、display-only/stub-only 実装が検出・フラグされる                                                           | v1.7.6 新機能                            |
| CAP-0034 | ディスカッション正規アーキテクチャ収束 (Discussion Canonical Architecture Convergence) | design taste interview, trend scan, 3-layer evaluation, scoring-ready schema, strategy/screen contract upgrade が全て canonical model に収束              | v1.7.8 新機能                            |
| CAP-0035 | プロトタイピングワークフロー正規化 (Prototyping Workflow Canonicalization)             | UI-bearing detection unification, prototyping static-first rewrite, full-harness dual entrypoint が動作                                                   | v1.7.8 新機能                            |
| CAP-0036 | 基盤実装完了 (Foundation Implementation Completion)                                    | render evidence CLI wiring, browser QA smoke+visual MVP が real findings を返す                                                                           | v1.7.8 新機能                            |
| CAP-0037 | SSOT 統一・マイグレーション (SSOT Unification & Migration)                             | reviewer taste/trend templates, migration 3-stage normalization, docs maturity vocabulary 統一, non-UI safety 保証                                        | v1.7.8 新機能                            |
| CAP-0038 | Spec Auto-Discovery Protocol + Traceability Integrity Validator — 4ソース統合差分検出による対象spec自動特定とspec-実装整合性検証 | 差分検出の偽陰性ゼロ, validate gate統合, 全エージェント対応 | spec-0011の範囲外（TypeScript実装/validate拡張/トレーサビリティ検証） |

## Authoring rules

- This file is the policy-layer SSOT for capability mapping across all specs.
- Do not copy spec-level details (US/AC/BR/EX/TC) into this file.
