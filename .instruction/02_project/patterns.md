---
category: project
update-frequency: frequent
dependencies: [02_project/architecture.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 実装パターン（QFAI Toolkit）

QFAI Toolkit の実装は CLI とコア検証エンジンを分離し、最小の責務で追加できるように設計する。

## CLI（`packages/qfai/src/cli`）

- コマンドは `cli/commands/*` に追加し、`cli/main.ts` で dispatch する
- 引数解析は `cli/lib/args.ts` の `ParsedArgs` と `parseArgs` を拡張する
- Usage は `cli/main.ts` の `usage()` を更新する
- CLI の挙動は `packages/qfai/tests/cli` で検証する

## 検証ロジック（`packages/qfai/src/core`）

- 追加の検証は `core/validators/*` に実装し、`validateProject` に集約する
- 返却は `Issue[]` に統一し、`Issue.code` と `Issue.rule` を既存命名に合わせる
- パス解決は `core/config.resolvePath` を使い、独自のパス結合を避ける
- ファイル収集は `core/fs.collectFiles` を使い、除外ディレクトリの規約に従う

## 設定（`core/config.ts`）

- 追加の設定キーは `defaultConfig` と `normalize*` を同時に更新する
- 既定値と検証エラーのメッセージは具体的に記述する

## テンプレート（`packages/qfai/assets/init`）

- `init` テンプレートは assets が SSOT
- テンプレート変更時は `tests/cli/init.test.ts` を更新する

## テスト

- コア: `packages/qfai/tests/core` で境界/異常系を優先
- CLI: `packages/qfai/tests/cli` で引数/出力/テンプレートを検証
- 変更した層の近傍テストを必ず更新する
