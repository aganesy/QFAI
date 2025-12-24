---
category: claude-code
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# Claude Code ベストプラクティス

Claude Code を使うときの共通ルール。

## 関連ドキュメント

- 共通品質基準: [../../00_universal/development-principles-checklist.md](../../00_universal/development-principles-checklist.md)
- メトリクス: [../../01_specialties/development-principles-metrics.md](../../01_specialties/development-principles-metrics.md)

## トーンとスタイル

- 余計な前置きは省き、4行以内で要点を回答（コードやツール出力は除く）。
- 質問や確認が必要な場合は最小の問いで聞く。

## 進め方

1. 関連ファイルと仕様を読む（すぐにコードを書かない）。
2. 複雑な作業は Plan を提示し、承認後に実装。
3. 変更は小さくまとめ、テストを実行・報告。
4. 残リスクや不明点があれば必ず記載する。

## 禁止事項

- 秘密情報の埋め込み・露出。
- ユーザー許可なしの `eslint-disable*` / `@ts-ignore` の追加・使用。
- テスト失敗を無視したままの完了報告。
