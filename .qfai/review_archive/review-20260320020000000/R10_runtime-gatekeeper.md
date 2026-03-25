# Review: Runtime Gatekeeper

- **Reviewer ID**: runtime-gatekeeper
- **Target**: spec-0016
- **Cycle**: 1
- **Date**: 2026-03-20
- **Verdict**: PASS

## N/A Eligibility Assessment

spec-0016 has runtime impact in the following senses:

- Asset tests (Step 4) and verify-pack (Step 5) run in CI — runtime environment impact
- NFR-0005 requires CI time delta < 10% — explicit runtime constraint
- NFR-0003 requires all existing validator tests to pass — backward compatibility runtime gate
- NFR-0002 (wrapper parity drift = 0) is enforced at runtime by asset tests

N/A is **not applied**. Runtime review is warranted.

## Checklist

- [x] Operational readiness: pre-merge gates cover runtime verification
- [x] Runtime risk controls: CI time budget (NFR-0005) explicitly constrained
- [x] Backward compatibility: NFR-0003 hard gate for existing validator tests
- [x] Mitigation assumptions are realistic
- [x] Rollback assumptions are stated where relevant

## Findings

### Operational Readiness

`10_Plan.md` Section 5 (Delivery) lists 9 pre-merge gates that together constitute the runtime readiness checklist. All gates are automated and CI-verifiable:

- `npm test` / `vitest run` — covers unit and integration tests
- `scripts/verify-pack.mjs` — packaging integrity
- `qfai validate --fail-on error` — validate gate
- Asset test required phrase assertions (×8) — runtime phrase detection
- Asset test forbidden phrase assertions (×7) — runtime phrase exclusion
- Wrapper parity drift = 0 — automated parity check
- Orphan phrase grep = 0 — full-text sweep in CI
- NFR-0003: existing validator tests pass — backward compatibility
- NFR-0005: CI time delta < 10% — performance gate

### Runtime Risk Assessment

**Risk 1 (Half-migration)**: Mitigated by sequential steps and single-PR delivery. Asset tests detect drift before merge. This is a runtime catch net for integration errors.

**Risk 2 (Backward compatibility)**: NFR-0003 is a hard gate. The plan notes that required phrases in v1.6.2 (`watch it fail`, `watch it pass`, etc.) were already present in v1.6.0's SKILL.md, so adding guardrails cannot cause backward failures. This is a sound runtime risk analysis.

**Risk 5 (CI time budget)**: The plan notes phrase checks are synchronous string searches over small files — negligible execution time. NFR-0005 (<10% CI delta) is realistic given the change scope.

### No Runtime Service Impact

QFAI is a CLI tool with no running service, no database, no message queue. There is no runtime service to fail, no deployment rollback needed. The "runtime" concern here is limited to CI pipeline operations.

### Mitigation Realism

All 5 risk mitigations in `10_Plan.md` Section 3 are realistic:

- Sequential step ordering is enforceable
- Single-PR delivery is enforced by NFR-0001
- Asset tests are well-established in the codebase
- Orphan sweep (Step 7) is a standard grep operation
- verify-pack is an existing script

### Observation: Step 7 (Orphan Reference Cleanup) Dependency

Step 7 (orphan reference cleanup) depends on Steps 1-5 being complete. It is marked mandatory in the delivery section. The exclusion list (CHANGELOG.md, discussion/, spec-0016/) is explicit, reducing false-positive risk in the orphan sweep.

## Verdict

**PASS** — Runtime risk controls are comprehensive and realistic. CI time budget is explicitly constrained by NFR-0005. Backward compatibility is protected by NFR-0003 as a hard gate. Operational readiness is well-defined through 9 measurable pre-merge gates. No blocking runtime concerns found.
