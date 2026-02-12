# 命名規約

## 原則

- 参照の正は ID であり、ファイル名は補助情報。
- 参照は下位から上位のみ許可（上位から下位は禁止）。
- Spec Pack は `.qfai/specs/spec-0001/` 形式（4桁連番）。

## Spec Pack 必須ファイル

```text
01_Spec.md
02_Objective.md
03_Initiative.md
04_Capability.md
05_Business-flow.feature
06_User-stories.md
07_Acceptance-criteria.md
08_Business-rules.md
09_Examples.feature
10_Test-cases.md
11_Contracts.md
12_Glossary.md
13_Constraints.md
14_Decisions.md
15_Open-questions.md
16_Traceability-ledger.md
17_Plan.md
18_delta.md
```

## ID 形式

- 上位: `OBJ-0001`, `INIT-0001`, `CAP-0001`, `FLOW-0001`, `US-0001`
- 下位: `AC-0001`, `BR-0001`, `EX-0001`, `TC-0001`
- 契約: `CON-UI-0001`, `CON-API-0001`, `CON-DB-0001`
- 横断: `TERM-0001`, `ADR-0001`, `NFR-0001`, `OQ-0001`
- Ledger 行ID: `TR-0001`

## Ledger ルール（16_Traceability-ledger.md）

- 列名は `trace_id,obj_id,init_id,cap_id,flow_id,us_id,ac_id,ex_ids,tc_ids` を必須とする。
- `con_ids` と `notes` は任意。
- 多値列（`ex_ids`,`tc_ids`,`con_ids`）は `;` 区切り。

## Contracts

- 契約ファイル先頭に `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` を1つ記載する。
- `ui/` は `CON-UI-*`、`api/` は `CON-API-*`、`db/` は `CON-DB-*` を使う。

## Examples（09_Examples.feature）

- Feature は1件のみ。
- 各 Scenario に `@EX-*`、`@AC-*`、`@layer-*` を必須で付与する。
- `@layer-*` は test-layer policy（`.qfai/assistant/steering/test-layers.md`）に一致させる。
