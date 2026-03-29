# 10 Plan

- Spec: spec-0028
- Parent: CAP-0028

## Implementation Strategy

### Phase overview

The 4-slice implementation sequence delivers CAP-0028 incrementally. Each slice builds on its predecessors; no slice may be started until all of its dependency slices are green (tests passing). All validators follow the established async pattern `(root: string, config: QfaiConfig) => Promise<Issue[]>`.

| Slice | Focus                            | Dependencies | Priority |
| ----- | -------------------------------- | ------------ | -------- |
| 1     | Runtime Gate Scope Correction    | None         | P0       |
| 2     | Render Evidence Schema & Capture | Slice 1      | P0       |
| 3     | Backend Provider Abstraction     | Slice 2      | P1       |
| 4     | Browser QA Structured Outputs    | Slices 2, 3  | P1       |

### Slice details

#### Slice 1: Runtime Gate Scope Correction

- **What**: Modify prototyping mode resolver to separate static-first obligations from runtime-heavy obligations. Update DONE condition evaluation so that the default `/qfai-prototyping` path uses only static obligations. Runtime obligations become opt-in via explicit capability declaration.
- **Where**: Existing files in `packages/qfai/src/core/` -- prototyping command handler, mode resolver, obligation evaluator
- **Estimated LOC**: 60-100 (modifications to existing modules)
- **Key constraints**: Must restore static-first default (DEC-0001). Must not break existing prototyping flows that already pass under static obligations. Non-web projects must produce zero runtime obligation failures (fail-open semantics).
- **Affected files**:
  - `packages/qfai/src/core/prototyping/modeResolver.ts` -- separate static vs. runtime obligation sets
  - `packages/qfai/src/core/prototyping/obligationEvaluator.ts` -- filter obligations by mode
  - `packages/qfai/src/core/prototyping/commandHandler.ts` -- pass mode context through evaluation

#### Slice 2: Render Evidence Schema & Capture

- **What**: Define evidence schema extensions for render evidence (screenshot path, viewport dimensions, DOM/HTML snapshot reference). Implement capture status enum (`captured | skipped | failed`). Make evidence capture conditional on capability declaration in config. When capability is not declared, status is `skipped` (not `failed`).
- **Where**: Evidence schema types and prototyping evidence handler
- **Estimated LOC**: 100-140
- **Key constraints**: Evidence schema must have extension points for future versioning (OQ-0001 deferred to v1.7.6). Capture status must always be present in output regardless of capability declaration (DEC-0002).
- **Affected files**:
  - `packages/qfai/src/core/evidence/schema.ts` -- new `RenderEvidence` type with screenshot, viewport, domSnapshot fields
  - `packages/qfai/src/core/evidence/captureStatus.ts` -- new file for `CaptureStatus` enum and helpers
  - `packages/qfai/src/core/prototyping/evidenceHandler.ts` -- conditional capture logic based on capability config

#### Slice 3: Backend Provider Abstraction

- **What**: Create provider registry interface with optional registration. Implement fail-open semantics: when no browser provider is registered, operations that require a browser resolve to `skipped` status rather than throwing. Ensure no universal browser dependency -- Playwright or other backends are never imported unconditionally.
- **Where**: New backend registry module, capability declaration config
- **Estimated LOC**: 120-160
- **Key constraints**: Provider interface must be minimal (DEC-0003). Registration is optional; absence is a valid state. No dynamic `require()` or conditional `import()` of browser packages at module load time. Provider registry must be synchronous for registration, async for execution.
- **Affected files**:
  - `packages/qfai/src/core/providers/registry.ts` -- new file: `ProviderRegistry` class with `register()`, `get()`, `has()` methods
  - `packages/qfai/src/core/providers/types.ts` -- new file: `BrowserProvider` interface, `ProviderCapability` enum
  - `packages/qfai/src/core/providers/index.ts` -- new file: barrel export
  - `packages/qfai/src/core/config.ts` -- add optional `providers` sub-config to `QfaiConfig`

#### Slice 4: Browser QA Structured Outputs

- **What**: Implement browser QA phase decomposition into 4 sub-phases: smoke, interaction, visual, accessibility. Define structured finding schema with severity, location, repair suggestion, and sub-phase tag (DEC-0004). Wire findings into report output. Implement expectation split: standard (smoke only), low-cost (smoke + interaction), full-harness (all 4 sub-phases) per DEC-0005.
- **Where**: Browser QA module, report formatter
- **Estimated LOC**: 150-200
- **Key constraints**: Output shape is minimal viable; full normalization deferred to v1.7.6 (OQ-0002). Each sub-phase must be independently skippable. Findings must include repair suggestions as structured data, not prose.
- **Affected files**:
  - `packages/qfai/src/core/browserQa/types.ts` -- new file: `BrowserQaFinding`, `BrowserQaPhase`, `ExpectationTier` types
  - `packages/qfai/src/core/browserQa/runner.ts` -- new file: orchestrator that dispatches to sub-phase runners via provider
  - `packages/qfai/src/core/browserQa/phases/smoke.ts` -- new file: smoke check implementation
  - `packages/qfai/src/core/browserQa/phases/interaction.ts` -- new file: interaction check implementation
  - `packages/qfai/src/core/browserQa/phases/visual.ts` -- new file: visual check implementation
  - `packages/qfai/src/core/browserQa/phases/accessibility.ts` -- new file: accessibility check implementation
  - `packages/qfai/src/core/browserQa/index.ts` -- new file: barrel export
  - `packages/qfai/src/core/report/formatter.ts` -- modify to include browser QA findings section

