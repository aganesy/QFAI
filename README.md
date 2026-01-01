# QFAI Toolkit

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を単一パッケージで提供するツールキットです。

## パッケージ

- `qfai`: CLI + コア + テンプレートを同梱

## Quick Start（最短成功）

```
npx qfai init
npx qfai validate --fail-on error --format github
npx qfai report
```

## できること

- `npx qfai init` によるテンプレート生成（specs/contracts に加え、`.qfai/require/README.md`、`.qfai/rules/pnpm.md`、`.qfai/prompts/require-to-spec.md`、`.qfai/promptpack/` を含む）
- `npx qfai validate` による `.qfai/` 内ドキュメントの整合性・トレーサビリティ検査
- `npx qfai validate` による SC→Test 参照の検証（`tests/` 配下を走査）
- `npx qfai report` によるレポート出力

## 使い方（CLI）

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。`validate` は常に `.qfai/out/validate.json`（`output.validateJsonPath`）へ JSON を出力します。`--format` は画面表示（text/github）のみを制御します。
`report` は `.qfai/out/validate.json` を読み込み、既定で `.qfai/out/report.md` を生成します（`--format json` の場合は `.qfai/out/report.json`）。出力先は `--out` で変更できます。入力パスは固定です。
`init --yes` は予約フラグです（現行の init は非対話のため挙動差はありません）。既存ファイルがある場合は `--force` が必要です。

設定はリポジトリ直下の `qfai.config.yaml` で行います。
命名規約は `docs/rules/naming.md` を参照してください。

SC→Test 検証は `validation.traceability.scMustHaveTest` と
`validation.traceability.scNoTestSeverity` で制御できます。

## GitHub Actions テンプレート

`npx qfai init` で `.github/workflows/qfai.yml` を生成します。テンプレートは `validate` ジョブで `.qfai/out/validate.json` を生成し、`qfai-validation` として artifact をアップロードします。`report` はテンプレートには含まれないため、必要なら別ジョブまたはローカルで `qfai report` を実行してください。

テンプレートは npm 前提です。pnpm を使う場合は `cache` と install コマンドを置き換えてください。
各 Actions のバージョンは運用方針に合わせて指定してください。

追加で `report` を回す場合の最小例:

```yaml
jobs:
  report:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          name: qfai-validation
          path: .qfai/out
      - run: npx qfai report --out .qfai/out/report.md
      - uses: actions/upload-artifact@v4
        with:
          name: qfai-report
          path: .qfai/out/report.md
```

JSONスキーマと例は `docs/schema` / `docs/examples` を参照してください。

## 生成される構成（例）

```
qfai.config.yaml
.qfai/
  README.md
  require/
    README.md
  specs/
    README.md
    spec-0001/
      spec.md
      delta.md
      scenario.md
  rules/
    conventions.md
    pnpm.md
  promptpack/
    constitution.md
    steering/
      compatibility-vs-change.md
      traceability.md
      naming.md
    commands/
      plan.md
      implement.md
      review.md
      release.md
    roles/
      qa.md
      spec.md
      test.md
    modes/
      compatibility.md
      change.md
  prompts/
    README.md
    makeOverview.md
    makeBusinessFlow.md
    require-to-spec.md
  contracts/
    README.md
    api/
      api-0001-sample.yaml
    ui/
      ui-0001-sample.yaml
    db/
      db-0001-sample.sql
  out/
    README.md
tests/
  qfai-traceability.sample.test.ts
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
