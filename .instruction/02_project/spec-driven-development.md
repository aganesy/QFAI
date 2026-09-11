---
category: project
update-frequency: occasional
dependencies:
  - 00_universal/thinking.md
  - 00_universal/quality.md
  - 00_universal/communication.md
  - 01_specialties/planning.md
  - 01_specialties/testing.md
  - 02_project/development.md
  - 02_project/tech-stack.md
  - 02_project/patterns.md
version: 1.0.0
---

# 仕様書駆動開発（QFAI Toolkit）運用ガイド

QFAI は `.qfai/` 配下の成果物を SSOT として扱い、検証とレポートで整合性を担保する。
契約参照の SSOT は Spec（QFAI-CONTRACT-REF）とする。

## 全体フロー（成果物ベース）

```text
.qfai/discussion（任意の上流入力）
        ↓
.qfai/specs（_policies + spec-NNNN）
        ↓
.qfai/contracts（ui / api / db / design）
        ↓
qfai validate → .qfai/report/validate.json
        ↓
qfai report → .qfai/report/report.md
```

## フェーズ別の要点

### Phase 0: 要件の取り込み

- A discussion pack under `.qfai/discussion/` is the usual input, and it is
  optional. A spec set taken in without one is recorded as import-lite evidence
  instead.

### Phase 1: Spec Pack 作成

- 配置: `.qfai/specs/spec-NNNN/`
- The required files are `01_Spec.md` through `09_delta.md`, plus `10_Plan.md`.
  `_policies/` requires `01_Objective.md` through `11_Slice-Policy.md`. Both sets
  are listed in `02_project/naming.md`, and `E_SPEC_MISSING_FILESET` reports a
  missing one.
- `09_delta.md` is append-only. It records what changed, and the Triage table
  records which requirement drove it and who approved the operation.

### Phase 2: Contracts の作成

- Place each contract under its kind's directory in `.qfai/contracts/`, with
  `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` at the top of the file.
- Keep the Contract Index in `_policies/05_Contracts.md` current. An indexed
  file that does not exist stops the run.

### Phase 3: 検証とレポート

- `npx qfai validate --fail-on error` でエラー 0 を確認
- `npx qfai report` でレポートを生成する

## 品質ゲート（最低限）

- Spec Pack が 1 つ以上存在する
- Every required file of each pack is present
- ID の形式が正しい（`spec-NNNN` / `US` / `AC` / `BR` / `EX` / `TC` / `CON-*`）
- The `AC → BR → EX → TC` chain resolves, with no reference to an unregistered ID
- Each spec declares its contract references
- `validate` の error が 0

## 実装に進む前の確認

- 既存の実装パターンは `.instruction/02_project/patterns.md` を参照
- 不明点が残る場合は実装せず質問する
