---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# プロジェクト構成（mis-hhi）

Tailor Platform 上で動くバックエンド（tailor-sdk）と、Vite + React + AppShell で構築されたフロントエンドのテンプレート。

## 技術スタック

- フロントエンド: React 19 + Vite 7, AppShell, Tailwind CSS 4, Radix UI, urql + gql.tada, react-hook-form, zod。
- バックエンド: @tailor-platform/sdk でスキーマ/リゾルバ定義、Kysely ベースの DB クライアント、Tailor 権限設定。
- テスト: Vitest（backend-unit / backend-integration プロジェクト、共通 run）、Playwright で E2E。
- その他: ESLint + Prettier, TypeScript 5.9, pnpm 管理。
- 採用技術の詳細: `tech-stack.md`

## ディレクトリ概要

```
src/
  backend/
    shared/         # DB 定義、共通クライアント、権限、テストユーティリティ
    user-management # ユーザー作成リゾルバとテスト
  frontend/
    components/     # 共通 UI（AuthGuard, ErrorBoundary 等）
    pages/orders/   # 注文検索/一覧/詳細/入力モジュール
    providers/      # AppShell/urql/認証などのプロバイダ
    features/orders # 注文データ取得 hooks（urql）
    features/user   # ユーザー関連
  shared/           # GraphQL クライアント生成などの共通コード
```

## 主なエンティティ（DB スキーマ）

- `TOrderHeader` / `TOrderMeisai`: 注文ヘッダと明細（船番・ブロック番号・注文番号で構成）。
- マスタ: `MUser`（ユーザー）, `MSystem`（システムコード）, 規格・寸法マスタ（`m-kikaku-ex` など）、材料管理 `m-zairyo`。
- 履歴: `TOperateHistory`（操作ログ）。

## モジュール構成（フロント）

- AppShell に `orders` / `sales` / `users` モジュールを登録。`orders` は検索・一覧・詳細・入力のリソースを含む。

## テスト構成

- Vitest プロジェクト:
  - `backend-unit`: `src/backend/**/resolver/**/*.test.ts` を Node 環境で実行。
  - `backend-integration`: `src/backend/**/tests/**/*.test.ts` を Node 環境 + `setup.ts` で実行。
- Playwright: `e2e/` 配下に POM/fixture/テストを配置。
