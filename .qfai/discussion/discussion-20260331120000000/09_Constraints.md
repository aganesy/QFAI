# 09 Constraints

## Purpose

Constraints governing the design, implementation, and delivery of QFAI v1.7.11. Constraints are non-negotiable boundaries that limit solution space.

---

## Technical Constraints

### CON-T-001: Backward Compatibility with v1.7.x Projects

Must maintain backward compatibility with existing v1.7.x projects during migration. Legacy 4-axis projects must receive migration guidance, not hard failures. No existing project may break as a result of this release.

### CON-T-002: UIUX Validation Budget

UIUX validation budget must remain at or below 2000ms (`UIUX_VALIDATION_BUDGET_MS`). This constant is enforced as a hard upper bound. Any validation path that exceeds this budget is a release-blocking defect.

### CON-T-003: TypeScript Strict Mode

TypeScript strict mode compliance is required for all source files. The `strict` compiler option must remain enabled and no `// @ts-ignore` or `// @ts-nocheck` directives may be introduced.

### CON-T-004: No Bare Type Assertions

No bare `as` type assertions are permitted (per CLAUDE.md project rules). Type narrowing through guards, discriminated unions, or runtime checks must be used instead.

### CON-T-005: Explicit Async Error Handling

Every async path must have explicit error handling. No promise may be left without a `.catch()` handler or `try/catch` block. This applies to all new and modified code.

---

## Operational Constraints

### CON-O-001: Source and Init Asset Synchronization

Source assets and init (packaged) assets must be updated simultaneously. Any change to a canonical template in the source tree must be reflected in the corresponding init asset, and vice versa. Drift between these two sets is a release-blocking defect.

### CON-O-002: Existing Test Suite Stability

Existing test suites must continue to pass after migration. No previously passing test may be broken by v1.7.11 changes. Test fixtures must be updated to canonical expectations where necessary, but the test count must not decrease.

### CON-O-003: Validate Gate Pass

`qfai validate --fail-on error` must pass before release. All error-level diagnostics must be resolved. Warning-level diagnostics are permitted but must be reviewed and acknowledged.

---

## Design Constraints

### CON-D-001: No Architecture Re-discussion

Existing architecture (3-layer evaluation model, surface type classification, sidecar structure) must not be re-discussed or redesigned in this release. v1.7.11 is a completion release; architectural decisions are settled.

### CON-D-002: Repo Truth Alignment Direction

Repository truth must be aligned to the canonical design (the 3-layer model and its supporting structures), not the reverse. If code and specs diverge, the code must be corrected to match the spec. The spec is the source of truth.

### CON-D-003: Non-UI Project Neutrality

Non-ui projects (CLI, API, library) must not be penalized by UI-bearing requirements. Validators, scoring, and diagnostics must correctly distinguish surface types and suppress UI-specific checks for non-ui projects.
