# レビューリクエスト

## レビュー対象

- **スコープ**: SDD（Software Design Document）
- **バージョン**: v1.6.5
- **日時**: 2026-03-24T22:00:00.000Z

## 対象アーティファクト

### 新規スペック（4 件、各 10 ファイル）

| Spec      | CAP      | Title                                                 |
| --------- | -------- | ----------------------------------------------------- |
| spec-0019 | CAP-0019 | Design Direction Pack（デザインディレクションパック） |
| spec-0020 | CAP-0020 | ナビゲーション＆スクリーンフロー設計                  |
| spec-0021 | CAP-0021 | レンダークリティークループ                            |
| spec-0022 | CAP-0022 | デザインフィデリティ評価                              |

### ポリシー更新

- `_policies/03_Capabilities.md` — CAP-0019..CAP-0022 追加
- `_policies/08_Decisions.md` — DR-0031..DR-0035 追加

### コントラクト

- `.qfai/contracts/**` — 確認済み: v1.6.5 新規コントラクト追加なし（QFAI は CLI ツール）
- 既存の design contracts（design-tokens.schema.yaml, anti-patterns.schema.yaml, best-practices.schema.yaml）は CAP-0013 由来で変更なし

### エビデンス

- `.qfai/evidence/sdd-spec-0019.md` .. `sdd-spec-0022.md`
- `.qfai/evidence/sdd-batch-20260324.md`

### バリデーション

- `.qfai/report/validate.log` — spec-0019..0022 固有の新規エラー: AC-Refs/BR-ID ヘッダーパターン（既知の validator 制限、spec-0001..0016 にも共通）

## レビュアーロスター（13 名）

1. qa-lead（Quality Lead）
2. qa-gatekeeper（QA Gatekeeper）
3. reviewer（Independent Reviewer）
4. code-reviewer（Code Reviewer）
5. architect-reviewer（Architect Reviewer）
6. qa-reviewer（QA Reviewer）
7. frontend-reviewer（Frontend Reviewer）
8. backend-reviewer（Backend Reviewer）
9. design-review-lead（Design Review Lead）
10. runtime-gatekeeper（Runtime Gatekeeper）
11. devils-advocate（Devil's Advocate）
12. pattern-doubler（Pattern Doubler）
13. integrated-uiux-reviewer（Integrated UI/UX Reviewer）
