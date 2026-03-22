# 01_Context

## プロダクトコンセプト

QFAI (Quality-First AI) は、AI支援開発の品質と一貫性を向上させる CLI パッケージである。`qfai init` コマンドにより、プロジェクトにQFAIワークフローの基盤ファイルを配置する。

## 背景

本リポジトリでは GitHub Copilot のコードレビュー品質を向上させるため、`.github/instructions/` 配下に2つのインストラクションファイルを運用している:

1. **code-review.instructions.md** — Copilot コードレビューの指示書（重要度プレフィックス、レビューチェックリスト、コメント形式）
2. **principles.instructions.md** — ソフトウェア設計原則に基づくレビュー指示（SOLID、KISS、YAGNI、DRY 等）

これらは本リポジトリ固有であり、QFAI パッケージとして配布されていない。v1.6.3 でこれらを汎用化し、`qfai init` テンプレートに搭載する。

## ターゲットユーザー

- QFAI を導入済み/導入予定のソフトウェア開発チーム
- GitHub Copilot のコードレビュー機能を活用しているプロジェクト
- 言語・フレームワーク非依存でコードレビュー品質を底上げしたいチーム

## ステークホルダー

| ステークホルダー      | 関心事                                                    |
| --------------------- | --------------------------------------------------------- |
| QFAI 利用者（開発者） | init で簡単にレビュー指示が配置される。既存設定が壊れない |
| プロジェクトリード    | チーム全体のレビュー品質が標準化される                    |
| QFAI メンテナー       | テンプレート管理の複雑化を最小限に抑える                  |

## 制約概要

- 配布スコープ: `.github/instructions/` のみ（workflow や PR テンプレートは対象外）
- 汎用化: TypeScript 固有チェックを除去した言語非依存版を配布
- 言語固有ルール: `/qfai-sdd` フェーズで技術スタック選定後に追記
- 安全策: create-only（既存ファイルがあれば skip、`--force` でも上書きしない）

## ソース

- SRC-0001: `.github/instructions/code-review.instructions.md`（本リポジトリ）
- SRC-0002: `.github/instructions/principles.instructions.md`（本リポジトリ）
- SRC-0003: `packages/qfai/src/cli/commands/init.ts`（現行 init 実装）
- SRC-0004: ユーザーインタビュー（2026-03-22）
