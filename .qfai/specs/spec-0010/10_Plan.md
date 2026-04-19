# 10 Plan

## Implementation Strategy

1. Core interview workflow: product concept, scope, stakeholders, constraints
2. Inception Deck: 10-question template with Mermaid diagram generation
3. Story Workshop: user stories, flows, Example Mapping with 6 perspectives
4. OQ Register: 11-column data model with OQ-driven exit logic
5. DDP authoring: Design Direction Pack for UI-bearing detection
6. UI-bearing detection: surface type classification and 11-file sidecar generation
7. Competitive Reference Registry: adopt/reject/translation validation
8. RCP execution: 12-reviewer roster with devils-advocate and pattern-doubler gates

## Test Strategy

- Unit tests: OQ register schema validation, deferred metadata validation, Mermaid fence detection
- Integration tests: 15-file pack completeness, UI-bearing sidecar generation
- E2E tests: full discussion workflow from interview to RCP completion

## Dependencies

- Requires: initialized QFAI project, configured `qfai.config.yaml` (from `/qfai-configure`)
- Consumed by: `/qfai-sdd` as primary input

## Risk

- Large consolidated scope from 5 old specs may require iterative refinement
- Mitigation: OQ-driven exit ensures no ambiguities leak downstream

## v1.7.12 Implementation Strategy

- **Phase**: Discussion skill canonicalization
- **Bundle**: A + B (discussion-pack + spec-pack canonicalization)

### Steps

1. Rewrite SKILL.md to teach 3-layer model (both dogfood and init copies)
2. Replace template family files (delete old 4-axis, create new 3-layer)
3. Strengthen 10_implementation_strategy.md schema (surface classification, direction, rationale, risks)
4. Rewrite 40_screen_contracts.md as screen-obligation schema (11 fields including secondary_tasks)
5. Upgrade 04_Sources.md for trend/reference translation
6. Demote HTML/CSS mock to optional/fallback in all completion conditions

### Test Strategy

- Vitest for template validation
- Discussion pack generation tests

## v1.7.13 Implementation Notes

- prototyping.yaml generation: discussion skill produces prototyping.yaml alongside 15 markdown files
- Template: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/prototyping.yaml`
- Sidecar-first model: DDS → uiux/ sidecar as primary truth for UI-bearing detection
- Implemented in v1.7.13 as a template addition.

## v1.7.16 Implementation Notes (How-only)

### SKILL.md Additions

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md` — add Step 11.3 (Brand→Aesthetic Mapping, Phase A + Phase B) and Step 11.5 (Trend→Axis derivation) to the workflow section. Phase A selects from the 8-archetype catalog; Phase B customizes the selected archetype into `uiux/12_design_system.md`. Declare explicit "parallel execution forbidden" on the Sidecar Generation Flow edge 1c→1d.

### Template Additions / Updates

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/12_design_system.md` — NEW. 8 canonical sections (Visual Theme, Color Palette, Typography, Spacing & Layout, Component Style, Animation & Motion, Do's and Don'ts, Agent Implementation Guide) with guidance commentary.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md` — UPDATE. Add `evaluation_connection: TRD-XX` field on all 6 Trend Scan category entries (color, typography, visual motif, spacing, shape, imagery).
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/21_design_eval_trend_derived.md` — UPDATE. Add >=2 visual-axis example entries (e.g., "Visual Warmth & Color Harmony", "Typographic Rhythm") with `source_refs` guidance pointing back to 04_Sources.md.

### Reference Additions

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/design-md-brand-catalog.md` — NEW. 8 archetypes × representative brand × aesthetic_properties fields:
  - Elegant Minimalist → Muji
  - Bold & Dynamic → Nike
  - Warm Organic → Patagonia
  - Technical Precision → Bose
  - Playful Creative → Duolingo
  - Trustworthy Professional → Bloomberg
  - Futuristic Innovation → Tesla
  - Heritage Classic → Rolex

### Test Files (spec → implementation mapping)

- `packages/qfai/tests/templates/designSystemTemplate.test.ts` — TC-0010-0032, TC-0010-0047
- `packages/qfai/tests/templates/sourcesEvaluationConnection.test.ts` — TC-0010-0041
- `packages/qfai/tests/templates/trendDerivedVisualExamples.test.ts` — TC-0010-0043
- `packages/qfai/tests/skills/discussionStep113.test.ts` — TC-0010-0031, TC-0010-0033, TC-0010-0034, TC-0010-0035, TC-0010-0036, TC-0010-0037
- `packages/qfai/tests/skills/discussionStep115.test.ts` — TC-0010-0038, TC-0010-0040
- `packages/qfai/tests/skills/discussionSidecarFlow.test.ts` — TC-0010-0044, TC-0010-0045
- `packages/qfai/tests/references/brandCatalog.test.ts` — TC-0010-0046
- `packages/qfai/tests/integration/v1716NonUiSafety.test.ts` — TC-0010-0048 (via severity constant)
- `packages/qfai/tests/integration/v1716T01T04.test.ts` — TC-0010-0039, TC-0010-0042

### Dependencies

- NFR-0011 (online-premise): Phase A consumes the awesome-design-md ecosystem via `npx getdesign@latest`. Offline fallback is not implemented in v1.7.16.
- NFR-0009 (package independence): all changes are under `packages/qfai/` — no edits to `.qfai/` operational directory.

### Performance Budget (NFR-0010)

- Total added runtime from Step 11.3 (brand selection + Phase B customization) and Step 11.5 (axis derivation) must not exceed 20% of the v1.7.15 discussion-pack generation baseline. Cache the brand catalog between runs; read 04_Sources.md once and pass the parse tree to Step 11.5.

### Risk

- Ecosystem availability: `npx getdesign@latest` downtime blocks Phase A. Mitigation: document the dependency in README and surface a clear error; offline fallback deferred.
- Archetype-selection drift: taste-interview scoring may shift across `awesome-design-md` upstream versions. Mitigation: pin the ecosystem version in Phase A invocation and surface the version in evidence.

## v1.7.17 Implementation Notes (How-only)

### SKILL / Template Touchpoints

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
  Add explicit design guideline research step for UI-bearing runs before trend-derived axis finalization.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md`
  Add `design_guideline_research` category with `guideline_name`, `rule_refs`, `local_translation`, `source_id`, `evidence`.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/21_design_eval_trend_derived.md`
  Strengthen `score_anchors` guidance to require quantitative proxy in every anchor level.

### Test Files (spec -> implementation mapping)

- `packages/qfai/tests/skills/discussionGuidelineResearch.test.ts` — TC-0010-0049, TC-0010-0051
- `packages/qfai/tests/templates/sourcesGuidelineCategory.test.ts` — TC-0010-0050
- `packages/qfai/tests/templates/trendAnchorProxyGuidance.test.ts` — TC-0010-0052, TC-0010-0053

### Risk

- Over-prescription risk: hard-coding one vendor guideline would reduce flexibility. Mitigation: require at least one applicable family, not a fixed list.
