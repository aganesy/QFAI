# 05 Contracts

## Purpose

- `.qfai/contracts/**` を downstream execution の SSOT として扱う。
- discussion pack は planner artifact であり、`/qfai-sdd` 以降の skill は contracts を primary truth とする。
- 本ファイルは current-active な contract family を定義する。

## Active Contract Sets

### Design Contracts

| Short ID | Entity                | Declared ID           | File                                                                   | Purpose                                                                                                                                                  |
| -------- | --------------------- | --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DCON-001 | Exploration Brief     | exploration-brief     | `.qfai/contracts/design/exploration-brief.yaml`                        | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: brand SSOT moved to root `DESIGN.md`. History-only.)                             |
| DCON-002 | Evaluation Rubric     | evaluation-rubric     | `.qfai/contracts/design/evaluation-rubric.yaml`                        | (DEPRECATED v2.0: 軸は code constants に移行、本 contract は P4 で削除予定 — spec-0012)                                                                  |
| DCON-003 | Evaluator Calibration | evaluator-calibration | `.qfai/contracts/design/evaluator-calibration.yaml`                    | (DEPRECATED v2.0: ordinal scale + 散文 critique で代替、P4 で削除予定 — spec-0012)                                                                       |
| DCON-004 | Selected Direction    | selected-direction    | `.qfai/contracts/design/selected-direction.yaml`                       | (DEPRECATED v2.0: winner 選定なし、P4 で削除予定 — spec-0012)                                                                                            |
| DCON-005 | Design System         | design-system         | `.qfai/contracts/design/design-system.yaml`                            | (UX-loop redesign / spec-0012 09_delta CHG-001: 最終 iter HTML からの抽出ではなく `DESIGN.md` token の deterministic mirror。validator は DCON-032。)    |
| DCON-006 | Reference Pool        | reference-pool        | `.qfai/contracts/design/reference-pool.yaml`                           | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: deviate-from framing 廃止、DESIGN.md compliance gate に統合。History-only.)      |
| DCON-007 | Brand Design          | brand-design          | `.qfai/contracts/design/brand-design.yaml`                             | (REMOVED — UX-loop redesign absorbed into spec-0012 / 09_delta CHG-001: brand SSOT は root `DESIGN.md` に統合。History-only.)                            |
| DCON-008 | Prototype Handoff     | prototype-handoff     | `.qfai/contracts/design/prototype-handoff.yaml`                        | v2.0+UX-loop: finalIterIndex / finalArtifact / extractedDesignSystem (= DESIGN.md mirror) / implementationNotes                                          |
| DCON-030 | DESIGN.md             | design-md             | `DESIGN.md` (repo root)                                                | (UX-loop redesign / spec-0012 09_delta CHG-001) brand vision / visual identity (color / font / radius / shadow tokens) の SSOT。markdown 直接編集。      |
| DCON-031 | DESIGN.md Lock        | design-md-lock        | `.qfai/contracts/design/DESIGN.md.lock.yaml`                           | (UX-loop redesign / spec-0012 09_delta CHG-001) `DESIGN.md` の sha256 hash を `/qfai-sdd` Phase 0 で凍結。cycle ≥1 hash mismatch を fail-closed で検出。 |
| DCON-032 | Design System Mirror  | design-system-mirror  | (validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md) | (UX-loop redesign / spec-0012 09_delta CHG-001) `design-system.yaml` が `DESIGN.md` token と byte-equivalent mirror であることを検証。                   |

### UI Contracts

| Short ID  | Entity           | Declared ID | File                        | Purpose                                                            |
| --------- | ---------------- | ----------- | --------------------------- | ------------------------------------------------------------------ |
| UICON-001 | Screen Contracts | screens     | `.qfai/contracts/ui/*.yaml` | screen 単位 obligations / evidence expectation / route 参照の SSOT |

### Evidence Contracts

