# 01 Spec

## Metadata

| Key    | Value                              |
| ------ | ---------------------------------- |
| Spec   | spec-0021                          |
| Parent | CAP-0021                           |
| Title  | レンダークリティークループ         |
| Status | draft                              |

## Summary

プロトタイピングおよび実装フェーズにおいて、初回レンダー→デスクトップ批評→モバイル批評→反復改善のクリティークループを必須プロセスとして定義する。下流スキルが DDP→token→contract→mock→flow の順序で入力を読み取る規則を確立し、コードオンリーレビューを禁止する。批評結果はエビデンスとして記録される。

## Applicable NFR / Policy / Evidence Summary

- NFR-0003: レスポンシブ — representative desktop/mobile viewport で major layout break 0
- NFR-0007: レビュー再現性 — 同一 artifact に同一 rubric を適用した結果差分 0
- REQ-0007: 下流読取順序 — DDP→Design Token→UI Contract→HTML Mock→Flow/Navigation
- REQ-0008: レンダークリティークループ — rendered UI を desktop/mobile で点検する critique loop を要求
- Policy: コードオンリーレビュー禁止（discussion-20260324054332396 / 99_delta Rejected）
- Policy: 批評エビデンス記録必須（REQ-0009 fidelity scorecard 連携）

## Escalation Hook

クロスケイパビリティ制約、NFR 適用判断、またはポリシー決定で共有スコープの解決が必要な場合は `_policies/`（特に `07_Constraints.md`、`09_Open-questions.md`）を参照すること。

## Scope

### In Scope

- `/qfai-prototyping` と `/qfai-implement` におけるクリティークループプロセス定義
- 下流読取順序の規定：DDP→Design Token→UI Contract→HTML Mock→Flow/Navigation
- デスクトップ・モバイル両ビューポートでの批評必須化
- 批評結果のエビデンス記録形式
- コードオンリーレビュー禁止ルールの明文化

### Out of Scope

- 自動 VRT（Visual Regression Testing）ハードゲート — v1.6.6 に延期
- RUM（Real User Monitoring）データ連携
- Fidelity Scorecard の詳細定義（spec-0022 以降で対応）
- Figma / 外部デザインツール連携
