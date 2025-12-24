---
category: specialties
update-frequency: occasional
dependencies:
  [development-principles-checklist.md, development-principles-metrics.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 品質自動化ガイド

開発原則の測定・自動化で見るポイント。

## 自動チェックの優先度

1. Lint/Format: ESLint・Prettier を必ず通す。
2. 型: `pnpm check-types` でビルド前に型崩れを検知。
3. テスト: 単体/統合/E2E を CI で分けて実行し、失敗時は原因特定まで止める。
4. メトリクス: カバレッジ・パフォーマンス・バンドルサイズの変化を監視。

## 運用

- 自動化で検知した問題はチケット化し、再発防止策（ルール化・サンプル化）を残す。
- 長時間かかるジョブはキャッシュや差分実行を検討する。
