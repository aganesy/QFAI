---
category: project
update-frequency: frequent
dependencies: [03_ai-agents/claude-code/commands.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 開発手順とコマンド

mis-hhi リポジトリでのセットアップとビルド/テスト手順。

## セットアップ

## Node.js バージョン

- Node は `.nvmrc`（`22.12` = 22.12系の最新パッチに追従）に追従する。
- ローカルは既存の Node 管理方法のままでよいが、`22.12` 系（`22.12.x`）を使用する（Vite の要件に合わせるため）。

1. `.env.example` をコピーして `.env` を作成し、以下を設定する。
   - `WORKSPACE_ID`（Tailor Console の workspace id）
   - `VITE_TAILOR_APP_URL`（デプロイ済みバックエンドの URL）
   - `VITE_TAILOR_CLIENT_ID`（Auth > OAuth2 Clients の clientId）
   - `VITE_OAUTH2_REDIRECT_URL`（通常 `http://localhost:5173`）
2. 依存インストール: `pnpm install`
3. GraphQL 型生成: `pnpm generate:graphql`（必要に応じて）

## 開発・ビルド

- 開発サーバー: `pnpm dev`（http://localhost:5173）
- バックエンド apply: `pnpm apply:backend`（`.env` を参照）
- ビルド: `pnpm build`（tailor-sdk generate + Vite build）

## Lint / Format / 型チェック

- Lint: `pnpm lint`
- フォーマット: `pnpm format` / 検査のみ `pnpm format:check`
- 型チェック: `pnpm check-types`

## テスト

- 全テスト: `pnpm test`
- カバレッジ: `pnpm test:coverage`
- バックエンド単体: `pnpm test:unit`
- バックエンド統合: `pnpm test:integration`
- E2E（Playwright）: `pnpm test:e2e`

## Seed データ

- 新規テーブル作成後、`pnpm build` で `seed/config.yaml` と `seed/data/*.jsonl` を生成。
- 既存テーブルの seed 追記も `pnpm build` で再生成後、`seed/data/{table}.jsonl` を編集。
- 実行: `pnpm seed`（`.env` を参照）。

## 作業の基本方針

- 変更は小さく分割し、近傍にテストを追加する。
- Tailor の schema/permission は `src/backend/shared/db` の既存パターンに合わせて定義する。
- フロントは AppShell のモジュール設計に従い、`pages/orders/*` など既存リソースを参照して実装する。
