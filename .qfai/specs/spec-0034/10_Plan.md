# 10 Plan

- Spec: spec-0034
- Parent: CAP-0034

## Implementation Sequence

### Step 1: Design Taste Interview (D-01, P0)

- Create `uiux/11_design_taste_interview.md` template with 10 canonical sections.
- Integrate taste interview as mandatory step in `qfai-discussion/SKILL.md` for UI-bearing projects.
- Implement UIX-VAL-TASTE-MISSING and UIX-VAL-TASTE-INCOMPLETE validators with surface_type guard.

### Step 2: Trend/Reference Research (D-02, P0)

- Define trend scan section structure in 04_Sources.md template (summary, freshness_date, confidence, source_translation).
- Integrate trend research as mandatory step in discussion skill for UI-bearing projects.
- Implement UIX-VAL-TREND-SCAN-MISSING and UIX-VAL-TREND-FRESHNESS-MISSING validators with surface_type guard.

### Step 3: 3-Layer Evaluation Architecture (D-03, P0)

- Refactor evaluation axis model to invariant / trend-derived / product-specific classification.
- Update all sidecar templates to use 3-layer model exclusively.
- Implement 4-axis legacy detection validator with migration window (warning in v1.7.8, error in v1.8.0).
- Implement mixed-format detection (error regardless of migration window).
- Update glossary and policy to reference 3-layer model as sole canonical model.

### Step 4: Scoring-Ready Schema (D-04, P0)

- Define 16-field scoring-ready schema per evaluation axis.
- Update sidecar templates to include all 16 fields.
- Implement UIX-VAL-DYNAMIC-AXIS-MISSING and UIX-VAL-DYNAMIC-AXIS-INCOMPLETE validators with surface_type guard.
- Define aggregate scoring rules (thresholds, floors, plateau, missing_score_policy).

### Step 5: Strategy Artifact (D-05, P0)

- Upgrade `uiux/10_strategy.*` template to 8-field strong universal schema.
- Implement UIX-VAL-STRATEGY-WEAK-LEGACY validator (warning for weak format in migration window).
- Implement strong schema validation with selection_required / candidate_options cardinality check.

### Step 6: Screen Contract (D-06, P1)

- Upgrade `uiux/40_contracts.*` template to 10-field schema with multi-screen array support.
- Implement UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE validator with surface_type guard.
- Implement screen_id uniqueness and required_states coverage checks.

## Implementation Strategy

1. **Template-first**: Update/create templates and sidecar structures before any code changes.
2. **Validator**: Implement deterministic validators for each new schema/structure requirement.
3. **Reviewer**: Update reviewer assets to reflect new canonical model and artifacts.
4. **Migration**: Add migration path support (warning -> error graduation) for legacy formats.

## File Targets

- `.qfai/assistant/skills/qfai-discussion/SKILL.md` (taste + trend integration)
- `packages/qfai/assets/uiux/` (templates: taste interview, strategy, screen contract)
- `packages/qfai/src/validators/uix/` (taste, trend, 3-layer, scoring, strategy, screen contract validators)
- `packages/qfai/assets/uix-rev/` (reviewer templates)
- `.qfai/specs/_policies/06_Glossary.md` (3-layer model terminology)
- `.qfai/specs/_policies/08_Decisions.md` (DR-0087, DR-0088, DR-0091 registration)
- `packages/qfai/tests/validators/uix/` (test fixtures)

## Test Strategy

- Unit: TP-01 compliance (minimum 3 fixtures per validator: pass / fail / non-UI skip).
- Integration: Sidecar generation produces valid 3-layer + scoring-ready output for UI-bearing packs.
- Non-UI safety: Every new validator has a non-UI pack fixture that produces zero issues.
- Migration: Legacy format fixtures produce correct warning/error depending on migration window state.
- Gate checks:
  - All new validators pass determinism check (NFR-0003)
  - No UI-bearing validator fires on non-UI fixture (NFR-0002)
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Migration window confusion: Clear upgrade guidance in validator messages; migration docs in CHANGELOG.
- Scoring schema rigidity: 16 fields chosen based on current needs; schema versioning enables future evolution.
- Multi-screen complexity: Array-based schema with per-entry validation isolates screen contract issues.
- Non-UI over-fire regression: Dedicated non-UI fixtures in every validator test suite.

## v1.7.9 Convergence Note

- discussion-20260330153902875 に合わせ、discussion completion の canonical family は taste interview / trend scan / 3-layer rubric / strong strategy / strong screen contract として固定する。
- legacy 4-axis は migration path の対象としてのみ扱い、canonical default に戻さない。
- reviewer assets と downstream prototyping/review は上記 family を前提に参照する。

## v1.7.11 Completion Steps

### Step 7: Remove 4-axis completion conditions from SKILL.md (D-07)

- Remove all 4-axis completion condition references from `qfai-discussion/SKILL.md`.
- Verify no 4-axis keywords (`4-axis`, `four-axis`, `4軸`) remain in SKILL.md after removal.
- Add 3-layer canonical completion conditions for UI-bearing path (invariant / trend-derived / product-specific).

### Step 8: Verify non-ui path exemption (D-08)

- Verify non-ui path exemption is maintained after D-07 changes.
- Run validator against non-ui project fixture to confirm zero new issues.

### Test Strategy

- 3 new TCs: TC-0034-0029, TC-0034-0030, TC-0034-0031.
- TC-0034-0029: SKILL.md with 4-axis conditions removed produces zero 4-axis keyword matches.
- TC-0034-0030: SKILL.md with 3-layer canonical conditions passes completion validation for UI-bearing path.
- TC-0034-0031: Non-ui project fixture produces zero new issues after D-07/D-08 changes.
- Fixtures: SKILL.md with 4-axis conditions (pre-removal), SKILL.md without 4-axis (post-removal), non-ui project config.
