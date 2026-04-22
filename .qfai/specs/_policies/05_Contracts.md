# 05 Contracts

## Purpose

- `.qfai/contracts/**` を downstream execution の SSOT として扱う。
- discussion pack は `/qfai-sdd` の入力専用であり、`/qfai-sdd` 以降の skill は discussion を直接読まない。
- 本ファイルは policy-layer の contract index と posture を定義する。

## Active Contract Sets

### Design Contracts

| Short ID | Entity           | Declared ID      | File                                           | Purpose                                                                |
| -------- | ---------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| DCON-001 | Design System    | design-system    | `.qfai/contracts/design/design-system.yaml`    | downstream design-system checklist の SSOT                             |
| DCON-002 | Evaluation Axes  | evaluation-axes  | `.qfai/contracts/design/evaluation-axes.yaml`  | invariant / trend-derived / product-specific / aggregate rules の SSOT |
| DCON-003 | Anchor Selection | anchor-selection | `.qfai/contracts/design/anchor-selection.yaml` | selected anchor / comparison outcome の downstream 参照                |

### UI Contracts

| Short ID  | Entity           | Declared ID | File                        | Purpose                                                            |
| --------- | ---------------- | ----------- | --------------------------- | ------------------------------------------------------------------ |
| UICON-001 | Screen Contracts | screens     | `.qfai/contracts/ui/*.yaml` | screen 単位 obligations / evidence expectation / route 参照の SSOT |

### DB Contracts

0 items

QFAI 自体はデータベースを使用しない。

### API Contracts

0 items

QFAI 自体は外部公開 API を持たない。

## Mapping Rules

- discussion の `uiux/12_design_system.md` は `/qfai-sdd` により `DCON-001` に正規化される。
- discussion の `uiux/20_design_eval_invariant.md`, `21_design_eval_trend_derived.md`, `22_design_eval_product_specific.md`, `23_design_eval_aggregate.md` は `/qfai-sdd` により `DCON-002` に正規化される。
- discussion の `uiux/30_option_comparison.md` と `31_selected_anchor_screen.md` の downstream 必要情報は `/qfai-sdd` により `DCON-003` に正規化される。
- discussion の `uiux/40_screen_contracts.md` は `/qfai-sdd` により `UICON-001` に正規化される。
- `/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement`, `/qfai-verify`, `qfai validate` は原則として上記 contract 群を読み、discussion pack を直接 truth source にしてはならない。
- discussion 側 validator は `/qfai-discussion` と `/qfai-sdd` preflight 用であり、repo-root downstream validate の primary path ではない。

## Current Posture

- contract-first downstream を採用する。
- discussion-side UIUX artifacts は upstream discovery / authoring artifact であり、execution truth ではない。
- downstream skill が design / UI 評価を行うときの正式入力は `specs + .qfai/contracts/design/** + .qfai/contracts/ui/**` である。
- screenshot / HTML evidence は contract から導かれる declared screen ごとに揃う必要がある。

## Historical Notes

- 旧来の「Contract Index は 0 items」「discussion sidecar は internal-only なので downstream truth を持たない」という整理は、QFAI 自体の外部 API/DB/UI contract には今も当てはまる。
- ただし現行は、対象プロジェクト向けの downstream execution contract を `.qfai/contracts/design/**` と `.qfai/contracts/ui/**` に正式昇格させている。
- したがって本ファイルの `0 items` posture は DB/API のみに限定され、design/ui contracts は active contract set として管理する。
