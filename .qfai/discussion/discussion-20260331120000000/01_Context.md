# 01_Context — QFAI v1.7.11

## Product

**QFAI (Quality-First AI)** — specification-driven development の検証フレームワークおよび CLI。

開発者が TDD/SDD/ATDD のトレーサビリティチェーン (REQ → Spec → Code → Test) を維持しながら、仕様駆動開発を実践するためのツール群。CLI ベースで動作し、discussion pack 生成、仕様管理、バリデーション、テスト実行、エビデンス収集までを一貫して支援する。

## Version

**v1.7.11** — Completion / Correction / Integration Release

| Attribute     | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Release type  | Completion / Correction / Integration                   |
| Prior release | v1.7.9                                                  |
| Surface type  | non-ui (CLI tool / framework — UI-bearing sidecar 不要) |
| Branch        | `feature/v1.7.11`                                       |

## Theme

> v1.7.9 監査で未完だった実装収束の完了

v1.7 系開発で canonical 3-layer evaluation model (invariant / trend-derived / product-specific) が設計確定したが、repo の全層への統一が v1.7.9 時点で完了していない。v1.7.11 はこの収束を完遂する。

## Stakeholders

| Stakeholder            | Role                     | Interest                                                         |
| ---------------------- | ------------------------ | ---------------------------------------------------------------- |
| QFAI 開発チーム        | 実装・レビュー・リリース | 全層の canonical truth 統一、テスト・ドキュメント整合            |
| QFAI ユーザー (開発者) | CLI 利用者               | 正確な discussion 生成、テンプレート、バリデーション、エビデンス |

## Background

### Canonical 3-Layer Evaluation Model

v1.7 系開発において、以下の 3-layer evaluation model が canonical design として確定した:

1. **Invariant layer** — プロジェクト種別に依存しない普遍的な品質基準
2. **Trend-derived layer** — 業界トレンド・技術動向から導出される評価基準
3. **Product-specific layer** — 個別プロダクトの要件・制約に基づく評価基準

この 3-layer model は、discussion skill、テンプレート、バリデータ、ランタイムエビデンス、ドキュメント、テストの全層で統一的に参照されるべきアーキテクチャ上の truth である。

### v1.7.9 時点の状態

v1.7.9 で大幅に前進したが、以下の層で canonical model への完全な収束が達成されていない:

- **discussion skill** — 旧 4-axis completion model が残存
- **テンプレート** — 3-layer canonical templates への置換が未完
- **バリデータ** — canonical validator entrypoint への統合が未完
- **ランタイムエビデンス** — placeholder 残存 (actual capture 未実装)
- **ドキュメント・テスト** — v1.7.11 truth との不整合

## Core Issue

> 異なる層が異なる architectural truth を公開している

repo の各層 (discussion skill / templates / validators / runtime evidence / docs / tests) が、それぞれ異なるバージョンの truth を参照・公開している状態にある。canonical 3-layer evaluation model が設計確定しているにもかかわらず、実装レベルでの統一が不完全であり、ユーザーが受け取る成果物・バリデーション結果・エビデンスに一貫性がない。

## Surface Type

**non-ui** — QFAI は CLI ツール / フレームワークであり、UI-bearing sidecar は不要。browser QA は外部ブラウザへの操作を行うが、QFAI 自体は CLI として動作する。

## Assumptions

| ID      | Assumption                                                  | Rationale                                       |
| ------- | ----------------------------------------------------------- | ----------------------------------------------- |
| ASM-001 | 既存アーキテクチャ (canonical 3-layer model) は再議論しない | v1.7 系で設計確定済み。v1.7.11 は実装収束のみ   |
| ASM-002 | canonical design に repo truth を合わせる方針               | design → implementation の一方向フロー          |
| ASM-003 | 全 workstream は単一リリースで完了可能                      | 10 workstreams は相互依存あるが段階的に実行可能 |
| ASM-004 | 破壊的変更は最小限                                          | 既存ユーザーの workflow を壊さない範囲で収束    |
| ASM-005 | テストカバレッジは既存水準を維持または向上                  | 収束作業に伴うテスト更新は必須                  |

## Issues

### ISS-001: 4-axis completion model 残存

**問題**: qfai-discussion skill 内に旧 4-axis completion model が残存しており、canonical 3-layer model と矛盾する出力を生成する可能性がある。

**影響**: discussion pack の品質基準が canonical model と一致しない。

**対応 workstream**: A (qfai-discussion canonical completion)

### ISS-002: Canonical validator 未統合

**問題**: `validateProject()` が `runAllUixValidators` を使用しており、canonical validator entrypoint に置換されていない。

**影響**: プロダクションバリデーションが canonical model を enforce しない。

**対応 workstream**: F (Canonical validator registration)

### ISS-003: テンプレート未置換

**問題**: init / packaged assets が 3-layer canonical templates ではなく旧テンプレートを生成する。

**影響**: 新規プロジェクトが誤ったアーキテクチャで開始される。

**対応 workstream**: B (UI/UX template family replacement)

### ISS-004: Runtime placeholder 残存

**問題**: render evidence が実際のキャプチャステータスではなく placeholder を返す。browser QA orchestrator が actual phase runner を実行しない。

**影響**: エビデンスレポートが不正確。品質ゲートの信頼性が損なわれる。

**対応 workstream**: G (Render evidence actual capture), H (Browser QA orchestrator actual runner)

### ISS-005: Docs / Tests 不整合

**問題**: ドキュメント、ステアリング文書、テストが v1.7.11 の truth を反映していない。

**影響**: リリース主張とリポジトリの実態が乖離する。

**対応 workstream**: J (Docs / steering / tests normalization)
