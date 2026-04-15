# 05 Scope

## In Scope

The following files and directories are in scope for this PR (from design doc section 4-1):

### Source Code (`packages/qfai/src/**`)

| Area | Files |
|------|-------|
| Prototyping core | `packages/qfai/src/core/prototyping/mode.ts` |
| Prototyping core | `packages/qfai/src/core/prototyping/execution.ts` |
| Prototyping core | `packages/qfai/src/core/prototyping/surfacePolicy.ts` *(new file — WS-2)* |
| Harness | `packages/qfai/src/core/harness/runtime.ts` |
| Calibration | `packages/qfai/src/core/calibration/loader.ts` |
| Validators | `packages/qfai/src/core/validators/prototypingEvidence.ts` |
| Builders | `packages/qfai/src/core/prototyping/runtimeGateBuilder.ts` |
| Builders | `packages/qfai/src/core/prototyping/runtimeObservation.ts` |
| Builders | `packages/qfai/src/core/prototyping/specCoverage.ts` |
| Builders | `packages/qfai/src/core/prototyping/uiFidelityBuilder.ts` |
| CLI | `packages/qfai/src/cli/commands/prototyping.ts` |

### Tests (`packages/qfai/tests/**`)

| Area | Files |
|------|-------|
| Unit tests (existing, to be updated) | All existing tests that reference `standard`, `low-cost`, `cli` surface, or `uiContractId` matching |
| New regression test | `packages/qfai/tests/core/prototyping/uiFidelityBuilder.test.ts` — WS-6 |
| New unit tests | Test files for `surfacePolicy.ts` — WS-2 |
| New integration tests | Tests for `runFullHarness()` calibration SSOT path — WS-3 |

### Shipped Assets and Docs (`packages/qfai/assets/init/.qfai/**`, `packages/qfai/README.md`)

| Asset/Doc | WS |
|-----------|-----|
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md` | WS-7 |
| `packages/qfai/assets/init/.qfai/evidence/README.md` | WS-7 |
| `packages/qfai/assets/init/.qfai/review/README.md` | WS-7 |
| `packages/qfai/assets/init/.qfai/contracts/ui/README.md` | WS-7 |
| `packages/qfai/README.md` | WS-7 |

---

## Out of Scope

The following are explicitly out of scope (from design doc section 4-2):

| Item | Reason |
|------|--------|
| Repo root `.qfai/**` | Not a package file; operational directory for this repo's QFAI usage |
| Migration guide for removed modes | Backward compat is abandoned; no migration guidance needed |
| Release notes / CHANGELOG entry | Out of scope for this PR |
| v1.8 features or any new capability | Not part of this PR's goal |
| `packages/qfai/src/domain/surface.ts` (domain-wide vocabulary) | Domain surface vocabulary is separate from prototyping surface policy |
| Any file outside `packages/qfai/` | PR scope is strictly limited to the package |

---

## Success Criteria (DoD)

The following Definition of Done conditions (from design doc section 5) must all be satisfied:

| DoD # | Condition | Verification Method |
|-------|-----------|-------------------|
| DoD-1 | `prototyping = full-harness only / UI-only` — `standard`, `low-cost`, `cli`, `api`, `backend` are rejected at all layers | `pnpm test` passes; grep for `standard` / `low-cost` in test fixtures returns 0 hits in non-negative-test contexts |
| DoD-2 | `calibration = runtime + validator both use pack SSOT` — `runFullHarness()` and `prototypingEvidence.ts` both reference `calibrationRef.packPath` as SSOT | Code review confirms no scalar threshold params in `runFullHarness()` signature |
| DoD-3 | `runtimeGate/specCoverage refs = concrete artifact-based` — No self-refs, no synthetic strings | Validator rejects self-refs and synthetic strings in CI |
| DoD-4 | `reviewerSignoff/terminationReason = semantically consistent` — Vocabulary correct, mapping table enforced | Test cases assert `abandoned` for plateau/maxIterations; validator checks consistency |
| DoD-5 | `stale docs/tests/validator = removed from package` — No `standard`, `low-cost`, `cli prototyping`, `mockPaths.status=pass` in shipped files | grep scan of `packages/qfai/assets/` and `packages/qfai/README.md` returns 0 stale matches |
| DoD-6 | All vitest test suites pass | `pnpm test` exits 0 |
| DoD-7 | TypeScript strict compliance | `pnpm check-types` exits 0 with 0 errors |

---

## Workstream Summary

| WS | Title | Key Files | Risk |
|----|-------|-----------|------|
| WS-1 | Consolidate prototyping to full-harness only / UI-only | mode.ts, execution.ts, prototypingEvidence.ts, prototyping.ts CLI | Medium |
| WS-2 | Introduce dedicated surfacePolicy.ts | surfacePolicy.ts (new) | Low |
| WS-3 | Close runFullHarness() to calibration pack SSOT | harness/runtime.ts, calibration/loader.ts, execution.ts, prototypingEvidence.ts | High |
| WS-4 | Replace evidenceRefs with concrete artifact refs | runtimeGateBuilder.ts, runtimeObservation.ts, specCoverage.ts, execution.ts | Medium |
| WS-5 | Separate review semantics | execution.ts, harness/runtime.ts, prototypingEvidence.ts | Medium |
| WS-6 | Fix uiFidelityBuilder screenId matching bug | uiFidelityBuilder.ts, uiFidelityBuilder.test.ts | Low |
| WS-7 | Sync shipped docs/assets/tests stale semantics | SKILL.md, evidence/README.md, review/README.md, contracts/ui/README.md, package README | Low |
