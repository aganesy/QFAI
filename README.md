# QFAI Toolkit (v0.2.4)

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を単一パッケージで提供するツールキットです。

## パッケージ

- `qfai`: CLI + コア + テンプレートを同梱

## Quick Start（最短成功）

```
npx qfai init
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

## 使い方（CLI）

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。
JSON 出力は `--json-path` 指定、または `qfai.config.yaml` の `output.format: json` で有効化できます。
`report` は `validate.json` が必須で、未生成の場合は exit code 2 で次の手順を案内します。
`report` の入力は `--json-path` が優先で、未指定の場合は `output.jsonPath` を使います。どちらも未設定の場合はレポートを生成できないため、いずれかを必ず指定してください。既定の出力は `.qfai/out/report.md`（`--format json` の場合は `.qfai/out/report.json`）です。
`init --yes` は非対話でデフォルトを採用します（現状の init は非対話が既定のため挙動は同じです。将来対話が導入されても自動で承認されます）。既存ファイルがある場合は `--force` が必要です。

設定はリポジトリ直下の `qfai.config.yaml` で行います。

## GitHub Actions テンプレート

`npx qfai init` で `.github/workflows/qfai.yml` を生成します。テンプレートは `validate` ジョブで `.qfai/out/validate.json` を生成し、`qfai-validation` として artifact をアップロードします。`report` はテンプレートには含まれないため、必要なら別ジョブまたはローカルで `qfai report` を実行してください。

テンプレートは npm 前提です。pnpm を使う場合は `cache` と install コマンドを置き換えてください。

追加で `report` を回す場合の最小例:

```yaml
jobs:
  report:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: actions/setup-node@v4.0.4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v4.1.8
        with:
          name: qfai-validation
          path: .qfai/out
      - run: npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
      - uses: actions/upload-artifact@v4.4.3
        with:
          name: qfai-report
          path: .qfai/out/report.md
```

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
