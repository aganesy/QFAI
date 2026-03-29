# 10 Plan

## Implementation Strategy

### Phase 1: Core Interface (Priority: P1)

1. Define `CritiqueProvider` interface in `packages/qfai/src/core/critique/types.ts`
   - `CritiqueInput`: output text, context, iteration number
   - `CritiqueResponse`: scores, dimensions, suggestions, metadata
   - `CritiqueAdapter`: orchestrator that wraps providers with fail-open
1. Implement `CritiqueAdapter` in `packages/qfai/src/core/critique/adapter.ts`
   - Provider registration and lookup
   - Response schema validation
   - Fail-open wrapper with logging
   - Configurable timeout (default 30s)

### Phase 2: Generic Command Provider (Priority: P1)

1. Implement `GenericCommandProvider` in `packages/qfai/src/core/critique/providers/command.ts`
   - Command template with argument substitution
   - Argument sanitization against injection (shell metacharacter escaping)
   - Process execution with timeout
   - stdout parsing to CritiqueResponse

### Phase 3: Example Providers (Priority: P2)

1. Implement `EchoProvider` in `packages/qfai/src/core/critique/providers/echo.ts`
   - Returns predefined critique for testing/demo
1. Implement `FileProvider` in `packages/qfai/src/core/critique/providers/file.ts`
   - Reads critique from a JSON file (useful for offline/CI scenarios)

### Phase 4: Configuration (Priority: P2)

1. Add critique provider configuration to `qfai.config.yaml` schema
   - `critique.providers[]`: name, type, command/path, timeout
   - `critique.defaultProvider`: provider name
   - `critique.failOpen`: boolean (default true)

## Test Strategy

### Integration Tests (L3)

- `tests/integration/critique/adapter.test.ts` → TC-0029-0001, TC-0029-0002, TC-0029-0004, TC-0029-0008
- `tests/integration/critique/command-provider.test.ts` → TC-0029-0003
- `tests/integration/critique/timeout.test.ts` → TC-0029-0005
- `tests/integration/critique/examples.test.ts` → TC-0029-0006
- `tests/integration/critique/state-transition.test.ts` → TC-0029-0007

### E2E Tests (L5)

- `tests/e2e/critique-adapter.test.ts` → US-0029-0001, US-0029-0002, US-0029-0004

### Test Annotations

- Integration: `QFAI:SPEC-0029:TC-XXXX`
- E2E: `QFAI:SPEC-0029:US-XXXX`

## Dependencies

- None (leaf module, consumed by spec-0031)

## Risk Mitigation

- Command injection: comprehensive sanitization tests before merge
- Provider timeout: AbortController pattern with explicit cleanup

## v1.7.6 Remediation: 3-Layer Evaluation Architecture (Phase 5)

### Scope

- DR-0080 / REQ-0004 (global): Converge evaluation architecture to 3-layer model.
- US-0029-0005 / AC-0029-0009..AC-0029-0013 / BR-0029-0009..BR-0029-0014 / TC-0029-0009..TC-0029-0014

### Phase 5: 3-Layer Model Convergence (Priority: P1)

1. Update `CritiqueResponse` in `packages/qfai/src/core/critique/types.ts`
   - Replace legacy 4-axis score keys with 3-layer keys: `invariant`, `trendDerived`, `productSpecific`
   - Add layer boundary assignment rule (declared, deterministic; lower-layer wins on exact match)
   - Add validation: reject any calibration pack dimension not in the 3-layer set

2. Update `CritiqueAdapter` in `packages/qfai/src/core/critique/adapter.ts`
   - Enforce 3-layer scoring model in response validation (BR-0029-0009, BR-0029-0010)
   - Add migration helper to re-map legacy 4-axis scores to 3-layer (BR-0029-0012)
   - Ensure evaluation is deterministic (BR-0029-0013)

3. Update tests
   - `tests/integration/critique/adapter.test.ts` covers TC-0029-0009..TC-0029-0014
   - Verify legacy axis keys are absent from response; verify migration output preserves values

### File Impact (v1.7.6 Remediation)

| File                                                              | Purpose                                           | Status    |
| ----------------------------------------------------------------- | ------------------------------------------------- | --------- |
| `packages/qfai/src/core/critique/types.ts`                       | Update CritiqueResponse to 3-layer layer keys     | remediate |
| `packages/qfai/src/core/critique/adapter.ts`                     | Enforce 3-layer validation; add migration helper  | remediate |
| `tests/integration/critique/adapter.test.ts`                     | Expand to cover TC-0029-0009..TC-0029-0014        | remediate |

