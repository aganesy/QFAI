---
category: specialties
update-frequency: occasional
dependencies: [development-principles-checklist.md, 00_universal/quality.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 開発原則の測定指標

品質を定量的に見るための目安。

## 推奨指標

- テスト: 主要ロジックのカバレッジ、失敗時の再現テスト有無。
- 複雑度: 関数の分岐数・行数、責務の粒度。
- 重複: 同種のロジック・バリデーション・API 呼び出しの重複度。
- パフォーマンス: N+1、有効なキャッシュの有無、不要な全件取得の有無。

## 運用

- CI で定点観測し、悪化した場合は原因と対策を記録する。
- 数値が改善してもリスク（仕様逸脱・安全性低下）がないか併せて確認する。
