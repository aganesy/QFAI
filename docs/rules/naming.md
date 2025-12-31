# 命名規約

## 原則

- 参照の正は ID（SPEC/BR/SC/UI/API/DATA/ADR）であり、ファイル名ではない。
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
  - `scenario.md`

## Spec（spec.md）

- 先頭 H1: `# SPEC-0001: <Title>`（ID + タイトルを含む）
- BR 定義: `## 業務ルール` セクション内の `- [BR-0001][P1] ...`

## Scenario（scenario.md）

- Gherkin（Feature / Scenario / Scenario Outline）
- `@SPEC-xxxx` は Feature レベルに **ちょうど1つ**必要
- `@SC-xxxx` は Scenario レベルに **ちょうど1つ**必要
- `@BR-xxxx` は Scenario レベルに **1つ以上**必要

## Contracts

- UI: `contracts/ui/ui-0001-<slug>.yaml` または `.yml`
- API: `contracts/api/api-0001-<slug>.yaml` / `.yml` / `.json`
- DB（ID は `DATA-xxxx`）: `contracts/db/db-0001-<slug>.sql`

## ADR（Decision）

- 標準構成は `spec.md / delta.md / scenario.md` のみ。
- ADR 相当は `delta.md` で代替可能（Decision/Changes/Notes などで整理）。
- 追加で ADR が必要なら ID として `ADR-0001` 形式を使えるが、標準成果物には含めない。