## File Impact Analysis

### New files

| File                                                             | Purpose                                    |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `packages/qfai/src/core/evidence/captureStatus.ts`               | CaptureStatus enum and helpers             |
| `packages/qfai/src/core/providers/registry.ts`                   | Provider registry with fail-open semantics |
| `packages/qfai/src/core/providers/types.ts`                      | BrowserProvider interface, capability enum |
| `packages/qfai/src/core/providers/index.ts`                      | Barrel export for providers                |
| `packages/qfai/src/core/browserQa/types.ts`                      | Finding, phase, expectation tier types     |
| `packages/qfai/src/core/browserQa/runner.ts`                     | Browser QA orchestrator                    |
| `packages/qfai/src/core/browserQa/phases/smoke.ts`               | Smoke check sub-phase                      |
| `packages/qfai/src/core/browserQa/phases/interaction.ts`         | Interaction check sub-phase                |
| `packages/qfai/src/core/browserQa/phases/visual.ts`              | Visual check sub-phase                     |
| `packages/qfai/src/core/browserQa/phases/accessibility.ts`       | Accessibility check sub-phase              |
| `packages/qfai/src/core/browserQa/index.ts`                      | Barrel export for browser QA               |
| `packages/qfai/tests/core/modeResolver.test.ts`                  | Static-first mode resolver unit tests      |
| `packages/qfai/tests/core/obligationEvaluator.test.ts`           | Obligation filtering unit tests            |
| `packages/qfai/tests/core/captureStatus.test.ts`                 | Evidence capture status unit tests         |
| `packages/qfai/tests/core/providerRegistry.test.ts`              | Provider registry + fail-open unit tests   |
| `packages/qfai/tests/core/browserQaRunner.test.ts`               | Browser QA orchestrator unit tests         |
| `packages/qfai/tests/core/browserQaPhases.test.ts`               | Sub-phase runner unit tests                |
| `packages/qfai/tests/integration/prototypingStaticFirst.test.ts` | Integration: static-first prototyping flow |
| `packages/qfai/tests/integration/providerFailOpen.test.ts`       | Integration: fail-open provider path       |
| `packages/qfai/tests/e2e/staticFirstPath.test.ts`                | E2E: complete static-first prototyping     |
| `packages/qfai/tests/e2e/optionalCapabilityPath.test.ts`         | E2E: optional render evidence path         |

### Modified files

| File                                                        | Change                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `packages/qfai/src/core/prototyping/modeResolver.ts`        | Separate static vs. runtime obligation sets               |
| `packages/qfai/src/core/prototyping/obligationEvaluator.ts` | Filter obligations by active mode                         |
| `packages/qfai/src/core/prototyping/commandHandler.ts`      | Pass mode context through evaluation pipeline             |
| `packages/qfai/src/core/evidence/schema.ts`                 | Add RenderEvidence type with extension points             |
| `packages/qfai/src/core/prototyping/evidenceHandler.ts`     | Conditional capture logic based on capability config      |
| `packages/qfai/src/core/config.ts`                          | Add `providers` and `browserQa` sub-configs to QfaiConfig |
| `packages/qfai/src/core/report/formatter.ts`                | Include browser QA findings section in report             |
| `CHANGELOG.md`                                              | v1.7.5 entry                                              |

## Test Strategy

### Test layers

| Layer       | Scope                                                                                               | Location                                    | Count (est.) |
| ----------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------ |
| Unit        | Mode resolver, obligation evaluator, capture status, provider registry, browser QA types and phases | `packages/qfai/tests/core/*.test.ts`        | ~35          |
| Integration | Static-first prototyping flow, provider fail-open path                                              | `packages/qfai/tests/integration/*.test.ts` | ~10          |
| E2E         | Complete static-first path, optional capability paths                                               | `packages/qfai/tests/e2e/*.test.ts`         | ~6           |
| Regression  | Non-web project zero-noise, existing prototyping paths                                              | `packages/qfai/tests/core/*.test.ts`        | ~4           |

### Fixture plan

Each slice requires pass/fail fixtures. Fixtures use temp directories (mkdtemp) following existing patterns.

