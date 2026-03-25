# R07: Frontend Reviewer レビュー

## レビュアー情報

- ID: frontend-reviewer
- 名前: Frontend Reviewer
- スコープ: sdd

## チェック項目

### 1. UI/UX・アクセシビリティ・インタラクションへの影響

該当なし。

### 2. ユーザー向けフロー・例外パス

該当なし。

## N/A 根拠

QFAI は CLI ツールであり、GUI / フロントエンド / UI コンポーネントを持たない。

- `_policies/01_Objective.md` のスコープ表で「IDE プラグイン / GUI」が Out of Scope として明記されている。
- `_policies/05_Contracts.md` の UI Contracts セクションに「QFAI は GUI を持たない CLI ツールである。`qfai prototyping` コマンドは対象プロジェクトの UI コントラクトを検証する機能であり、QFAI 自体の UI コントラクトではない。」と記載されている。
- `review-roster.yml` の na_rule: "Allowed only if no frontend or UX impact exists." に該当。

## 判定

**N/A**

フロントエンド影響が存在しないため、N/A とする。
