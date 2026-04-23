# 05 Contracts

## Purpose

- `.qfai/contracts/**` を downstream execution の SSOT として扱う。
- discussion pack は planner artifact であり、`/qfai-sdd` 以降の skill は contracts を primary truth とする。
- 本ファイルは current-active な contract family を定義する。

## Active Contract Sets

### Design Contracts

| Short ID | Entity                | Declared ID           | File                                                | Purpose                                                |
| -------- | --------------------- | --------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| DCON-001 | Exploration Brief     | exploration-brief     | `.qfai/contracts/design/exploration-brief.yaml`     | exploration 条件、must-keep、brand signals の SSOT     |
| DCON-002 | Evaluation Rubric     | evaluation-rubric     | `.qfai/contracts/design/evaluation-rubric.yaml`     | evaluator 軸と hard floor / weighted pressure の SSOT  |
| DCON-003 | Evaluator Calibration | evaluator-calibration | `.qfai/contracts/design/evaluator-calibration.yaml` | critique quality の較正ルール                          |
| DCON-004 | Selected Direction    | selected-direction    | `.qfai/contracts/design/selected-direction.yaml`    | winner direction と carry-forward rules の SSOT        |
| DCON-005 | Design System         | design-system         | `.qfai/contracts/design/design-system.yaml`         | winner から抽出された downstream design system の SSOT |

### UI Contracts

| Short ID  | Entity           | Declared ID | File                        | Purpose                                                            |
| --------- | ---------------- | ----------- | --------------------------- | ------------------------------------------------------------------ |
| UICON-001 | Screen Contracts | screens     | `.qfai/contracts/ui/*.yaml` | screen 単位 obligations / evidence expectation / route 参照の SSOT |

### Evidence Contracts

| Short ID   | Entity                | File                               | Purpose                                                |
| ---------- | --------------------- | ---------------------------------- | ------------------------------------------------------ |
| EVID-DCON1 | Breakthrough Evidence | `.qfai/evidence/breakthrough.json` | plateau detector 判定と branch 実行証跡の canonical 先 |

### DB Contracts

0 items

QFAI 自体はデータベースを使用しない。

### API Contracts

0 items

QFAI 自体は外部公開 API を持たない。

## Mapping Rules

- discussion の `uiux/30_exploration_brief.md` は `/qfai-sdd` により `DCON-001` に正規化される。
- discussion の `uiux/33_exploration_rubric.md` は `/qfai-sdd` により `DCON-002` に正規化される。
- discussion の `uiux/34_evaluator_calibration.md` は `/qfai-sdd` により `DCON-003` に正規化される。
- discussion の `uiux/40_screen_contracts.md` は `/qfai-sdd` により `UICON-001` に正規化される。
- `DCON-004` と `DCON-005` は discussion では確定しない。`/qfai-prototyping` の direction funnel と winner selection の後で生成・更新される。
- `/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement`, `/qfai-verify`, `qfai validate` は原則として上記 contract 群を読み、discussion pack を直接 truth source にしてはならない。

## Current Posture

- contract-first downstream を採用する。
- discussion-side UIUX artifacts は upstream discovery / authoring artifact であり、execution truth ではない。
- downstream skill が design / UI 評価を行うときの正式入力は `specs + .qfai/contracts/design/** + .qfai/contracts/ui/** + required evidence` である。
- screenshot / HTML evidence は contract から導かれる declared screen ごとに揃う必要がある。
- design system は prototyping 後半で winner から抽出される出力であり、discussion 初期入力ではない。