| Slice | Pass fixture                                                    | Fail fixture                                                | TC-Refs                    |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| 1     | Prototyping default mode with static obligations only -> DONE   | Runtime obligation in default mode -> should not block DONE | TC-0028-0001..TC-0028-0006 |
| 2     | Capability declared, evidence captured -> status: captured      | Capability declared, capture fails -> status: failed        | TC-0028-0007..TC-0028-0012 |
| 2     | No capability declared -> status: skipped (not failed)          | N/A (pass-only; absence is valid)                           | TC-0028-0013, TC-0028-0014 |
| 3     | Provider registered, operation succeeds                         | No provider registered -> status: skipped (fail-open)       | TC-0028-0015..TC-0028-0020 |
| 4     | Standard tier: smoke only, findings with repair suggestions     | Full-harness tier: all 4 sub-phases                         | TC-0028-0021..TC-0028-0028 |
| All   | Non-web project: zero runtime findings, zero browser dependency | N/A (pass-only)                                             | TC-0028-0029..TC-0028-0031 |

### Annotations

- **E2E tests**: `QFAI:SPEC-0028:US-YYYY` (e.g., `QFAI:SPEC-0028:US-0028-0001`)
- **Integration tests**: `QFAI:SPEC-0028:TC-YYYY` (e.g., `QFAI:SPEC-0028:TC-0028-0007`)
- Each test must reference at least one TC-ID from the test cases
- Verify-pack tests annotated with both US-ref (for traceability) and TC-ref (for coverage)

## Migration / Backward Compatibility

### Config additions

Add optional sub-configs to `QfaiConfig`:

```typescript
export type QfaiProviderConfig = {
  browser?: string; // provider name, e.g., "playwright"; undefined = no provider
};

export type QfaiBrowserQaConfig = {
  tier?: "standard" | "low-cost" | "full-harness"; // default: "standard"
  enabled?: boolean; // default: false
};

export type QfaiConfig = {
  // ... existing fields ...
  providers?: QfaiProviderConfig;
  browserQa?: QfaiBrowserQaConfig;
};
```

### Backward compatibility guarantees

1. All new config keys are optional with safe defaults; existing `qfai.config.yaml` files remain valid without changes.
2. Default prototyping path reverts to static-first; projects that previously passed under static obligations continue to pass unchanged.
3. Non-web projects produce zero runtime/browser findings -- no behavioral change for existing users.
4. Evidence capture defaults to `skipped` when no capability is declared; existing evidence output is not affected.
5. No existing validator output or test suite is affected.
6. Browser provider is never imported unconditionally; projects without browser dependencies see no new import errors.

## Risk Mitigation

### Scope creep: evidence schema versioning (OQ-0001)

- Evidence schema includes a `schemaVersion` field set to `"1.0.0"` but versioning logic (migration, compatibility checks) is deferred to v1.7.6.
- Mitigation: minimal viable schema with designated extension points; no version negotiation in v1.7.5.

### Browser QA output shape not final (OQ-0002)

- Browser QA finding schema is intentionally minimal: severity, location, message, repairSuggestion, phase.
- Full normalization (cross-provider output alignment) deferred to v1.7.6.
- Mitigation: output shape is typed but marked with `@experimental` JSDoc tag to signal instability.

### Provider ecosystem immaturity

- Only the provider interface and registry are delivered in v1.7.5; no concrete provider implementation is bundled.
- Mitigation: fail-open design ensures the absence of providers is a valid, tested state.

### Static/runtime boundary regression

- Unit test asserts zero browser/network/rendering imports in default prototyping path source files.
- Mode resolver tests verify that runtime obligations are excluded from default mode.

## Dependencies

### Internal module dependencies

| Module                               | Used by     | Purpose                                |
| ------------------------------------ | ----------- | -------------------------------------- |
| `config.ts` (QfaiConfig)             | All slices  | Config access, provider/browserQa keys |
| `evidence/schema.ts`                 | Slices 2, 4 | Evidence type contract                 |
| `prototyping/modeResolver.ts`        | Slice 1     | Static vs. runtime obligation split    |
| `prototyping/obligationEvaluator.ts` | Slice 1     | Obligation filtering                   |
| `providers/registry.ts`              | Slices 3, 4 | Provider lookup and fail-open          |

### External dependencies

None. All implementation uses existing runtime dependencies only (Node.js built-ins). Browser backends are optional peer dependencies, never hard imports.

## Rollback Plan

### Feature-level disable

1. **Config toggle**: `browserQa.enabled: false` (default) disables all browser QA functionality. Removing `providers` config disables provider registration.
2. **Mode revert**: If static-first default causes issues, the mode resolver change is isolated and can be toggled via config without affecting other slices.

### Code-level revert

1. **Git revert**: New code is primarily in new files (`providers/`, `browserQa/`, `captureStatus.ts`). Reverting the commit removes all new functionality.
2. **Minimal touchpoints**: Modifications to existing files are additive (new optional type fields, new conditional branches). Revert is clean.
3. **No schema migration**: No database or persistent state changes. Rollback requires no data migration.
