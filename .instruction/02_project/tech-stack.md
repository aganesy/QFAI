---
category: project
update-frequency: occasional
dependencies: [02_project/architecture.md]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 採用技術一覧（QFAI Toolkit）

## ランタイム/言語

- Node.js（`package.json#engines` は `>=18.0.0`）
- TypeScript（ESM）
- pnpm（`package.json#packageManager`）

## ビルド/パッケージ

- tsup（`packages/qfai` のビルド）
- TypeScript コンパイラ（`tsc -b` / `tsc --noEmit`）
- npm publish（`RELEASE.md` に手順を集約）

## 解析/フォーマット

- Gherkin 解析: `@cucumber/gherkin`, `@cucumber/messages`
- YAML 解析: `yaml`（`qfai.config.yaml`）

## テスト

- Vitest（`packages/qfai` のユニット/CLI テスト）

## 品質・静的解析

- ESLint
- Prettier
