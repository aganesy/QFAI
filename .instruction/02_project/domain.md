---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# ドメイン概要（QFAI Toolkit）

QFAI は「要件 → 仕様 → 契約 → 検証/レポート」の流れを支える仕様書駆動のツールキットです。

## 主な構成要素

- `.qfai/specs/`: the spec packs. `_policies/` carries the cross-spec layer and
  each `spec-NNNN/` its own; both file sets are listed in `02_project/naming.md`.
- `.qfai/contracts/`: the contracts, one directory per kind. A contract file
  declares `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>`.
- `.qfai/discussion/`: discussion packs, the optional upstream input to a spec.
- `.qfai/assistant/`: the assistant tree — `constitution/`, `manifest/`,
  `catalog/`, `skills/`, `agents/`, `process/`.
- `.qfai/evidence/`: the per-run evidence a skill is required to write.
- `.qfai/decisions/`, `.qfai/steering/`, `.qfai/review/`: decision records,
  steering input, and review packs.
- `.qfai/report/`: where `validate` and `report` write.
- `qfai.config.yaml`: パス/検証ルール/出力設定

## ID とトレーサビリティ

The chain is `REQ → US → AC → BR → EX → TC`, each link declared by the
downstream item.

| ID          | Declared in                    | Carries                     |
| ----------- | ------------------------------ | --------------------------- |
| `CAP-NNNN`  | `_policies/03_Capabilities.md` | the spec that implements it |
| `spec-NNNN` | `01_Spec.md`                   | `Parent: CAP-NNNN`          |
| `US-NNNN`   | `02_User-stories.md`           | `Parent: CAP-NNNN`          |
| `AC-NNNN`   | `03_Acceptance-Criteria.md`    | —                           |
| `BR-NNNN`   | `04_Business-Rules.md`         | `AC-Refs`                   |
| `EX-NNNN`   | `05_Examples.md`               | `BR-Ref`                    |
| `TC-NNNN`   | `06_Test-Cases.md`             | `AC-Refs`, `EX-Ref`         |

Contract IDs are `CON-UI-*`, `CON-API-*` and `CON-DB-*`, one per contract file.
`validate` checks their shape and reports duplicates.

Full grammar: `02_project/naming.md`.

詳細な命名規約は `02_project/naming.md` を参照してください。
