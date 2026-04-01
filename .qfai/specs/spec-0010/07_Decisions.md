# 07 Decisions

## SD-0010-0001: 3-Layer Canonical Model Replaces 4-Axis

- Policy-Ref: DR-0106
- Discussion-Ref: discussion-20260401215536131 D-001, D-004
- Date: 2026-04-01
- Status: Adopted

The old 4-axis evaluation model (usability / consistency / accessibility / delight as separate template files 20–23) is replaced by the 3-layer model (invariant / trend-derived / product-specific). Old 4-axis files are removed from `qfai init` defaults and `00_index.md` manifest. Migration window (v1.7.8 warning → v1.8.0 error) is already in effect for existing packs; v1.7.12 ensures new generation never produces legacy files.

Rationale: The 3-layer model is evaluation-theory-grounded and avoids the overlap between the old axes (e.g., accessibility was both invariant and product-specific). Consolidation into layers enables trend-derived evaluation sourced from competitive research.

## SD-0010-0002: HTML/CSS Mock Demoted to Optional/Fallback

- Policy-Ref: DR-0107
- Discussion-Ref: discussion-20260401215536131 D-002
- Date: 2026-04-01
- Status: Adopted

HTML/CSS visual mocks are no longer a required completion artifact. They may still appear in `03_Story-Workshop.md` as optional reference material but must not gate discussion completion or trigger validation errors when absent.

Rationale: Visual layout belongs to discussion-phase taste interviews and design contracts, not to spec completion conditions. Mandatory CSS generation created false gating when AI-generated CSS quality was insufficient, blocking otherwise complete discussions.
