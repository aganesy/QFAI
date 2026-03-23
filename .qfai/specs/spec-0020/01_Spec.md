# 01 Spec

## Metadata

| Key    | Value                                          |
| ------ | ---------------------------------------------- |
| Spec   | spec-0020                                      |
| Parent | CAP-0020                                       |
| Title  | ナビゲーション＆スクリーンフロー設計           |
| Status | draft                                          |

## Summary

画面遷移・ナビゲーション構造・エラーリカバリーフローを Mermaid SSOT として定義する。UI-bearing spec における全遷移パスを flowchart / sequenceDiagram 形式で記録し、CTA 駆動の導線設計、エラー発生時のリカバリーパス（戻り先・再試行・フォールバック）、ディープリンク対応、デスクトップ／モバイル両ビューポートでの遷移整合性を保証する。

## Applicable NFR / Policy / Evidence Summary

- NFR-0002: トレーサビリティ 100% — theme → mock → flow → review scorecard の追跡率 100%
- NFR-0003: レスポンシブ — representative desktop/mobile viewport で major layout break 0
- NFR-0004: コア a11y ベースライン — contrast, keyboard path, focus visibility の必須項目 PASS
- POL-01: UI-bearing feature は Design Direction Pack なしに次工程へ進めない
- POL-03: rendered UI review を実施し、コード読解のみで完了扱いにしない
- POL-04: aesthetic と usability を分離せず scorecard で同時評価する
- POL-07: 外部デザインツール利用は任意。QFAI の core flow は 3 ターゲットで自己完結する

## Escalation Hook

クロスケイパビリティ制約、NFR 適用範囲、ポリシー判断で共有スコープの解決が必要な場合は `_policies/`（特に `07_Constraints.md`、`09_Open-questions.md`）を参照すること。

## Scope

### In Scope

- 画面遷移図の Mermaid flowchart / sequenceDiagram による定義
- CTA 駆動のナビゲーションパス設計
- エラー／リカバリーフロー定義（戻り先・再試行・フォールバック）
- ディープリンクサポートの考慮事項
- デスクトップ／モバイル両ビューポートでの遷移整合性
- 孤立画面の検出と排除ルール
- 遷移図と UI 実装の整合性検証方針

### Out of Scope

- 実際の画面実装（HTML/CSS/JS）
- RUM（Real User Monitoring）データ収集
- A/B テストの設計・実施
- Figma / Sketch 等の外部デザインツール固有の機能
- アニメーション・トランジション効果の詳細実装
