# 04_Sources

## Source Registry

### SRC-0001

- type: feedback_report
- title: QFAI Package Feedback Report — Design Guideline Research in Trend Scan & Concrete TRD Axis Scoring
- location: `C:\Users\YusukeSenaga\Documents\GitHub\qfai-virtual-product-2\tmp\qfai-package-feedback-dgs-axis.md`
- date: 2026-04-15
- trust: high
- summary: root cause、proposed fix、affected package files、local mitigation を整理した一次資料

## Trend Scan

### Product and Workflow Observations

#### Entry 1

- reference: SRC-0001 §1-§4
- category: workflow_gap
- observation: Trend Scan から TRD 軸導出までの間にデザイン指南書の必須調査がなく、抽象的 anchor が成立している
- freshness_date: 2026-04-15
- confidence: high
- decision_connection: DR-001, DR-002
- evaluation_connection: REQ-0001, REQ-0002
- local_implication: `qfai-discussion` skill と template に design guideline research と quantitative anchor requirement を追加する

#### Entry 2

- reference: SRC-0001 §3 Fix D
- category: validator_gap
- observation: validator が design guideline coverage と TRD anchor concreteness を検証していない
- freshness_date: 2026-04-15
- confidence: high
- decision_connection: DR-003
- evaluation_connection: REQ-0004, REQ-0005
- local_implication: discussion validator / UIX validator に新 rule を追加する

### design_guideline_research

今回の discussion pack は non-ui 改善案件であり、ここでは「新カテゴリを discussion template に追加すること」が requirements 対象である。project-specific guideline entries 自体は UI-bearing pack 実行時に生成される。

#### Entry 1

- reference: SRC-0001 §3 Fix B
- guideline_category: spacing
- observation: Trend Scan に `design_guideline_research` category を追加し、最小高さ・パディング等の定量基準を保持する必要がある
- applies_to_surface: web
- freshness_date: 2026-04-15
- confidence: high
- decision_connection: DR-002
- evaluation_connection: REQ-0002
- local_implication: `04_Sources.md` template に canonical fields と required coverage guidance を追加する

#### Entry 2

- reference: SRC-0001 §3 Fix C
- guideline_category: accessibility
- observation: `score_anchors` は WCAG ratio や touch target などの rule-based threshold を含む必要がある
- applies_to_surface: all
- freshness_date: 2026-04-15
- confidence: high
- decision_connection: DR-003
- evaluation_connection: REQ-0003, REQ-0005
- local_implication: `21_design_eval_trend_derived.md` と validator rule を連動させる

## Competitive / Alternative Options

| Option | Summary | Why not selected |
| --- | --- | --- |
| Static cross-reference in prototyping skill | package 内に固定ルール集を持つ | project 適応性と保守性が低い |
| Manual reviewer-only detection | human review にのみ依存する | automated gate にならない |
| No validator change | docs のみで運用改善を狙う | regression を機械検知できない |

## Traceability

| Source | Drives |
| --- | --- |
| SRC-0001 | REQ-0001, REQ-0002, REQ-0003, REQ-0004, REQ-0005, REQ-0006, REQ-0007, NFR-0001, NFR-0002, NFR-0003, OQ-0001, OQ-0002, OQ-0003 |
