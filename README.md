# QFAI Toolkit (v0.1)

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を最小構成で実装するためのプロトタイプです。

## パッケージ

- `@qfai/core`: ID規約/参照ルール/検査ロジック
- `@qfai/cli`: `init/onboard/validate/status`
- `@qfai/templates`: docs/contracts/.github の雛形
- `@qfai/adapters`: Codex/Copilot/Claude 向けの薄い指示テンプレ

## 使い方（CLI）

```
qfai init
qfai onboard
qfai validate
qfai status
```

`validate` は **warning のみ** で、CI のブロックは行いません。

## 生成される構成（例）

```
docs/
  steering/
  specs/
  scenarios/
  rules/
contracts/
  ui/
  api/
  data/
```

## 開発

```
pnpm install
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
```
