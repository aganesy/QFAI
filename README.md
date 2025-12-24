# QFAI Toolkit (v0.2)

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を単一パッケージで提供するツールキットです。

## パッケージ

- `qfai`: CLI + コア + テンプレを同梱

## 使い方（CLI）

```
npx qfai init
npx qfai validate
npx qfai report
```

`validate` は **warning のみ** で、CI のブロックは行いません。

## 生成される構成（例）

```
qfai/
  README.md
  qfai.config.yaml
  spec/
    spec.md
    decisions/
    scenarios.feature
  contracts/
    api/
    ui/
    db/
```

## 開発

```
pnpm install
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
```
