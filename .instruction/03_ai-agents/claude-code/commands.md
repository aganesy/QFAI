---
category: claude-code
update-frequency: frequent
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# よく使うコマンド（Claude Code）

## セットアップ

- 依存インストール: `pnpm install`
- GraphQL 生成: `pnpm generate:graphql`

## 開発

- フロント開発サーバー: `pnpm dev`
- バックエンド apply: `pnpm apply:backend`
- ビルド: `pnpm build`

## 品質

- Lint: `pnpm lint`
- フォーマット: `pnpm format` / 検査 `pnpm format:check`
- 型チェック: `pnpm check-types`

## テスト

- 全テスト: `pnpm test`
- カバレッジ: `pnpm test:coverage`
- Backend Unit: `pnpm test:unit`
- Backend Integration: `pnpm test:integration`
- E2E: `pnpm test:e2e`

## Seed/データ

- Seed 実行: `pnpm seed`

> 実行結果は成功/失敗を明示し、失敗時はログ要約と対応を記載する。
