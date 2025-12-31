# QFAI Toolkit (v0.3.3)

Single-package distribution for QFAI.

## Install

```
npm i -D qfai
```

## Quick Start

```
npx qfai init
npx qfai validate --fail-on error --format github
npx qfai report
```

## できること

- `npx qfai init` によるテンプレート生成（specs/contracts に加え、`require/README.md`、`.qfai/rules/pnpm.md`、`.qfai/prompts/require-to-spec.md` を含む）
- `npx qfai validate` による `.qfai/` 内ドキュメントの整合性・トレーサビリティ検査
- `npx qfai report` によるレポート出力

## Usage

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。`validate` は常に `.qfai/out/validate.json`（`output.validateJsonPath`）へ JSON を出力し、`--format` は表示形式（text/github）のみを制御します。
`report` は `.qfai/out/validate.json` を読み、既定で `.qfai/out/report.md` を出力します（`--format json` の場合は `.qfai/out/report.json`）。出力先は `--out` で変更できます。入力パスは固定です。
`init --yes` は予約フラグです（v0.3.1 の init は非対話のため挙動差はありません）。既存ファイルがある場合は `--force` が必要です。

設定はリポジトリ直下の `qfai.config.yaml` で行います。
命名規約は `docs/rules/naming.md` を参照してください。
