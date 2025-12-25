# QFAI Toolkit (v0.2.3)

Single-package distribution for QFAI.

## Install

```
npm i -D qfai
```

## Usage

```
npx qfai init
npx qfai init --yes
npx qfai validate
npx qfai report
```

```
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

設定はリポジトリ直下の `qfai.config.yaml` で行います。

`report` は `.qfai/out/validate.json` を入力にし、既定で `.qfai/out/report.md` を出力します。

`init --yes` は非対話でデフォルトを採用します（現状の init は非対話が既定のため挙動は同じです。将来対話が導入されても自動で承認されます）。既存ファイルがある場合は `--force` が必要です。

`report` は `validate.json` が無い場合、exit code 2 で次の手順を案内します。
