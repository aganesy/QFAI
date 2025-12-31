---
category: project
update-frequency: frequent
dependencies: [02_project/tech-stack.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 開発手順とコマンド（QFAI Toolkit）

## 前提

- Node.js >= 18（`package.json#engines`）
- pnpm（`package.json#packageManager`）

## セットアップ

```
pnpm install
```

## ビルド/品質ゲート

```
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
pnpm -C packages/qfai test
pnpm verify:pack
```

## CLI スモーク（空ディレクトリで実施）

```
npx qfai init
npx qfai validate --fail-on error --format github
npx qfai report
```

## リリース

- 詳細は `RELEASE.md` を参照
- `npm publish --dry-run` は `packages/qfai` 配下で実行する
