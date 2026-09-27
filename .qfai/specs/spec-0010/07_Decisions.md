# 07 Decisions

## Decisions

### DR-0010-0001: Discussion-side design authoring is planner-first

- Date: 2026-04-22
- Status: Adopted
- Related: CR-20260912-0003

Decision: `spec-0010` specifies the exploration inputs discussion authors. Discussion ranks no screen exploration and finalizes no design system. The brand direction is outside this rule: the user chooses it during discussion, the pack records it in `01_Context.md#Design Direction`, and `/qfai-sdd` Phase 0 authors root `DESIGN.md` from it.

Rationale: `/qfai-prototyping` ranks the screen explorations by iterating them. No stage after discussion asks the user for the brand, so if discussion does not ask, an assistant invents one.

Rejected:

- DO NOT: select one screen exploration, or finalize the design system, in discussion.
  - Temptation: remove downstream ambiguity early.
  - Reason: it collides with exploration-first prototyping and blocks breakthrough.

### DR-0010-0002: Canonical discussion-side UI family is exploration-first

- Date: 2026-04-22
- Status: Superseded
- Superseded by: US-0010-0010 and AC-0010-0008, which withdrew the legacy sidecars
- In force today: the family is `uiux/40_screen_contracts.md` and `uiux/50_review_input_bundle.md`; brand-level inputs are in root `DESIGN.md`

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

### DR-0010-0003: Reference research stays in discussion and feeds downstream contracts

- Date: 2026-04-22
- Status: Superseded
- Superseded by: US-0010-0010 and AC-0010-0008, which withdrew the legacy sidecars
- In force today: the research posture stands, and `04_Sources.md` is the only file it is kept in

Decision: Trend Scan / guideline research / competitive references は discussion の `04_Sources.md` と `31_reference_pool.md` に保持し、`/qfai-sdd` が downstream contracts に正規化する。

Rationale: research provenance を upstream に残したまま、downstream では contract-first に評価できるため。

### DR-0010-0004: Evaluator calibration is mandatory discussion output

- Date: 2026-04-22
- Status: Superseded
- Superseded by: US-0010-0010 and AC-0010-0008, which withdrew the legacy sidecars
- In force today: no calibration sidecar is written, and the evaluation posture lives in the prototyping loop

Decision: discussion は `34_evaluator_calibration.md` を必須出力とし、good critique / blandness fail / originality fail の例を handoff に含める。

Rationale: 現行 prototyping は generator と evaluator を分離し、calibration artifact を current-active input として読むため。

### DR-0010-0005: `QFAI-MOCK-010` direction — anchor-form template default (cites \_policies DR-0265)

- Date: 2026-05-27
- Status: Adopted

Decision: REQ-0154 の direction は \_policies **DR-0265** に従い、option b（template が anchor-form `<a href="#name">` を default emit + SKILL.md が指示、validator は strict 維持）を採用する。anchor (`#name`) と external (`http(s)://`) は引き続き PASS。template ↔ validator は新 SSOT-sync pair で `R-MOCK-HREF-DRIFT` が drift を検出する。

Rejected:

- DO NOT: validator を `/path/` same-origin absolute href を accept するよう緩めない（option a）。
  - Temptation: web-URL に慣れた author には最も自然。
  - Reason: deterministic gate を緩め、prototype が serve できない route を mock が encode する drift を再導入する（DR-0265）。

### DR-0010-0006: Active discussion session pointer — `state.json#discussion.currentId` SSOT (cites \_policies DR-0266)

- Date: 2026-05-27
- Status: Adopted

Decision: REQ-0155 の surface は \_policies **DR-0266** に従い option B（`.qfai/state.json#discussion.currentId` を単一 SSOT）を採用。`/qfai-discussion` が writer。`qfai discussion list --active` は read view。multiple-active ambiguity は candidate dirs と recovery command を名指しした error で reject する。

Rejected:

- DO NOT: active pointer を filesystem mtime から推論しない（option A-alone）。
  - Temptation: zero-config。
  - Reason: multi-session / multi-user clone で非決定的になり、operator の明示選択を記録する場所が無い（DR-0266）。
- DO NOT: ephemeral session state を committed `qfai.config.yaml` に置かない（option C）。
  - Temptation: 設定を 1 ファイルに集約したい。
  - Reason: active session は per-runtime ephemeral state であり `state.json` が正しい home（DR-0266）。

## Historical Notes

- 旧 archetype-driven customization / discussion-time design-system generation / legacy trend-derived scoring file は superseded であり、active contract ではない。
