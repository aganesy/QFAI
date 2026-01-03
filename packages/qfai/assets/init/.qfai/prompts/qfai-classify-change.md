# QFAI: Compatibility / Change 分類（変更区分の判断支援）

あなたは差分を分析し、変更が Compatibility か Change かを分類します。

## 目的

- delta.md の変更区分を明確にし、レビューポイントを固定する
- 影響範囲（Spec/Scenario/Test/Contract）を明示する

## 必須入力

- `.qfai/specs/**/delta.md`
- 変更差分（`git diff`）
- 参照元の Spec/Scenario/Contracts（必要に応じて）

## 手順

1. 差分を読み、ユーザー影響（互換維持/破壊）を分類する。
2. 影響範囲（Spec/Scenario/Test/Contract）を列挙する。
3. 変更区分の根拠を簡潔にまとめる。
4. 必要なドキュメント更新（README/CHANGELOG/Spec）を列挙する。

## 禁止事項

- 仕様を勝手に変更しない
- delta.md の内容を無断で上書きしない
- 変更理由の捏造をしない

## 出力フォーマット

- 分類（Compatibility / Change）と根拠
- 影響範囲（ファイル/機能/テスト）
- 追記すべきドキュメントのチェックリスト
