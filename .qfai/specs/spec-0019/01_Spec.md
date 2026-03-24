# 01 Spec

- Spec: spec-0019
- Parent: CAP-0019

## Consumer View

- Primary SSOT for execution: `spec-0019/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - Design Direction Pack（DDP）フィールド定義（ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層）
  - DDP 必須チェック（UI-bearing artifact は DDP を必須入力とする）
  - テーマフィールド 6 項目定義（theme, mood, taste, material, energy, visual anchor）
  - CTA 階層 3 段階定義（primary / secondary / tertiary）
  - 禁止ジェネリックパターンリスト定義（量産型カードグリッド、弱いヒーロー、無意味なグラデーション、過剰アクセント）
  - DDP テンプレート（discussion-pack / spec-pack 用）
  - DDP バリデーションルール（qfai validate 拡張）
  - SKILL.md 更新（DDP 読み取り順序の下流 skill への反映）
  - ツール非依存設計（Claude Code / Codex / GitHub Copilot で Figma 非依存）
  - research_summary → contracts/design/*.yaml 変換プロセス定義（REQ-0013）
  - Story Workshop ハイフィデリティテンプレート（リスト画面・フォーム画面の 2 種）定義（REQ-0014）
  - UI コントラクト experience spec フィールド拡張（purpose, primary_user_task, primary_cta 等）（REQ-0015）
  - アンチパターン自動検出バリデーター（7 種ルールセット）（REQ-0018）
  - qfai.config.yaml uiux ポリシーセクション定義（REQ-0019）
  - 主要スクリーン複数オプション比較必須化（REQ-0020）
  - 競合参照 UI 必須化（3 件以上、adopt/reject/translation_policy 付き）（REQ-0021）

- Out:
  - Figma / Sketch 等のデザインツール統合
  - ビジュアルリグレッションテスト（VRT）自動化
  - ナビゲーション・スクリーンフロー設計（CAP-0020 で管理）
  - レンダークリティークループ（CAP-0021 で管理）
  - デザインフィデリティスコアカード（CAP-0022 で管理）

## Applicable NFR

- NFR-0001: 方向性完全性 — UI-bearing artifact の DDP 必須項目充足率 100%
- NFR-0002: トレーサビリティ — theme → mock → flow → review scorecard の追跡率 100%
- NFR-0005: ジェネリックパターン拒否 — 禁止ジェネリックパターン違反 0
- NFR-0006: エージェント可搬性 — Claude Code / Codex / GitHub Copilot の 3 ターゲットでハード依存 0
- NFR-0009: Research-to-Constraint トレーサビリティ — research_summary → contracts/design ルール変換率 100%（requireResearchSummary=true 時）
- NFR-0010: テンプレート完全性 — Story Workshop リスト/フォームテンプレート必須フィールド充足率 100%
- NFR-0011: アンチパターン検出率 — 7 種アンチパターンの自動検出カバレッジ 100%
- NFR-0012: Config ポリシー適用率 — qfai.config.yaml uiux 設定の反映率 100%
- NFR-0013: 設計判断品質 — 主要スクリーンの複数オプション比較充足率 100%、competitive_references 3 件以上充足率 100%

## Applicable Policy

- DR-0031: DDP 必須化（テーマ・ムード・テイスト・CTA 階層の強制入力）
- DR-0032: 汎用パターン禁止（量産型カードグリッド等をレビュー FAIL 対象）
- DR-0034: 破壊的変更エンベロープ（v1.6.5 は内部アーティファクトに限定）

## Evidence Summary

- Evidence: discussion-20260324054332396（12 REQ, 8 NFR, 4 User Stories, ~24 Example Seeds）
- Evidence: discussion-20260324090005338（ChatGPT analysis integration: REQ-0013/0014/0015/0018/0019/0020/0021 追加）
- Source User Story: US-0019-0001（Design Direction Pack）
- 関連 REQ: REQ-0001（DDP 必須化）, REQ-0002（テーマフィールド明示化）, REQ-0003（CTA 階層）, REQ-0006（汎用パターン禁止）, REQ-0010（ツール非依存）, REQ-0013（Research-to-Constraint 変換必須）, REQ-0014（ハイフィデリティ Story Workshop テンプレート）, REQ-0015（UI コントラクト experience spec 拡張）, REQ-0018（アンチパターン検出バリデーター）, REQ-0019（qfai.config.yaml uiux ポリシー）, REQ-0020（複数オプション比較必須）, REQ-0021（競合参照 UI 必須）
- 関連 NFR: NFR-0001（方向性完全性 100%）, NFR-0002（トレーサビリティ 100%）, NFR-0005（ジェネリックパターン拒否）, NFR-0006（エージェント可搬性）, NFR-0009（Research-to-Constraint トレーサビリティ）, NFR-0010（テンプレート完全性）, NFR-0011（アンチパターン検出率）, NFR-0012（Config ポリシー適用率）, NFR-0013（設計判断品質）
- discussion delta で Figma 必須化を Rejected、ジェネリック SaaS カードグリッドデフォルトを Rejected

## Relevant Requirements

- REQ-0001: Design Direction Pack mandatory — UI-bearing discussion/spec は DDP を必須とする
- REQ-0002: Theme fields explicitness — DDP は theme, mood, taste, material, energy, visual anchor を記録する
- REQ-0003: CTA hierarchy definition — primary / secondary / tertiary CTA の階層を定義する
- REQ-0006: Banned generic patterns — ジェネリックパターンを禁止パターンとして定義する
- REQ-0010: Tool independence — Figma 非依存、3 ターゲットで自己完結する
- REQ-0013: Research-to-Constraint conversion mandatory — discussion research_summary は contracts/design/*.yaml BP/AP ルールに変換される
- REQ-0014: High-fidelity Story Workshop template — リスト画面テンプレート（ページ目的・CTA・検索/フィルター/ソート・4 状態・デスクトップ/モバイル・行クリック・密度根拠）+ フォームテンプレート（主タスク・入力グルーピング・バリデーションタイミング・必須/任意/破壊的・4 状態・送信後遷移）
- REQ-0015: UI Contract experience spec expansion — purpose, primary_user_task, primary_cta, secondary_ctas, information_priority, states, max_primary_steps, anti_patterns, design_principles フィールドを追加
- REQ-0018: Anti-pattern detection validator — dual primary CTA・過剰必須フィールド・アクションなし空状態・リカバリなしエラー・4 クリック超主フロー・プレースホルダー/Lorem ipsum・ボタンバリアント増殖の 7 種を自動検出
- REQ-0019: qfai.config.yaml uiux policy — platform・qualityProfile・requireResearchSummary 等のオプショナルセクション
- REQ-0020: Multiple option comparison mandatory — 主要スクリーンは pros/cons/target behavior/avoided anti-patterns 付き 2 オプション以上の比較を必須とする
- REQ-0021: Competitive/reference UI mandatory — 3 件以上の参照（採用/拒否/翻訳方針付き）を必須とする

## Entry points

- US range in this spec: US-0019-0001..US-0019-0010
- Primary actors: AI エージェント開発者、QA エンジニア、QFAI Agent（Orchestrator）、下流 skill（prototyping / implement）
- Notes: DDP は UI 実装に先立ちテーマ・方向性を確定する上流成果物。spec-0013（UI/UX 定義体系）の Design Token / HTML Mock / Mermaid Flow に先行して定義される。

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: 複数の有効な実装が存在する場合
- Conflict: NFR / Policy / AC が矛盾する場合
- Missing: 必須の制約やポリシーが不明確な場合
- Trade-off: 美的品質 vs 客観的検証性 のバランスが必要な場合

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md（DR-0031, DR-0032, DR-0034, DR-0035）
