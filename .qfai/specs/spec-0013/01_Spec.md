# 01 Spec

- Spec: spec-0013
- Parent: CAP-0013

## Consumer View

- Primary SSOT for execution: `spec-0013/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - Design Token YAML スキーマ定義（W3C DTCG 準拠、primitive → semantic → component 3 層構造）
  - HTML+CSS Visual Mock テンプレートと記法ルール（自己完結型、状態バリアント、レスポンシブバリアント）
  - Mermaid 画面遷移図テンプレート（stateDiagram-v2 / flowchart）
  - UI Contract YAML 拡張（既存 CON-UI-XXXX への Design Token 参照追加）
  - UI/UX ベストプラクティス DB 構造定義（共通層 + プラットフォーム固有層）
  - UI/UX アンチパターン DB 構造定義（ID、カテゴリ、重大度、検出方法、修正ガイダンス）
  - qfai validate への UI/UX 自動チェックルール追加
  - ui-ux-reviewer チェックリスト拡張
  - プラットフォーム検出と基準適応（Web / Windows / Mobile）
  - UI 定義消費プロトコル定義（prototyping / ATDD / TDD が 3 点セット + UI Contract を読み取る手順）
  - UI 定義整合性チェック（Design Token ↔ HTML Mock ↔ UI Contract ↔ Mermaid Flow）
  - UI/UX 調査ワークフロー定義（都度調査・更新プロトコル）
  - CLI UX ガイドライン定義
  - 専門家サブエージェント 5 体の定義（UI/UX Expert、Design Expert、Screen Transition Expert、Navigation Expert、Integrated UI/UX Reviewer）
  - Research-First Protocol 定義
  - 全フェーズ活動定義（discussion / SDD / prototyping / ATDD）

- Out:
  - Figma / Sketch 等のデザインツール直接連携
  - ビジュアルリグレッションテスト（スクリーンショット比較）
  - QFAI 自身の GUI / Web UI
  - 特定 FW / プラットフォーム限定最適化
  - リアルタイムコラボレーション

## Applicable NFR

- NFR-0001: 既存 UI Contract 後方互換性（既存 CON-UI-XXXX の 100% が新バリデーションに PASS）
- NFR-0002: プラットフォーム拡張性（新プラットフォーム追加時のコア変更行数 = 0）
- NFR-0003: ベストプラクティス/アンチパターン拡張性（新ルール追加時のエンジン変更行数 = 0）
- NFR-0004: HTML Mock 可読性（ブラウザでの表示率 100%、外部依存 0）
- NFR-0005: Design Token YAML 可読性（YAML lint PASS、コメント付き）
- NFR-0006: バリデーション速度（追加実行時間 < 2s）
- NFR-0007: WCAG 2.2 AA 準拠チェック（自動チェック可能項目のカバー率 ≥ 80%）
- NFR-0008: ドキュメント自己整合性（不整合検出率 100%）
- NFR-0009: Git フレンドリー（バイナリファイル 0）
- NFR-0010: レビュー再現性（同一入力・同一ルールセットで結果が毎回同一）
- NFR-0011: リサーチ品質（ソース明記率 100%、直近 2 年以内参照率 ≥ 80%）
- NFR-0012: 統合レビュー品質（統合レビュー項目の 100% に「サービス全体への影響」記述あり）

## Applicable Policy

- TC-01: Design Token YAML は W3C DTCG 仕様に準拠する
- TC-02: HTML+CSS Mock は自己完結型（外部ファイル参照なし）
- TC-03: Mermaid 図は ` ```mermaid ` フェンスのみ使用可能
- TC-04: 既存の jsdom v26+ 依存（DOM 解析、CSS レイアウト未サポート）
- TC-05: QFAI は Node.js / TypeScript で実装（UI/UX ルールエンジンも TypeScript）
- OC-01: QFAI は CLI ツールであり GUI を持たない
- OC-02: CI/CD 環境でのヘッドレス実行が必要
- LC-01: WCAG 2.2 AA 準拠が法的要件となるプロジェクトがある
- BC-01: v1.5.7 リリーススコープ内で完了する

## Evidence Summary

- Evidence: discussion-20260315080059347 (25 REQs, 12 NFRs, 13 resolved OQs, 10 User Stories, ~86 Example Seeds)
- All 13 OQs resolved at discussion gate
- Platform strategy: all platforms (Web / Windows / Mobile) via per-execution research
- Review strategy: auto (qfai validate) + manual (ui-ux-reviewer) hybrid confirmed
- Token storage: `.qfai/contracts/design/` (OQ-0001 Case A)
- BP/AP DB storage: per-discussion-pack, not persisted globally (OQ-0002 Case B)
- Token reference in HTML mock: CSS custom property + comment dual (OQ-0003 Case C)

## Relevant Requirements

- REQ-0001: Design Token YAML スキーマ定義
- REQ-0002: Design Token プラットフォーム属性
- REQ-0003: Design Token 参照解決
- REQ-0004: HTML+CSS Visual Mock テンプレート
- REQ-0005: HTML Mock 状態バリアント
- REQ-0006: HTML Mock レスポンシブバリアント
- REQ-0007: Mermaid 画面遷移図テンプレート
- REQ-0008: Mermaid ナビゲーション構造図
- REQ-0009: UI/UX ベストプラクティス DB 構造
- REQ-0010: UI/UX アンチパターン DB 構造
- REQ-0011: qfai validate UI ルール追加
- REQ-0012: ui-ux-reviewer チェックリスト拡張
- REQ-0013: プラットフォーム検出と基準適応
- REQ-0014: UI 定義消費プロトコル定義
- REQ-0015: UI 定義整合性チェック
- REQ-0016: UI Contract YAML 拡張
- REQ-0017: UI/UX 調査ワークフロー定義
- REQ-0018: CLI UX ガイドライン定義
- REQ-0019: UI/UX Expert サブエージェント定義
- REQ-0020: Design Expert サブエージェント定義
- REQ-0021: Screen Transition Expert サブエージェント定義
- REQ-0022: Navigation Expert サブエージェント定義
- REQ-0023: Research-First Protocol 定義
- REQ-0024: Integrated UI/UX Reviewer サブエージェント定義
- REQ-0025: 専門家サブエージェント全フェーズ活動定義
- REQ-0006-REM: Screen contract schema upgrade — route/screen identity, actor, purpose, primary tasks, required states, transitions, observable outcomes (remediation: discussion-20260329195516830)

## Entry points

- US range in this spec: US-0013-0001..US-0013-0011
- Primary actors: QFAI ユーザー（対象プロジェクト開発者）、QFAI Agent（Orchestrator）、専門家サブエージェント（5体）、下流 skill（prototyping / ATDD / TDD）
- Notes: QFAI は CLI ツールであり自身の UI は持たない。対象プロジェクトの UI/UX 定義・レビューフレームワークを提供する。

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
