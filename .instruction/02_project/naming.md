---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# 命名規約

## 原則

- 参照の正は ID であり、ファイル名は補助情報。
- Business flows group user stories; examples cite their acceptance criterion,
  and contract rules cite examples.
- Use `.qfai/spec/` as the configured `paths.specsDir`. Its policy, flow and
  contract layers are described below.

## Story-tree files

```text
.qfai/spec/
  decisions.md
  open-questions.md
  01_policy/
    objective.md
    initiative.md
    principle.md
    glossary.md
    constraint.md
  02_business-flow/
    business-flows.md
    business-flow-NNNN/
      business-flow.md
      user-stories.md
      user-story-NNNN-NNNN/
        01_User-story.md
        02_Acceptance-Criteria.md
        03_Example.md
  03_contract/
    contracts.md
    tech.md
    structure.md
    api/ db/ ui/ cli/ design/
```

The story-tree validator checks required files and rejects nested story
directories. The former spec-pack layout raises `QFAI-LAYOUT-001`.

## ID 形式

- business flow: `BF-0001`
- user story: `US-0001-0001` under `BF-0001`
- acceptance criterion: `AC-0001-0001-01` under its story
- example: `EX-0001-0001-01` with one `AC-Ref`
- business rule: `BR-0001` in a contract, citing its examples
- decision and open question: `DEC-0001`, `OQ-0001`
- explicit decision guardrail: `DG-0001` in policy or contract Markdown

## Contracts

- API, DB, UI and design contracts retain one appropriate
  `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` declaration.
- CLI contracts use `CLI-*` short IDs in `03_contract/contracts.md`.

## Examples and test annotations

- `03_Example.md` uses `EX-ID | AC-Ref | Input | Expected` rows.
- E2E tests annotate `QFAI:BF-0001`; integration and API tests annotate
  `QFAI:AC-0001-0001-01`; selected non-E2E tests annotate
  `QFAI:EX-0001-0001-01`.
