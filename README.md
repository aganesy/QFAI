# QFAI Toolkit (v0.2.2)

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
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

設定はリポジトリ直下の `qfai.config.yaml` で行います。

`report` は `.qfai/out/validate.json` を入力にし、既定で `.qfai/out/report.md` を出力します。

JSONスキーマと例は `docs/schema` / `docs/examples` を参照してください。

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
