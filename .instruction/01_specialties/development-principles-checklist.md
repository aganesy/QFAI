---
category: specialties
update-frequency: occasional
dependencies: [00_universal/quality.md, implementation.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 開発原則チェックリスト（詳細）

SOLID / KISS / YAGNI / DRY を詳細に確認するための補足チェック。

## 基本ガイド

- 品質基準: [../00_universal/quality.md](../00_universal/quality.md)
- 実装指針: [./implementation.md](./implementation.md)
- プロジェクトパターン: [../02_project/patterns.md](../02_project/patterns.md)

## チェックポイント

- 責務が単一か、名前とテストで意図が読み取れるか。
- 拡張しやすい構造か（設定や依存差し替えで対応できるか）。
- インターフェースは小さく、不要なメソッドを強要していないか。
- 重複ロジックを共通化できているか。ユーティリティ化の余地がないか。
- 仕様が変わる箇所はテストで守られているか。

## メトリクス

- 測定方法の詳細は [development-principles-metrics.md](./development-principles-metrics.md) を参照。
