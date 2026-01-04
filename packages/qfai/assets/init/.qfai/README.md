# QFAI Project Kit (.qfai)

このディレクトリは QFAI の成果物を集約する専用領域です。`.qfai` 配下だけを見れば「何を書くか」「どこから始めるか」が分かる構成にしています。

## 最短成功（init → validate → report）

```bash
npx qfai validate --fail-on error --format github
npx qfai report
```

## トレーサビリティ（SC→Test）

- `validation.traceability.testFileGlobs` に一致するテストコードで `QFAI:SC-xxxx` を参照する（コメント可）
- Spec→Contract は `spec.md` の `QFAI-CONTRACT-REF` 行で宣言する
- Scenario→Contract は `scenario.md` の `# QFAI-CONTRACT-REF` で宣言する（none 可）

## ディレクトリ概要

- `specs/` : Spec Pack（spec.md / delta.md / scenario.md）
- `contracts/` : UI / API / DB 契約を置く場所
- `require/` : 既存要件の集約（validate 対象外）
- `rules/` : 規約・運用ルール
- `prompts/` : 生成プロンプト資産（自動読取はしない）
- `promptpack/` : PromptPack（SSOT、運用ルール/観点の正本）
- `out/` : `validate` / `report` の出力先（gitignore 推奨）

詳細は各 README を参照してください。

- `specs/README.md`
- `contracts/README.md`
- `require/README.md`
- `rules/conventions.md`
- `rules/pnpm.md`
- `prompts/README.md`
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

## Prompts の使い方（重要）

`prompts/` は **人間が手動で使う資産**です。現時点では自動読取は行いません（将来のバージョンで CLI 連携を検討します）。

例:

- Copilot: `.github/copilot-instructions.md` に要旨を転記
- Claude: `CLAUDE.md` に要旨を転記
- Codex: `AGENTS.md` に要旨を転記

詳細は `prompts/README.md` を参照してください。

## PromptPack の使い方（重要）

`promptpack/` は **運用ルール/観点の正本**です。自動読取は行わず、必要な章を手動で参照・転記します。

- 入口: `promptpack/constitution.md`
- 手動配置の例: Copilot/Claude/Codex 向けの指示ファイル
