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
