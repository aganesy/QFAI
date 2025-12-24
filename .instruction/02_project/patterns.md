---
category: project
update-frequency: frequent
dependencies: [02_project/architecture.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 実装パターン

mis-hhi で従うコーディング/設計パターン。

## フロントエンド

- **AppShell モジュール**: `pages/orders` のようにモジュールごとに `module.tsx` と `resources` を定義。メニュー文言は `meta.title` に揃える。
- **データ取得**: `gql.tada` の `graphql` タグ + `urql` を利用（例: `features/orders/hooks`）。クエリは型安全に記述し、必要なフィールドのみ取得。
- **GraphQL ファイル**: `.graphql` ファイルを新規作成しない。`src/backend/shared/db/__generated__/` または `src/shared/graphql/__generated__/` 配下の生成済みファイルを必ず import して使用する。
- **状態管理**: 画面固有の状態はコンポーネントまたは専用 hooks に閉じる。不要なグローバルステートは持たない。
- **フォーム**: `react-hook-form` + `zod` でバリデーション。エラー文言は UI 上で明示する。
- **スタイル**: Tailwind CSS 4 + `tailwind-merge` でユーティリティを整理。Radix UI コンポーネントと `lucide-react` アイコンを活用。

## バックエンド

- **DB 定義**: `src/backend/shared/db` に Tailor スキーマを集約。`defaultPermission` / `defaultGqlPermission` を適用し、PK/ユニークキーを明示。
- **DB クライアント**: `createDbClient` を利用し、Kysely ビルダーでクエリを組み立てる。権限や接続設定を一元管理。
- **リゾルバ**: `createResolver` で input/output を型定義し、バリデーションを担保。エラー時は `errorMessage` でメッセージを整形。
- **ユーザー作成サンプル**: `user-management/resolver/new-user.ts` を参照（重複チェック→挿入→結果整形）。

## テスト

- **ユニット**: `resolver/**/*.test.ts` でリゾルバロジックを検証。`shared/test-utils` のモック DB を活用。
- **統合**: `tests/**/*.test.ts` で Tailor リモート環境を利用するテストを実行（`setup.ts` 参照）。
- **E2E**: `e2e/` 配下で Playwright を使用。POM とフィクスチャを活用。

## 命名・構成

- パスエイリアスは `@`（`tsconfig.json`）を使用。バックエンド/フロントで共通の `src` 直下を基準にする。
- 型・関数・コンポーネントは責務が分かる名前にし、1ファイル1責務を維持。

## 注意点

- `orderInsertNo` から `orderNo` を導出するロジックは未実装（TODO）。仕様を確認してから実装すること。
- 既存マスタや権限設定を変更する場合は影響範囲を確認し、必要なら seed/テストを更新する。
