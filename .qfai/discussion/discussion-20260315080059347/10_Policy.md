# 10_Policy

## Security Policies

| ID | Policy | Description |
|----|--------|-------------|
| SP-01 | HTML Mock XSS 防止 | HTML+CSS Mock に JavaScript を含めてはならない。`<script>` タグ、イベントハンドラ（onclick 等）、`javascript:` URL は禁止。バリデーションで自動検出する。 |
| SP-02 | 外部リソース参照禁止 | HTML Mock から外部 URL（CDN、画像、フォント等）への参照を禁止する。自己完結型のインラインスタイルのみ使用可能。 |

## Compliance Policies

| ID | Policy | Description |
|----|--------|-------------|
| CP-01 | WCAG 2.2 AA チェック | 対象プロジェクトが Web アプリケーションの場合、WCAG 2.2 AA 準拠の自動チェックを必須とする。 |
| CP-02 | プラットフォームガイドライン準拠 | 対象プロジェクトのプラットフォームに応じた HIG（Human Interface Guidelines）準拠チェックを推奨とする。 |

## Quality Policies

| ID | Policy | Description |
|----|--------|-------------|
| QP-01 | UI 定義 3 点セット必須 | UI 要件が存在する場合、Design Token YAML + HTML+CSS Mock + Mermaid 画面遷移図の 3 点セットの定義を必須とする。 |
| QP-02 | アンチパターンレビュー必須 | prototyping の成果物に対して、UI/UX アンチパターンレビュー（自動 + 手動）を必須とする。 |
| QP-03 | 状態バリアント定義 | 主要画面の HTML Mock では、default + empty + error の最低 3 状態バリアントを定義することを推奨する。 |
| QP-04 | Design Token 階層遵守 | Design Token は必ず primitive → semantic の参照チェーンを経由する。semantic Token が直接ハードコード値を持つことを禁止する。 |

## Governance Policies

| ID | Policy | Description |
|----|--------|-------------|
| GP-01 | ベストプラクティス/アンチパターン更新手順 | ルールの追加・変更・削除は discussion を経由し、OQ として記録する。レビュアー承認が必要。 |
| GP-02 | Design Token 変更管理 | semantic Token の値変更は影響範囲分析を必須とする。primitive Token の追加は自由。 |
| GP-03 | UI Contract 拡張ルール | 既存フィールドの削除・型変更は禁止。新フィールドは optional として追加のみ許可。 |
