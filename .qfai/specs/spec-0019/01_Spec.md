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

## Applicable Policy

- DR-0031: DDP 必須化（テーマ・ムード・テイスト・CTA 階層の強制入力）
- DR-0032: 汎用パターン禁止（量産型カードグリッド等をレビュー FAIL 対象）
- DR-0034: 破壊的変更エンベロープ（v1.6.5 は内部アーティファクトに限定）

## Evidence Summary

- Evidence: discussion-20260324054332396（12 REQ, 8 NFR, 4 User Stories, ~24 Example Seeds）
- Source User Story: US-0019-0001（Design Direction Pack）
- 関連 REQ: REQ-0001（DDP 必須化）, REQ-0002（テーマフィールド明示化）, REQ-0003（CTA 階層）, REQ-0006（汎用パターン禁止）, REQ-0010（ツール非依存）
- 関連 NFR: NFR-0001（方向性完全性 100%）, NFR-0002（トレーサビリティ 100%）, NFR-0005（ジェネリックパターン拒否）, NFR-0006（エージェント可搬性）
- discussion delta で Figma 必須化を Rejected、ジェネリック SaaS カードグリッドデフォルトを Rejected

## Relevant Requirements

- REQ-0001: Design Direction Pack mandatory — UI-bearing discussion/spec は DDP を必須とする
- REQ-0002: Theme fields explicitness — DDP は theme, mood, taste, material, energy, visual anchor を記録する
- REQ-0003: CTA hierarchy definition — primary / secondary / tertiary CTA の階層を定義する
- REQ-0006: Banned generic patterns — ジェネリックパターンを禁止パターンとして定義する
- REQ-0010: Tool independence — Figma 非依存、3 ターゲットで自己完結する

## Entry points

- US range in this spec: US-0019-0001..US-0019-0004
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
