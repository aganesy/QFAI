# QFAI Toolkit

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

- `npx qfai init` によるテンプレート生成（specs/contracts に加え、`.qfai/require/README.md`、`.qfai/rules/pnpm.md`、`.qfai/prompts/require-to-spec.md`、`.qfai/prompts/qfai-generate-test-globs.md`、`.qfai/prompts/qfai-maintain-traceability.md`、`.qfai/prompts/qfai-maintain-contracts.md`、`.qfai/prompts/qfai-classify-change.md`、`.qfai/promptpack/` を含む）
- `npx qfai validate` による `.qfai/` 内ドキュメントの整合性・トレーサビリティ検査
- `npx qfai validate` による SC→Test 参照の検証（`validation.traceability.testFileGlobs` に一致するテストファイルから `QFAI:SC-xxxx` を抽出）
- `npx qfai doctor` による設定/探索/パス/glob/validate.json の事前診断
- `npx qfai report` によるレポート出力

## Usage

`validate` は `--fail-on` / `--strict` によって CI ゲート化できます。`validate` は常に `.qfai/out/validate.json`（`output.validateJsonPath`）へ JSON を出力し、`--format` は表示形式（text/github）のみを制御します。
`report` は `.qfai/out/validate.json` を読み、既定で `.qfai/out/report.md` を出力します（`--format json` の場合は `.qfai/out/report.json`）。出力先は `--out` で変更できます。入力パスは固定です。
`doctor` は validate/report の前段で設定/探索/パス/glob/validate.json を診断します。`--format text|json`、`--out` をサポートします。
`init --yes` は予約フラグです（現行の init は非対話のため挙動差はありません）。既存ファイルがある場合は `--force` が必要です。
`report.json` は experimental（互換保証なし）として扱います。`reportFormatVersion` を含み、破壊的変更時のみ増分します。

設定はリポジトリ直下の `qfai.config.yaml` で行います。
命名規約は `docs/rules/naming.md` を参照してください。

## Contracts

Spec では `QFAI-CONTRACT-REF:` 行で参照する契約IDを宣言します（`none` 可、宣言行は必須）。
Scenario では `# QFAI-CONTRACT-REF:` のコメント行で契約参照を宣言します（`none` 可、宣言行は必須）。
契約ファイルは `QFAI-CONTRACT-ID: <ID>` を **1ファイル1ID** で宣言します。
Contract ID prefix は `UI-0001` / `API-0001` / `DB-0001` です。
宣言では大文字（`UI-0001`）、ファイル名は小文字（`ui-0001-...`）を使用します。

契約関連の検証は `validation.traceability` で制御します。

- `validation.traceability.orphanContractsPolicy`: Spec から参照されない契約の扱い（default: `error`、`error` / `warning` / `allow`）
- `validation.traceability.unknownContractIdSeverity`: Scenario が参照した契約 ID が存在しない場合の severity（default: `error`、`error` / `warning` のみ）
- Spec の `QFAI-CONTRACT-REF` が未知 ID を参照した場合は常に error（`QFAI-TRACE-024`）
- `unknownContractIdSeverity` は Scenario 側（`QFAI-TRACE-008`）のみを制御

`npx qfai init` は `.qfai/contracts/` 配下に UI/API/DB のサンプルを生成します。

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
