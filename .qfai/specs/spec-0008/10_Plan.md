# 10 Plan

## Implementation Strategy

1. Define ATDD skill contract based on SKILL.md SSOT
2. Implement TestVolumeEstimator signal table generation
3. Implement layer-specific test generation (E2E -> US, API -> CON-API, Integration -> TC)
4. Implement annotation validation and forbidden reference enforcement
5. Implement stage gate enforcement (P0-P8)
6. Implement evidence file generation

## Test Strategy

- Unit tests: annotation parsing, volume estimation logic
- Integration tests: coverage obligation verification, forbidden reference detection
- E2E tests: full ATDD workflow from spec input to evidence output

## Dependencies

- Requires: spec artifacts (US/TC/CON-API declarations) from `/qfai-sdd`
- Consumed by: `/qfai-implement` for unit/component TDD cycle

## Risk

- Coverage obligation definitions may evolve as contract schema changes
- Mitigation: Use SKILL.md as SSOT and adapt obligation parsing accordingly
