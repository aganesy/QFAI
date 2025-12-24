---
category: copilot
update-frequency: frequent
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# よく使うコマンド（GitHub Copilot）

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
- VS Code での確認（コマンドパレット）:
  - `MCP: List Servers`（必要なら `Start/Restart`）
  - `MCP: Reset Cached Tools`（ツールが出ない時）

> 実行結果は成功/失敗を明示し、失敗時はログ要約と対応を記載する。
