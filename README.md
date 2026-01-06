# QFAI Toolkit

[![npm version](https://img.shields.io/npm/v/qfai.svg?style=flat)](https://www.npmjs.com/package/qfai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-brightgreen.svg)](https://nodejs.org/)

品質重視型AI駆動運用モデル（SDD × ATDD × TDD）を単一パッケージで提供するツールキットです。

## 目次

- [インストール](#インストール)
- [Quick Start](#quick-start最短成功)
- [機能](#できること)
- [CLI リファレンス](#使い方cli)
- [設定](#設定)
- [契約](#契約contracts)
- [Monorepo 対応](#monorepo--サブディレクトリ)
- [CI 統合](#ci-と-hard-gate)
- [GitHub Actions](#github-actions-テンプレート)
- [開発](#開発)
- [ライセンス](#ライセンス)

## インストール

```sh
npm install qfai
```

または

```sh
npx qfai init
```

pnpm の場合（推奨）:

```sh
pnpm add -D qfai
```

**必要環境**: Node.js >= 18

## パッケージ

- `qfai`: CLI + コア + テンプレートを同梱

## Quick Start（最短成功）

```sh
npx qfai init
npx qfai doctor --fail-on error
npx qfai validate --fail-on error --format github
npx qfai report
```

## できること

- `npx qfai init` によるテンプレート生成（specs/contracts に加え、`.qfai/require/README.md`、`.qfai/rules/pnpm.md`、`.qfai/prompts/**`、`.qfai/prompts.local/README.md`、`.qfai/promptpack/` を含む）
- `npx qfai validate` による `.qfai/` 内ドキュメントの整合性・トレーサビリティ検査
- `npx qfai validate` による SC→Test 参照の検証（`validation.traceability.testFileGlobs` に一致するテストファイルから `QFAI:SC-xxxx` を抽出）
- `npx qfai doctor` による設定/探索/パス/glob/validate.json の事前診断
- `npx qfai report` によるレポート出力

補足: v0.x は日本語テンプレ中心で提供します。将来は英語を正本、日本語を別ドキュメントに切り替える方針です。

## 使い方（CLI）

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。`validate` は常に `.qfai/out/validate.json`（`output.validateJsonPath`）へ JSON を出力します。`--format` は画面表示（text/github）のみを制御します。`--format github` はアノテーションの上限と重複排除を行い、先頭にサマリを出します（全量は `validate.json` か `--format text` を参照）。
`report` は `.qfai/out/validate.json` を既定入力とし、`--in` で上書きできます（優先順位: CLI > config）。`--run-validate` を指定すると validate を実行してから report を生成します。出力先は `--out` で変更できます（`--format json` の場合は `.qfai/out/report.json`）。
`doctor` は validate/report の前段で設定/探索/パス/glob/validate.json を診断します。`--format text|json`、`--out` をサポートし、診断のみ（修復はしません）。`--fail-on warning|error` を指定すると該当 severity 以上で exit 1（未指定は常に exit 0）になります。

### Prompts Overlay（v0.7 以降の方針）

QFAI が提供するプロンプト資産は次の 2 つに分離します。

- `.qfai/prompts/**`: QFAI 標準資産（更新や `qfai init` 再実行で上書きされ得る。利用者編集は非推奨・非サポート）
- `.qfai/prompts.local/**`: 利用者カスタム資産（QFAI はここを上書きしない）

同じ相対パスのファイルがある場合は `.qfai/prompts.local` を優先して参照する運用とします。

`report.json` は非契約（experimental / internal）として扱います。外部 consumer は依存しないでください。フィールドは例であり固定ではありません。短い例:

```json
{
  "tool": "qfai",
  "summary": {
    "specs": 1,
    "scenarios": 1,
    "contracts": { "api": 0, "ui": 1, "db": 0 },
    "counts": { "info": 0, "warning": 0, "error": 0 }
  }
}
```

doctor（text）の例:

```text
qfai doctor: root=. config=qfai.config.yaml (found)
[ok] config.search: qfai.config.yaml found
summary: ok=10 info=1 warning=2 error=0
```

doctor の JSON も非契約（内部形式。将来予告なく変更あり）です。フィールドは例であり固定ではありません。短い例:

```json
{
  "tool": "qfai",
  "checks": [
    {
      "id": "config.search",
      "severity": "ok",
      "message": "qfai.config.yaml found"
    }
  ]
}
```

`init --yes` は予約フラグです（現行の init は非対話のため挙動差はありません）。既存ファイルがある場合は `--force` が必要です。

## 設定

設定はリポジトリ直下の `qfai.config.yaml` で行います。
命名規約は `docs/rules/naming.md` を参照してください。

## 契約（Contracts）

Spec では `QFAI-CONTRACT-REF:` 行で参照する契約IDを宣言します（`none` 可）。Spec の先頭 H1 に `SPEC-xxxx` が必須です。
Scenario では `# QFAI-CONTRACT-REF:` のコメント行で契約参照を宣言します（`none` 可）。
契約ファイルは `QFAI-CONTRACT-ID: <ID>` を **1ファイル1ID** で宣言します。
`validate.json` / `report` の file path は root 相対で出力します（absolute は出力しません）。

## Monorepo / サブディレクトリ

- `--root` 未指定時は cwd から親へ `qfai.config.yaml` を探索します（見つからない場合は defaultConfig + warning）。
- monorepo ではパッケージ単位に `qfai.config.yaml` を置くか、`--root` で明示します。
- `paths.outDir` はパッケージごとに分け、`out/` の衝突を避けてください。

例（pnpm workspace）:

```text
packages/<app-a>/qfai.config.yaml   # paths.outDir: .qfai/out/<app-a>
packages/<app-b>/qfai.config.yaml   # paths.outDir: .qfai/out/<app-b>
```

## CI と Hard Gate

- 「CIで検出する」= `validate` が issue を出す（info/warning/error を含む）
- 「Hard Gate」= `--fail-on error` で CI を停止する領域
- Spec→下流参照禁止は Hard Gate にしない（検出する場合でも warning に留める）

SC→Test の参照はテストコード内の `QFAI:SC-xxxx` アノテーションで宣言します。
SC→Test の対象ファイルは `validation.traceability.testFileGlobs` で指定します。
除外は `validation.traceability.testFileExcludeGlobs` で指定できます。
SC→Test 検証は `validation.traceability.scMustHaveTest` と
`validation.traceability.scNoTestSeverity` で制御できます。

- `validation.traceability.testFileGlobs`: SC→Test 判定に使用するテストファイル glob（配列）
- `validation.traceability.testFileExcludeGlobs`: 追加の除外 glob（配列、任意）
- `validation.traceability.scMustHaveTest`: SC→Test 検証の有効/無効を制御（`true` で有効、`false` で無効）
- `validation.traceability.scNoTestSeverity`: SC 未参照時の重要度を指定（`error` / `warning`）

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

validate.json のスキーマと例は `docs/schema` / `docs/examples` を参照してください。
PromptPack は非契約（互換保証なし）です。編集する場合はラップ運用を推奨します。

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
    qfai-generate-test-globs.md
    qfai-maintain-traceability.md
    qfai-maintain-contracts.md
    qfai-classify-change.md
  prompts.local/
    README.md
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

```sh
pnpm install
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
pnpm test:assets
```

## ライセンス

[MIT](./LICENSE)
