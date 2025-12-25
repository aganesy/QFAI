# QFAI Toolkit (v0.2.4)

Single-package distribution for QFAI.

## Install

```
npm i -D qfai
```

## Quick Start

```
npx qfai init
npx qfai validate --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json
```

## Usage

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。
`report` を実行するには `validate.json` が必要です。`validate` で JSON を出すには `--json-path` を指定するか、`qfai.config.yaml` の `output.format: json` を設定してください。

```
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

設定はリポジトリ直下の `qfai.config.yaml` で行います。

`report` は `--json-path` 未指定の場合、`qfai.config.yaml` の `output.jsonPath` を入力にします。既定の出力は `.qfai/out/report.md`（`--format json` の場合は `.qfai/out/report.json`）です。

`init --yes` は非対話でデフォルトを採用します（現状の init は非対話が既定のため挙動は同じです。将来対話が導入されても自動で承認されます）。既存ファイルがある場合は `--force` が必要です。

`report` は `validate.json` が無い場合、exit code 2 で次の手順を案内します。例: `qfai validate --json-path .qfai/out/validate.json`
