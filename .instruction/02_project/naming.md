---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 命名規約

## 原則

- 参照の正は ID であり、ファイル名は補助情報。
- 参照は下位から上位のみ許可（上位から下位は禁止）。
- spec は `.qfai/specs/spec-0001/` 形式（4桁連番）。
- 分割ルールは **1 CAP = 1 spec**（`spec-0001 = CAP-0001`）。

## レイヤード spec 必須ファイル

```text
.qfai/specs/_policies/
  01_Objective.md
  02_Initiative.md
  03_Capabilities.md
  04_Business-Flow.md
  05_Contracts.md
  06_Glossary.md
  07_Constraints.md
  08_Decisions.md
  09_Open-questions.md
  10_delta.md

.qfai/specs/spec-XXXX/
  01_Spec.md
  02_User-stories.md
  03_Acceptance-Criteria.md
  04_Business-Rules.md
  05_Examples.md
  06_Test-Cases.md
  07_Decisions.md
  08_Open-questions.md
  09_delta.md
```

## ID 形式

- policies: `CAP-0001`
- spec root: `spec-0001` + `Parent: CAP-0001`
- user-story: `US-0001` + `Parent: CAP-0001`
- acceptance-criteria: `AC-0001`（Gherkinコメント または テーブル `AC-ID`）
- business-rule: `BR-0001` + `AC-Refs: AC-0001, AC-0002`
- examples: `EX-0001` + `BR-Ref: BR-0001`
- test-case: `TC-0001` + `AC-Refs: AC-0001` + `EX-Ref: EX-0001`

## Contracts

- 契約ファイル先頭に `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` を1つ記載する。
- `ui/` は `CON-UI-*`、`api/` は `CON-API-*`、`db/` は `CON-DB-*` を使う。

## Examples（05_Examples.md）

- テーブルで `EX-ID | BR-Ref | Input | Expected | Notes` を記述する。
- 各 EX は `BR-Ref` を必須とする。
