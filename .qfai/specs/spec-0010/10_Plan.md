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
