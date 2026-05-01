# 05 Contracts

## Purpose

- `.qfai/contracts/**` を downstream execution の SSOT として扱う。
- discussion pack は planner artifact であり、`/qfai-sdd` 以降の skill は contracts を primary truth とする。
- 本ファイルは current-active な contract family を定義する。

## Active Contract Sets

### Design Contracts

| Short ID | Entity                | Declared ID           | File                                                | Purpose                                                |
| -------- | --------------------- | --------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| DCON-001 | Exploration Brief     | exploration-brief     | `.qfai/contracts/design/exploration-brief.yaml`     | exploration 条件、brand signals の SSOT (v2.0: must-keep / non-goals 廃止) |
| DCON-002 | Evaluation Rubric     | evaluation-rubric     | `.qfai/contracts/design/evaluation-rubric.yaml`     | (DEPRECATED v2.0: 軸は code constants に移行、本 contract は P4 で削除予定 — spec-0017) |
| DCON-003 | Evaluator Calibration | evaluator-calibration | `.qfai/contracts/design/evaluator-calibration.yaml` | (DEPRECATED v2.0: ordinal scale + 散文 critique で代替、P4 で削除予定 — spec-0017) |
| DCON-004 | Selected Direction    | selected-direction    | `.qfai/contracts/design/selected-direction.yaml`    | (DEPRECATED v2.0: winner 選定なし、P4 で削除予定 — spec-0017) |
| DCON-005 | Design System         | design-system         | `.qfai/contracts/design/design-system.yaml`         | winner から抽出された downstream design system の SSOT |
| DCON-006 | Reference Pool        | reference-pool        | `.qfai/contracts/design/reference-pool.yaml`        | reviewer/generator が deviate-from 入力として参照する  |
| DCON-007 | Brand Design          | brand-design          | `.qfai/contracts/design/brand-design.yaml`          | brand 視覚情報の SSOT                                  |
| DCON-008 | Prototype Handoff     | prototype-handoff     | `.qfai/contracts/design/prototype-handoff.yaml`     | v2.0: finalIterIndex / finalArtifact / extractedDesignSystem / implementationNotes (mustPreserve/mayAdapt/mustNotCopy 三分類は v2.0 で廃止) |

### UI Contracts

| Short ID  | Entity           | Declared ID | File                        | Purpose                                                            |
| --------- | ---------------- | ----------- | --------------------------- | ------------------------------------------------------------------ |
| UICON-001 | Screen Contracts | screens     | `.qfai/contracts/ui/*.yaml` | screen 単位 obligations / evidence expectation / route 参照の SSOT |

### Evidence Contracts

| Short ID   | Entity                | File                               | Purpose                                                |
| ---------- | --------------------- | ---------------------------------- | ------------------------------------------------------ |
| EVID-DCON1 | Breakthrough Evidence | `.qfai/evidence/breakthrough.json` | (DEPRECATED v2.0: plateau detector / branchPlanner 廃止に伴い P4 で削除予定 — spec-0017) |
| EVID-PROT2 | Prototyping Evidence  | `.qfai/evidence/prototyping/`      | v2.0: iter-NN/{<screen>.png,<screen>.html,review.json} + prototyping.json + completion-certificate.json |

### DB Contracts

0 items

QFAI 自体はデータベースを使用しない。

### API Contracts

0 items

QFAI 自体は外部公開 API を持たない。

## Mapping Rules

- discussion の `uiux/30_exploration_brief.md` は `/qfai-sdd` により `DCON-001` に正規化される。
- discussion の `uiux/31_reference_pool.md` は `/qfai-sdd` により `DCON-006` に正規化される。
- discussion の `uiux/32_design_anti_goals.md` は exploration-brief / reference-pool に取り込まれる（v2.0: 専用 contract は作らない）。
- discussion の `uiux/40_screen_contracts.md` は `/qfai-sdd` により `UICON-001` に正規化される。
- v2.0: `uiux/33_exploration_rubric.md` と `uiux/34_evaluator_calibration.md` は廃止（`/qfai-discussion` で生成しない）。`DCON-002`, `DCON-003` は P4 で物理削除。
- v2.0: `DCON-005` (design-system) と `DCON-008` (prototype-handoff) は `/qfai-prototyping` の最終 iter HTML から post-loop に抽出・生成される。
- v2.0: `DCON-004` (selected-direction) は P4 で物理削除（winner 選定の概念がないため）。
- `/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement`, `/qfai-verify`, `qfai validate` は原則として上記 contract 群を読み、discussion pack を直接 truth source にしてはならない。

## Current Posture

- contract-first downstream を採用する。
- discussion-side UIUX artifacts は upstream discovery / authoring artifact であり、execution truth ではない。
- downstream skill が design / UI 評価を行うときの正式入力は `specs + .qfai/contracts/design/** + .qfai/contracts/ui/** + required evidence` である。
- screenshot / HTML evidence は contract から導かれる declared screen ごとに揃う必要がある。
- design system は prototyping 後半で final iter から抽出される出力であり、discussion 初期入力ではない。

## v2.0 Migration (spec-0017)

- 削除対象 contracts (P4): `DCON-002`, `DCON-003`, `DCON-004`, `EVID-DCON1`
- 簡素化 contracts (P1+P10): `DCON-001` (must-keep / non-goals 廃止)、`DCON-008` (mustPreserve/mayAdapt/mustNotCopy 廃止)
- 評価軸は code constants `packages/qfai/src/core/prototyping/iteration.ts#OrdinalScore` に固定。
- anti-slop パターンリストは `qfai-prototyping/references/reviewer-prompt.md` に常駐（contract 化しない）。
