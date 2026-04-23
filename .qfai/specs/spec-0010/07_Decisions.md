# 07 Decisions

## DR-0010-0001: Discussion-side design authoring is planner-first

- Date: 2026-04-22
- Status: Adopted

Decision: `spec-0010` は discussion における探索入力の authoring 仕様を扱い、visual winner の選定や final design system の確定は扱わない。

Rationale: 現行実装では discussion は exploration inputs を準備し、`/qfai-prototyping` が direction funnel と winner selection を担当するため。

Rejected:

- DO NOT: discussion で visual direction を 1 本に確定しない。
  - Temptation: downstream ambiguity を早く消したい。
  - Reason: exploration-first prototyping と衝突し、breakthrough を阻害する。

## DR-0010-0002: Canonical discussion-side UI family is exploration-first

- Date: 2026-04-22
- Status: Adopted

Decision: discussion-side の active UI sidecar family は以下とする。

- `uiux/30_exploration_brief.md`
- `uiux/31_reference_pool.md`
- `uiux/32_design_anti_goals.md`
- `uiux/33_exploration_rubric.md`
- `uiux/34_evaluator_calibration.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

Rationale: 現行 asset / validator / downstream normalization はこの family を前提としているため。

Rejected:

- DO NOT: legacy single-winner sidecar family を active path に戻さない。
  - Temptation: discussion 時点で比較と収束を完了したい。
  - Reason: 実装 SSOT は planner-first handoff を採用している。

## DR-0010-0003: Reference research stays in discussion and feeds downstream contracts

- Date: 2026-04-22
- Status: Adopted

Decision: Trend Scan / guideline research / competitive references は discussion の `04_Sources.md` と `31_reference_pool.md` に保持し、`/qfai-sdd` が downstream contracts に正規化する。

Rationale: research provenance を upstream に残したまま、downstream では contract-first に評価できるため。

## DR-0010-0004: Evaluator calibration is mandatory discussion output

- Date: 2026-04-22
- Status: Adopted

Decision: discussion は `34_evaluator_calibration.md` を必須出力とし、good critique / blandness fail / originality fail の例を handoff に含める。

Rationale: 現行 prototyping は generator と evaluator を分離し、calibration artifact を current-active input として読むため。

## Historical Notes

- 旧 archetype-driven customization / discussion-time design-system generation / legacy trend-derived scoring file は superseded であり、active contract ではない。
