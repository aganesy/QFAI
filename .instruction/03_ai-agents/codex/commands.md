---
category: codex
update-frequency: frequent
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# よく使うコマンド（Codex）

## セットアップ

- 依存インストール: pnpm install
- GraphQL 型生成: pnpm generate:graphql

## 開発

- フロント開発サーバー: pnpm dev
- バックエンド apply: pnpm apply:backend
- ビルド: pnpm build

## 品質

- Lint: pnpm lint
- フォーマット: pnpm format / 検査のみ pnpm format:check
- 型チェック: pnpm check-types

## テスト

- 全テスト: pnpm test
- カバレッジ: pnpm test:coverage
- Backend Unit: pnpm test:unit
- Backend Integration: pnpm test:integration
- E2E: pnpm test:e2e

## Seed/データ

- Seed 実行: pnpm seed

## MCP（推奨）

- MCP 一覧/使いどころ: `.instruction/02_project/mcp.md`
- 設定確認:
  - `codex mcp list`
  - `codex mcp get serena`
  - `codex mcp get context7`
  - `codex mcp get markitdown`
  - `codex mcp get vibe-pdf-read`
  - `codex mcp get ocr`
  - `codex mcp get chrome-devtools`

> 実行結果は成功/失敗を明示し、失敗時はログ要約と対応を記載する。
