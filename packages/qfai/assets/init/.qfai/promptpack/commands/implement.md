# Implement

- 既存の型/ユーティリティ/パターンを優先して再利用する
- 入力検証と失敗パスを先に書く
- 早期 return でネストを浅くする
- ログ/エラーメッセージは具体的かつ最小限にする
- 契約追加/変更時は `prompts/qfai-maintain-contracts.md` を使う
- 参照切れがある場合は `prompts/qfai-maintain-traceability.md` を使う
