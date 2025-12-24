---
category: project
update-frequency: occasional
dependencies: [02_project/patterns.md]
version: 1.0.0
---

# テンプレート保護（直接編集禁止）

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

本プロジェクトはテンプレートをベースに開発しており、**テンプレート由来のファイルは原則として直接編集しない**。
テンプレート側の修正はテンプレート開発チームが担当するため、受託開発側は **ラッパー/拡張** で対応する。

## 直接編集禁止の対象（例）

| カテゴリ                         | 対象パス                                      | 推奨される拡張方法                                                  |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| UI コンポーネント                | `src/frontend/components/ui/`                 | `App*` ラッパーを `src/frontend/components/app/` に作成             |
| 認証関連                         | `src/frontend/components/auth/`               | 追加機能は `src/frontend/features/auth/` に拡張コンポーネントを作成 |
| エラーバウンダリ                 | `src/frontend/components/error-boundary.tsx`  | 拡張が必要なら `AppErrorBoundary` を作成                            |
| Provider                         | `src/frontend/providers/`                     | 追加 Provider は別ファイルで作成し `providers.tsx` で組み込み       |
| 共通ユーティリティ               | `src/frontend/lib/utils.ts`                   | プロジェクト固有は `src/frontend/lib/app-utils.ts` 等に分離         |
| テストユーティリティ             | `src/frontend/test-utils/`                    | 拡張は `src/frontend/test-utils/app-*.ts` に作成                    |
| ベーススタイル                   | `src/frontend/index.css`                      | 追加スタイルは別 CSS ファイルで管理                                 |
| エントリーポイント               | `src/frontend/main.tsx`                       | 原則変更禁止（変更必須時はユーザー確認）                            |
| DB クライアント                  | `src/backend/shared/db/client.ts`             | 拡張は別ファイルで作成                                              |
| 共通エラー定義                   | `src/backend/shared/error/`                   | プロジェクト固有エラーは別ディレクトリに作成                        |
| バックエンドテストユーティリティ | `src/backend/shared/test-utils/`              | 拡張は別ファイルで作成                                              |
| E2E ユーティリティ               | `e2e/fixtures/`, `e2e/utils/`                 | プロジェクト固有は別ディレクトリに作成                              |
| 設定ファイル                     | `*.config.js`, `*.config.ts`, `tsconfig.json` | 原則変更禁止（変更必須時はユーザー確認）                            |

> 注: 対象パスはテンプレート更新により変わり得る。最新の運用はリポジトリ内の該当ガイドを優先する。

## UI コンポーネントのラッパー作成ルール

- **`App` プレフィックス**を付けたラッパーを作成
  - 例: `Input` → `AppInput`, `Button` → `AppButton`, `Select` → `AppSelect`
- **配置先**: `src/frontend/components/app/`
- **ラッパーで実装する内容の例**:
  - バリデーション連携
  - エラー表示の統一
  - アクセシビリティ強化
  - プロジェクト固有のスタイル適用

## テンプレート変更が必要になった場合

テンプレート自体のバグや機能不足でラッパーでは対応不可能な場合:

1. **作業を停止**し、ユーザーに報告
2. テンプレート開発チームへの修正依頼を検討
3. 暫定対応としてラッパーで回避可能か検討
4. ユーザー判断を仰ぐ

## 計画段階での明記事項

計画段階でテンプレート由来ファイルの変更が必要な場合、必ず対応方針（ラッパー作成/ユーザー確認）を明記すること。