| Short ID   | Entity                | File                               | Purpose                                                                                                 |
| ---------- | --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| EVID-DCON1 | Breakthrough Evidence | `.qfai/evidence/breakthrough.json` | (DEPRECATED v2.0: plateau detector / branchPlanner 廃止に伴い P4 で削除予定 — spec-0012)                |
| EVID-PROT2 | Prototyping Evidence  | `.qfai/evidence/prototyping/`      | v2.0: `iter-NN/{screen.png, screen.html, review.json}` + prototyping.json + completion-certificate.json |

### DB Contracts

0 items

QFAI 自体はデータベースを使用しない。

### API Contracts

0 items

QFAI 自体は外部公開 API を持たない。

## Mapping Rules

- (UX-loop redesign / spec-0012 09_delta CHG-001) discussion sidecars `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`, `uiux/32_design_anti_goals.md` は廃止。`/qfai-discussion` はこれらを生成しない。
- discussion の `uiux/40_screen_contracts.md` は `/qfai-sdd` により `UICON-001` に正規化される。
- v2.0: `uiux/33_exploration_rubric.md` と `uiux/34_evaluator_calibration.md` は廃止（`/qfai-discussion` で生成しない）。`DCON-002`, `DCON-003` は P4 で物理削除。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-030` (root `DESIGN.md`) は `/qfai-discussion` の brand 出力。`/qfai-sdd` Phase 0 で sha256 凍結 (`DCON-031`) を行う。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-005` (design-system) は `/qfai-prototyping` の post-loop で `DESIGN.md` token の deterministic mirror として生成される。`DCON-032` validator が byte-equivalent を検証。
- v2.0+UX-loop: `DCON-008` (prototype-handoff) は最終 iter HTML を `finalArtifact` として参照し、`extractedDesignSystem` は `DCON-005` (= DESIGN.md mirror) を指す。
- v2.0: `DCON-004` (selected-direction) は P4 で物理削除（winner 選定の概念がないため）。
- (UX-loop redesign / spec-0012 09_delta CHG-001) `DCON-001` (exploration-brief), `DCON-006` (reference-pool), `DCON-007` (brand-design) は active surface から削除。validator codepath からも除外。history-only。
- `/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement`, `/qfai-verify`, `qfai validate` は原則として上記 contract 群を読み、discussion pack を直接 truth source にしてはならない。

## Current Posture

- contract-first downstream を採用する。
- discussion-side UIUX artifacts は upstream discovery / authoring artifact であり、execution truth ではない。
- downstream skill が design / UI 評価を行うときの正式入力は `specs + DESIGN.md + .qfai/contracts/design/** + .qfai/contracts/ui/** + required evidence` である。
- screenshot / HTML evidence は contract から導かれる declared screen ごとに揃う必要がある。
- (UX-loop redesign) brand SSOT は root `DESIGN.md`。design-system は post-loop に DESIGN.md token の deterministic mirror として生成される。

## v2.0 Migration (absorbed into spec-0012)

- 削除対象 contracts (P4): `DCON-002`, `DCON-003`, `DCON-004`, `EVID-DCON1`
- (UX-loop redesign / spec-0012 09_delta CHG-001) 削除対象 contracts: `DCON-001`, `DCON-006`, `DCON-007`
- 簡素化 contracts (P1+P10): `DCON-008` (mustPreserve/mayAdapt/mustNotCopy 廃止)
- 評価軸は code constants `packages/qfai/src/core/prototyping/iteration.ts#OrdinalScore` に固定 (UX-loop redesign 後: informationArchitecture / navigationFlow / usability / functionality)。
- (UX-loop redesign) layout-anti-pattern (lap-001..008) は `qfai-prototyping/references/reviewer-prompt.md` に常駐（contract 化しない）。旧 anti-slop tokens (slop-\*) は廃止。
- (UX-loop redesign) `DCON-030` (`DESIGN.md`), `DCON-031` (`DESIGN.md.lock.yaml`), `DCON-032` (mirror validator) を新設。
