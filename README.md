# QFAI Toolkit (v0.2.1)

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を単一パッケージで提供するツールキットです。

## パッケージ

- `qfai`: CLI + コア + テンプレを同梱

## 使い方（CLI）

```
npx qfai init
npx qfai validate
npx qfai report
```

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。

```
npx qfai validate --fail-on error --format github
```

設定はリポジトリ直下の `qfai.config.yaml` で行います。

## 生成される構成（例）

```
qfai.config.yaml
qfai/
  README.md
  spec/
    spec.md
    decisions/
    scenarios.feature
  contracts/
    api/
    ui/
    db/
.github/
  workflows/
    qfai.yml
```

## 開発

```
pnpm install
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
```
