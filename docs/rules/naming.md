# 命名規約（v0.3.3）

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

- v0.3.1 では標準構造に含めない（OQ 継続）
- ADR を扱う場合の配置は v0.4+ で再検討
