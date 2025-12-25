# QFAI Toolkit (v0.2.4)

Single-package distribution for QFAI.

## Install

```
npm i -D qfai
```

## Quick Start

```
npx qfai init --yes
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

## Usage

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。
JSON 出力は `--json-path` 指定、または `qfai.config.yaml` の `output.format: json` で有効化できます。
`report` は `validate.json` が必須で、未生成の場合は exit code 2 で次の手順を案内します。
`report` の入力は `--json-path` が優先で、未指定の場合は `output.jsonPath` を使います。既定の出力は `.qfai/out/report.md`（`--format json` の場合は `.qfai/out/report.json`）です。
`init --yes` は非対話でデフォルトを採用します（現状の init は非対話が既定のため挙動は同じです。将来対話が導入されても自動で承認されます）。既存ファイルがある場合は `--force` が必要です。

設定はリポジトリ直下の `qfai.config.yaml` で行います。
