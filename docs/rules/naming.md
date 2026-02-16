# 命名規約

## 原則

- 参照の正は ID であり、ファイル名は補助情報。
- 参照は下位から上位のみ許可（上位から下位は禁止）。
- spec は `.qfai/specs/spec-0001/` 形式（4桁連番）。
- 分割ルールは **1 CAP = 1 spec**（`spec-0001 = CAP-0001`）。

## レイヤード spec 必須ファイル

```text
.qfai/specs/_shared/
  01_Objective.md
  02_Initiative.md
  03_Capabilities.md
  04_Business-flow.md
  05_Contracts.md
  06_Glossary.md
  07_Constraints.md

.qfai/specs/spec-XXXX/
  01_Spec.md
  02_User-stories.md
  03_Acceptance-criteria.md
  04_Business-rules.md
  05_Examples.feature
  06_Test-cases.md
```

## ID 形式

- shared: `CAP-0001`
- spec root: `spec-0001` + `Parent: CAP-0001`
- user-story: `US-0001` + `Parent: CAP-0001`
- acceptance-criteria: `AC-0001` + `Parent: US-0001`
- business-rule: `BR-0001` + `Parent: AC-0001`
- examples(gherkin): `@EX-0001` + `# Parent: BR-0001`（または `AC-0001`）
- test-case: `TC-0001` + `Parent: EX-0001`

## Contracts

- 契約ファイル先頭に `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` を1つ記載する。
- `ui/` は `CON-UI-*`、`api/` は `CON-API-*`、`db/` は `CON-DB-*` を使う。

## Examples（05_Examples.feature）

- Feature は1件のみ。
- 各 Scenario は `@EX-*` を1件持つ。
- 各 Scenario ブロックに `# Parent: BR-*|AC-*` を必ず記載する。
