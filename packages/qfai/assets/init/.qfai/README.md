# QFAI Project Kit (.qfai)

このディレクトリは QFAI の成果物を集約する専用領域です。`.qfai` 配下だけを見れば「何を書くか」「どこから始めるか」が分かる構成にしています。

## 最短成功（doctor → validate → report）

```bash
npx qfai doctor --fail-on error
npx qfai validate --fail-on error --format github
npx qfai report
```

`validate.json` が無い場合は `npx qfai report --run-validate` を使うか、
`--in <path>` で入力ファイルを指定してください。

## トレーサビリティ（SC→Test）

- `validation.traceability.testFileGlobs` に一致するテストコードで `QFAI:SC-xxxx` を参照する（コメント可）
- Spec→Contract は `spec.md` の `QFAI-CONTRACT-REF` 行で宣言する
- Scenario→Contract は `scenario.md` の `# QFAI-CONTRACT-REF` で宣言する（none 可）

## ディレクトリ概要

- `specs/` : Spec Pack（spec.md / delta.md / scenario.md）
- `contracts/` : UI / API / DB 契約を置く場所
- `require/` : 既存要件の集約（validate 対象外）
- `rules/` : 規約・運用ルール
- `prompts/` : QFAI 標準のプロンプト資産（自動読取はしない。更新や再 init で上書きされ得る）
- `prompts.local/` : 利用者カスタムのプロンプト資産（存在する場合は overlay でこちらを優先して読む運用）
- `promptpack/` : PromptPack（SSOT、運用ルール/観点の正本）
- `out/` : `validate` / `report` の出力先（gitignore 推奨）

詳細は各 README を参照してください。

- `specs/README.md`
- `contracts/README.md`
- `require/README.md`
- `rules/conventions.md`
- `rules/pnpm.md`
- `prompts/README.md`
- `prompts.local/README.md`
- `prompts/require-to-spec.md`
- `prompts/qfai-generate-test-globs.md`
- `prompts/qfai-maintain-traceability.md`
- `prompts/qfai-maintain-contracts.md`
- `prompts/qfai-classify-change.md`
- `promptpack/constitution.md`
- `out/README.md`

## 設定と CI

- 設定ファイル: `qfai.config.yaml`（リポジトリ直下）
- CI テンプレ: `.github/workflows/qfai.yml`
- monorepo では `paths.outDir` をパッケージ単位に分けて衝突を避ける

## Prompts の使い方（重要）

`prompts/` は **人間が手動で使う資産**です。現時点では自動読取は行いません（将来のバージョンで CLI 連携を検討します）。

v0.7 以降、プロンプト資産のカスタマイズは `.qfai/prompts.local/**` に集約します（overlay 運用）。

- `.qfai/prompts/**` は QFAI 標準資産であり、更新や `qfai init` 再実行で上書きされ得ます
- 利用者が `.qfai/prompts/**` を直接編集することは非推奨・非サポートです
- 変更したい場合は同一相対パスで `.qfai/prompts.local/**` に置いて上書きしてください

例:

- Copilot: `.github/copilot-instructions.md` に要旨を転記
- Claude: `CLAUDE.md` に要旨を転記
- Codex: `AGENTS.md` に要旨を転記

詳細は `prompts/README.md` を参照してください。

## PromptPack の使い方（重要）

`promptpack/` は **運用ルール/観点の正本**です。自動読取は行わず、必要な章を手動で参照・転記します。

- 入口: `promptpack/constitution.md`
- 手動配置の例: Copilot/Claude/Codex 向けの指示ファイル
- PromptPack は非契約です（互換保証なし）。編集する場合はラップ運用や差分管理を推奨します。
