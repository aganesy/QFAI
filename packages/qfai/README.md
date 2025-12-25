# QFAI Toolkit (v0.2.2)

Single-package distribution for QFAI.

## Install

```
npm i -D qfai
```

## Usage

```
npx qfai init
npx qfai validate
npx qfai report
```

```
npx qfai validate --fail-on error --format github --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

設定はリポジトリ直下の `qfai.config.yaml` で行います。

`report` は `.qfai/out/validate.json` を入力にし、既定で `.qfai/out/report.md` を出力します。
