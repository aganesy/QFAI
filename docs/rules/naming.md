# 命名規約

## 原則

- 参照の正は ID（SPEC/BR/SC/UI/API/DB/ADR）であり、ファイル名ではない。
- ファイル名の slug は可読性の補助として扱う。
- 参照は必ず ID を用いる。
- ID は `PREFIX-0001` の形式（4 桁ゼロ埋め）。
- 同一 ID の重複定義は禁止（Spec/Scenario/Contracts の定義IDは一意）。

## Spec Pack

- 配置: `.qfai/specs/spec-0001/`
- ディレクトリ名: `spec-0001`（4桁連番）
- Spec ID: `SPEC-0001`（4桁。ディレクトリ番号とは別）
- ファイル:
  - `spec.md`
  - `delta.md`
  - `scenario.feature`

## Spec（spec.md）

- 先頭 H1: `# SPEC-0001: <Title>`（ID + タイトルを含む）
- BR 定義: `## 業務ルール` セクション内の `- [BR-0001][P1] ...`
- 契約参照: `QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001`（不要なら `none`）

## Scenario（scenario.feature）

- Gherkin（Feature / Scenario / Scenario Outline）
- 1ファイル = 1 Scenario（Scenario Outline 含む）
- `# QFAI-CONTRACT-REF: ...` をコメント行で **必須宣言**（参照なしは `none`）
- `@SPEC-xxxx` は Feature レベルに **ちょうど1つ**必要
- `@SC-xxxx` は Scenario レベルに **ちょうど1つ**必要
- `@BR-xxxx` は Scenario レベルに **1つ以上**必要

## テストアノテーション

- SC→Test はアノテーションで宣言する（例: `QFAI:SC-0001`）
- `validation.traceability.testFileGlobs` に一致するテストファイルに記載する

## Contracts

- UI: `.qfai/contracts/ui/ui-0001-<slug>.yaml` または `.yml`
- API: `.qfai/contracts/api/api-0001-<slug>.yaml` / `.yml` / `.json`
- DB（ID は `DB-xxxx`）: `.qfai/contracts/db/db-0001-<slug>.sql`
- 契約ファイルには `QFAI-CONTRACT-ID: <ID>` の宣言行を1つ記載する
- 配置ディレクトリと ID prefix（UI/API/DB）は一致させる

## ADR（Decision）

- 標準構成は `spec.md / delta.md / scenario.feature` のみ。
- ADR 相当は `delta.md` で代替可能（Decision/Changes/Notes などで整理）。
- 追加で ADR が必要なら ID として `ADR-0001` 形式を使えるが、標準成果物には含めない。
