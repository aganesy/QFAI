# 10 Plan

## Implementation Strategy

1. Spec Auto-Discovery: implement 4-source diff detection
2. Mode selection: implement precedence chain (user > discussion > default)
3. Coverage Matrix generator: enumerate all specs with uiRoutes/apiEndpoints/dbObjects
4. Static checks: file existence, route declaration, schema presence
5. Runtime Gate v2: UI/API/DB/mock checks (standard mode: file-based, full-harness: runtime)
6. Full-harness loop: Planner -> Generator -> Evaluator -> Decision Gate
7. Evidence production: markdown + JSON with uiFidelity
8. Non-UI handling: surface detection and obligation skipping

## Test Strategy

- Unit tests: mode selection, auto-discovery, non-UI detection
- Integration tests: Coverage Matrix generation, Runtime Gate checks
- E2E tests: full prototyping workflow across multiple specs

## Dependencies

- Requires: spec artifacts from `/qfai-sdd`, contracts from `/qfai-discussion`
- Consumed by: `/qfai-atdd` as the recommended next step

## Risk

- CLI command removal may break existing workflows referencing `qfai prototyping`
- Mitigation: ensure no code references remain (verify with grep for old command name)

## v1.7.12 Implementation Strategy

- **Phase**: Prototyping truth unification
- **Bundle**: B + D (spec-pack + prototyping alignment)

### Steps

1. Verify SKILL.md is self-contained with mode semantics
2. Remove all `qfai prototyping` CLI command references from active docs/specs/policies
3. Normalize static-first/mode-aware contract in SKILL.md
4. Update skill contract for evidence expectations without CLI dependency

### Test Strategy

- Grep-based scan for stale CLI references
- Skill contract validation
