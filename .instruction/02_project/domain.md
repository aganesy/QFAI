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

- `.qfai/require/`: 上流要件の集約（入力 SSOT、validate の対象外）
- `.qfai/specs/`: Spec Pack（`spec.md` / `delta.md` / `scenario.md`）
- `.qfai/contracts/`: UI/API/DB 契約（`UI-xxxx` / `API-xxxx` / `DATA-xxxx`）
- `.qfai/rules/`: 規約（命名/互換維持など）
- `.qfai/prompts/` と `.qfai/promptpack/`: 仕様化のための補助資産
- `.qfai/out/`: `validate.json` と report の出力先
- `qfai.config.yaml`: パス/検証ルール/出力設定

## ID とトレーサビリティ

- ID 種別: `SPEC` / `BR` / `SC` / `UI` / `API` / `DATA`（参考 ID として `ADR`）
- Spec は `SPEC-xxxx` と `BR-xxxx` を定義する
- Scenario は `@SC-xxxx` と `@BR-xxxx` を持つ
- Traceability は **BR → SC → Contract** を基本とする

## 参照ルール（要点）

- `.qfai/require` は上流 SSOT として参照される側であり、下流を参照しない
- Spec は Scenario を参照しない（検証ルールで警告）
- Contract ID の形式・重複は validate で検証される

詳細な命名規約は `docs/rules/naming.md` を参照してください。
