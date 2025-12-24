---
category: project
update-frequency: occasional
dependencies: [02_project/architecture.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 採用技術一覧（Tech Stack）

本プロジェクトで採用している技術を、フレームワーク/ライブラリ/言語/ミドルウェア等の観点で整理する。

更新元（正）:

- `package.json`（依存/バージョン/スクリプト）
- `tailor.config.ts`（Tailor Platform 設定、生成設定）
- `vite.config.ts` / `vitest.config.ts` / `playwright.config.ts`（各ツール設定）
- `scripts/generate-graphql.js`（GraphQL 型生成）
- `seed/exec.mjs`（Seed データ投入）

## プログラミング言語・ランタイム

- TypeScript（フロント/バックエンド共通）
- Node.js（`package.json#engines.node` を参照）
- ESM（`package.json#type` が `"module"`）
- pnpm（`package.json#packageManager`）

## フロントエンド（描画/UX）

### フレームワーク/ビルド

- React / React DOM
- Vite（`@vitejs/plugin-react`）
- React Compiler（`babel-plugin-react-compiler`）
- Tailor AppShell（`@tailor-platform/app-shell`）
- 認証クライアント（`@tailor-platform/auth-browser-client`）

### UI/スタイリング（描画系）

- Tailwind CSS（`tailwindcss` / `@tailwindcss/vite`）
- Radix UI primitives（例: `@radix-ui/react-dropdown-menu`）
- shadcn/ui 方式（Radix + Tailwind + cva による UI コンポーネント構成）
- クラス結合/バリアント
  - `clsx`
  - `tailwind-merge`
  - `class-variance-authority`
- アイコン: `lucide-react`
- アニメーション: `tw-animate-css`

### フォーム/入力検証

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

### API クライアント（GraphQL）

- `urql`
- Exchange: `@urql/exchange-auth` / `@urql/exchange-graphcache`
- `gql.tada`（型安全 GraphQL）
- GraphQL 型生成（`pnpm generate:graphql`）:
  - `scripts/generate-graphql.js` が `tailor-sdk show` の URL を使って `gql-tada generate schema` を実行

## バックエンド/サーバーサイド

### プラットフォーム/フレームワーク

- Tailor Platform（GraphQL API + Resolver 実行環境）
- tailor-sdk（`@tailor-platform/sdk` / CLI: `tailor-sdk`）
- 設定/構成: `tailor.config.ts`
  - Resolver パイプライン定義（`src/backend/**/resolver/*.ts` を収集）
  - DB 定義の読み込み（`src/backend/**/db/*.ts`）
  - Auth/IDP（OAuth2、Machine User など）
  - Static Web Site 定義

### DB/データアクセス（ミドルウェア相当）

- TailorDB
- Kysely（`kysely`）
- TailorDB + Kysely 連携: `@tailor-platform/function-kysely-tailordb`
- Kysely 型生成: `@tailor-platform/kysely-type`（`tailor.config.ts` の `defineGenerators` で設定）

### Seed/データ投入

- Tailor SDK CLI（例: Machine User token 取得に `@tailor-platform/sdk/cli` を使用）
- `@jackchuka/gql-ingest`（`seed/exec.mjs` が `npx gql-ingest` で投入）

## テスト

- Vitest（`vitest`）
  - `pnpm test:unit` / `pnpm test:integration`（プロジェクト分割は `vitest.config.ts` を参照）
- Playwright（`@playwright/test`）: `pnpm test:e2e`
- Testing Library: `@testing-library/react` / `@testing-library/user-event` / `@testing-library/jest-dom`
- jsdom（`jsdom`）

## 品質・静的解析（開発ツール）

- ESLint（`eslint` / `@eslint/js` / `typescript-eslint` / `eslint-plugin-react-hooks`）
- Prettier（`prettier` / `prettier-plugin-tailwindcss`）
- 型チェック（`pnpm check-types` / `tsc --noEmit`）
