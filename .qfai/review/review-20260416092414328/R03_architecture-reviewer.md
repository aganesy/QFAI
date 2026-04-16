# R03 Architecture Reviewer — review-20260416092414328

**Role**: architecture-reviewer
**Discussion**: discussion-20260416092414328 (rev9)
**Result**: PASS

---

## Architecture Review

### Decision 1: ui[] row validation inline in prototypingEvidence.ts (OQ-0001, Option A)

**Analysis**: The decision to inline `runtimeGate.ui[]` row-level validation within `prototypingEvidence.ts` is architecturally sound for this scope.

- The existing `validateRuntimeGate()` function in `prototypingEvidence.ts` already handles top-level `runtimeGate.evidenceRefs` validation (added in rev8). Adding ui[] row validation inline is a cohesion-preserving extension — it keeps all `runtimeGate` validation in one place.
- `isConcreteArtifactRef()` from `pathUtils.ts` is already imported by `prototypingEvidence.ts` (rev8). No new import needed; the dependency direction is already established.
- The alternative (Option B: separate utility file) would be justified only if the `ui[]` row validation were reused in multiple contexts. No evidence of such multi-context reuse exists.
- TC-2 (no parallel grammar) is satisfied: the implementation reuses `pathUtils.ts` helpers.

**Verdict**: Sound. ✅

### Decision 2: bundleWriter.ts breaking schema change (REQ-0014, REQ-0015, REQ-0016)

**Analysis**: Changing `declaredRef` from optional to required and leaf arrays to required non-nullable is a breaking TypeScript type change.

- The breaking change is explicitly justified by design doc §0 and §3-2: backward compatibility is completely abandoned.
- Impact scope: TypeScript `tsc --strict` will surface compile errors at every callsite that previously omitted `declaredRef` or provided nullable leaf arrays. This is the intended behavior — forcing callers to provide concrete evidence.
- `runtimeObservation.ts` and `runtimeGateBuilder.ts` are conditionally in scope (REQ-0016). The conditional scope is architecturally appropriate: only modify them if empirical inspection confirms they can emit null/omit values.
- TC-4 (TypeScript strict) is satisfied: no new `any` or `@ts-ignore` needed for this structural change.
- TC-5 (leaf arrays required non-nullable) formalizes the architectural principle.

**Verdict**: Sound. ✅

### Decision 3: pathUtils.ts reuse without modification (REQ-0013, TC-2)

**Analysis**: Rev9 reuses `pathUtils.ts` helpers (`isConcreteArtifactRef`, `assertConcreteArtifactRef`, `toRepoRelativeArtifactRef`) from rev8 without modification.

- `pathUtils.ts` was designed as a leaf module in rev8 (TC-2 of rev8: no imports from execution.ts or transitively-importing modules). This constraint remains in effect for rev9 — leaf status is preserved.
- Rev9 only adds callers; it does not modify the helpers. New validation code in `prototypingEvidence.ts` calls `isConcreteArtifactRef()` — same pattern as rev8 usage.
- No circular import risk: `prototypingEvidence.ts` already imports from `pathUtils.ts` (rev8). Adding more call sites to existing imports does not change the dependency graph structure.

**Verdict**: Sound. ✅

### Decision 4: Validator extension adds to existing pipeline without restructuring

**Analysis**: Rev9 extends `validateRuntimeGate()` and `validateFullHarness()` without restructuring the parse→validate pipeline established in rev8.

- The existing pipeline (`parseEvidence()` → `validatePrototypingEvidence()` → issue accumulation) is not changed structurally.
- New leaf-field checks are inserted as additional validation passes within existing functions, following the established pattern.
- Production closure test (`prototypingExecution.productionPath.test.ts`) is extended to assert leaf-field concreteness (REQ-0019), confirming the pipeline continues to be self-consistent end-to-end.

**Verdict**: Sound. ✅

### Test Layer Assessment

- 15 new negative test cases (7 + 5 + 3) align with the 3 leaf-field groups being closed. Test scope correctly mirrors validator scope (NFR-0001).
- Synthetic token fixture replacement (REQ-0018, NFR-0005) is correctly scoped to `tests/core/` only.
- Closure test extension (REQ-0019, NFR-0004) confirms production pipeline remains self-consistent.

**Verdict**: Correct test strategy. ✅

---

## Findings

No blocking findings.

## Decision

**PASS** — All architectural decisions are sound, well-reasoned, and consistent with the package's established module boundaries and validation pipeline.
