# 05 Scope

## In Scope

- Workstream A: Authoring architecture reconciliation (3-layer vs 4-axis, strategy artifact, screen contract, UI-bearing detection)
- Workstream B: Prototyping phase boundary correction (static-first default, mode exposure, full-harness entrypoint)
- Workstream C: Evidence / QA completion (render evidence wiring, browser QA findings)
- Workstream D: Operations / consistency / migration (doc normalization, migration support, workflow docs)

## Out of Scope

- Full redesign of QFAI architecture
- New feature development beyond remediation scope
- Hard-gating semantic taste judgments in validator
- Reintroducing runtime-heavy default prototyping
- Collapsing full-harness into standard path
- Dropping internal foundation modules

## Constraints

- Technical constraints: Must maintain backward compatibility with existing qfai.config.yaml and existing discussion/spec packs
- Operational constraints: Phased delivery (Hotfix A → Correction B → Correction C) to preserve rollback boundaries
- Legal / compliance constraints: None identified

## Success Criteria

| Criterion | Measurement | Target | Priority |
| --------- | ----------- | ------ | -------- |
| SC-001 | All P0 issues resolved | P0-01, P0-02 fixed and validated | must |
| SC-002 | All P1 issues resolved | P1-01 through P1-07 fixed and validated | must |
| SC-003 | All P2 issues resolved | P2-01 through P2-03 fixed and validated | should |
| SC-004 | qfai validate passes | qfai validate --fail-on error exits 0 | must |
| SC-005 | No regression in existing tests | All existing test suites pass | must |
| SC-006 | Migration path documented | Stale asset detection and upgrade guidance present | should |

## Assumptions

- The existing internal modules (harness, critique, calibration, observability, handoff, detection) are architecturally sound and only need workflow-layer exposure
- The 3-layer evaluation model (invariant, trend-derived, product-specific) is the target architecture
- Phased delivery is acceptable (not all issues need to ship simultaneously)
