---
category: universal
update-frequency: occasional
dependencies: [quality.md]
version: 1.0.0
---

# 開発原則チェックリスト（共通）

SOLID / KISS / YAGNI / DRY を、すべての実装で同じ基準で適用するためのチェックリスト。

## 関連ドキュメント

- How much code implements a behaviour: `.agents/rules/minimal-implementation.md`
- 品質基準: [quality.md](./quality.md)
- Claude Code ベストプラクティス: [../03_ai-agents/claude-code/best-practices.md](../03_ai-agents/claude-code/best-practices.md)
- プロジェクト実装パターン: [../02_project/patterns.md](../02_project/patterns.md)

## SOLID チェック

- **SRP**: 1ファイル/関数/コンポーネントの責務は1つ。名前から責務が分かり、複数理由で変更しない。
- **OCP**: 既存コードを書き換えずに拡張できる設計か。設定や依存注入で切り替え可能か。
- **LSP**: 型の置き換えで破綻しないか。派生が事前条件を厳しくせず、事後条件を弱めていないか。
- **ISP**: インターフェースは小さく役割別に分割されているか。不要なメソッドを強要していないか。
- **DIP**: 具象に依存せず抽象に依存しているか。モジュール境界でインターフェースを用意する。

## How much code — KISS, YAGNI, DRY

The ladder is in `.agents/rules/minimal-implementation.md`. Apply it from there
rather than from a copy here.

Sharing has a floor the ladder does not set: extract on the third occurrence.
Earlier than that, code pulled in different directions by several callers costs
more than the repetition did.

## 実装チェック（抜粋）

- 型安全: `any` を避け、入力/出力をスキーマや zod で検証する。
- 例外処理: 失敗パスを先に書き、ユーザー向け/ログ向けメッセージを分ける。
- テスト: 振る舞い変更には近傍にテストを追加。再現テスト→修正→パスを確認。
- ログ: 必要最小限で具体的に。秘密情報を含めない。
- パフォーマンス: N+1 と不要な全件取得を避ける。キャッシュやバッチ処理を検討。

## 自己レビューの型

```
- 目的と完了条件を満たすか
- 責務が単一か / 再利用パターンに従っているか
- 異常系・境界値をカバーしているか
- テストは十分か、実行結果はどうか
- 影響範囲と残リスクは何か
```
